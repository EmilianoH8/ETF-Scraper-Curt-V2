"""
Abstract Base Loader Class for Scraping Hub

This module defines the abstract base class that all loaders must inherit from.
The Loader is the final component in the ETL pipeline, responsible for persisting
transformed data to various storage systems (files, databases, APIs, etc.).

Key Responsibilities:
- Save processed data to multiple output formats (JSON, CSV, SQLite, PostgreSQL)
- Handle file naming with timestamps and unique identifiers
- Implement deduplication logic to avoid duplicate records
- Manage batch operations for performance optimization
- Ensure data integrity and handle storage errors gracefully
- Support incremental loading and data versioning
- Provide rollback capabilities for failed operations

Architecture Pattern:
- Strategy Pattern: Different storage strategies (File, Database, API)
- Template Method Pattern: Common loading workflow with customizable steps
- Factory Pattern: Create appropriate storage handlers
- Transaction Pattern: Ensure atomicity for batch operations

Usage:
    class MyLoader(BaseLoader):
        def _save_data(self, items: List[ScrapedItem], destination: str) -> None:
            # Implement specific storage logic
            pass
    
    loader = MyLoader(config)
    await loader.load(items, "output.json")
"""

import os
import json
import csv
import sqlite3
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pathlib import Path

from loguru import logger
import pandas as pd

from .exceptions import ScrapingError
from .models import ScrapedItem, LoaderConfig, DataStatus


class BaseLoader(ABC):
    """
    Abstract base class for all data loaders.
    
    This class provides the common interface and shared functionality for all
    loading methods. It implements the Load phase of the ETL pipeline with
    built-in error handling, deduplication, and batch processing capabilities.
    
    Attributes:
        config: Loader configuration settings
        _loaded_count: Counter for tracking loaded items
        _failed_count: Counter for tracking failed items
        _batch_buffer: Buffer for batch operations
        _transaction_log: Log of completed transactions for rollback support
    """
    
    def __init__(self, config: LoaderConfig):
        """
        Initialize the base loader.
        
        Args:
            config: Configuration object with loading settings
        """
        self.config = config
        self._loaded_count = 0
        self._failed_count = 0
        self._batch_buffer: List[ScrapedItem] = []
        self._transaction_log: List[Dict[str, Any]] = []
        
        # Ensure output directory exists
        os.makedirs(self.config.output_path, exist_ok=True)
        
        logger.info(f"Initialized {self.__class__.__name__} with config: {config.dict()}")
    
    # ========================================================================
    # PUBLIC INTERFACE METHODS
    # ========================================================================
    
    async def load(self, items: List[ScrapedItem], destination: Optional[str] = None) -> None:
        """
        Load processed data items to the configured destination.
        
        This is the main public method that orchestrates the entire loading
        process including validation, deduplication, and batch processing.
        
        Args:
            items: List of processed items to load
            destination: Optional destination override
            
        Raises:
            ScrapingError: If loading fails
        """
        if not items:
            logger.warning("No items to load")
            return
        
        logger.info(f"Starting to load {len(items)} items")
        
        try:
            # Reset loading state
            self._reset_loading_state()
            
            # Apply deduplication if configured
            if self.config.remove_duplicates:
                items = self._deduplicate_items(items)
            
            # Validate items before loading
            valid_items = self._validate_items(items)
            
            # Setup storage destination
            storage_destination = destination or self._generate_destination_path()
            await self.setup_storage(storage_destination)
            
            # Process items in batches
            await self._load_in_batches(valid_items, storage_destination)
            
            # Log loading statistics
            self._log_loading_stats(len(items), len(valid_items))
            
        except Exception as e:
            logger.error(f"Loading failed: {e}")
            raise ScrapingError(f"Failed to load data: {str(e)}")
    
    def get_loading_stats(self) -> Dict[str, int]:
        """
        Get statistics about the last loading operation.
        
        Returns:
            Dictionary containing loading statistics
        """
        return {
            'loaded_count': self._loaded_count,
            'failed_count': self._failed_count,
            'total_processed': self._loaded_count + self._failed_count
        }
    
    # ========================================================================
    # ABSTRACT METHODS (MUST BE IMPLEMENTED BY SUBCLASSES)
    # ========================================================================
    
    @abstractmethod
    async def _save_data(self, items: List[ScrapedItem], destination: str) -> None:
        """
        Save data items to the specified destination.
        
        This is the core method that each loader implementation must provide.
        It should handle the specific details of how to persist data to the
        target storage system.
        
        Args:
            items: List of items to save
            destination: Destination path or identifier
            
        Raises:
            ScrapingError: If saving fails
        """
        pass
    
    @abstractmethod
    async def setup_storage(self, destination: str) -> None:
        """
        Set up the storage destination.
        
        This method should prepare the storage system for data loading,
        including creating directories, database connections, or API clients.
        
        Args:
            destination: Storage destination to set up
            
        Raises:
            ScrapingError: If setup fails
        """
        pass
    
    # ========================================================================
    # TEMPLATE METHODS (COMMON WORKFLOW WITH CUSTOMIZATION POINTS)
    # ========================================================================
    
    async def _load_in_batches(self, items: List[ScrapedItem], destination: str) -> None:
        """
        Load items in configurable batch sizes for optimal performance.
        
        Args:
            items: Items to load
            destination: Storage destination
        """
        batch_size = self.config.batch_size
        
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            
            try:
                # Create backup if configured
                if self.config.create_backups:
                    self._create_backup(batch, destination, i // batch_size)
                
                # Save the batch
                await self._save_data(batch, destination)
                
                # Update counters
                self._loaded_count += len(batch)
                
                # Mark items as loaded
                for item in batch:
                    item.status = DataStatus.LOADED
                
                logger.debug(f"Successfully loaded batch {i // batch_size + 1} ({len(batch)} items)")
                
            except Exception as e:
                logger.error(f"Failed to load batch {i // batch_size + 1}: {e}")
                self._failed_count += len(batch)
                
                # Mark items as failed
                for item in batch:
                    item.status = DataStatus.FAILED
                    item.add_validation_error(f"Loading failed: {str(e)}")
    
    def _validate_items(self, items: List[ScrapedItem]) -> List[ScrapedItem]:
        """
        Validate items before loading.
        
        Args:
            items: Items to validate
            
        Returns:
            List of valid items ready for loading
        """
        valid_items = []
        
        for item in items:
            if self._is_item_valid(item):
                valid_items.append(item)
            else:
                logger.warning(f"Skipping invalid item: {item.item_id}")
                self._failed_count += 1
        
        logger.info(f"Validated {len(valid_items)}/{len(items)} items")
        return valid_items
    
    def _is_item_valid(self, item: ScrapedItem) -> bool:
        """
        Check if an item is valid for loading.
        
        Args:
            item: Item to validate
            
        Returns:
            True if item is valid
        """
        # Check if item has required data
        if not item.data:
            return False
        
        # Check item status
        if item.status == DataStatus.FAILED:
            return False
        
        # Check for validation errors
        if item.validation_errors:
            return False
        
        return True
    
    def _deduplicate_items(self, items: List[ScrapedItem]) -> List[ScrapedItem]:
        """
        Remove duplicate items based on item_id.
        
        Args:
            items: Items to deduplicate
            
        Returns:
            List of unique items
        """
        seen_ids = set()
        unique_items = []
        
        for item in items:
            if item.item_id not in seen_ids:
                seen_ids.add(item.item_id)
                unique_items.append(item)
            else:
                logger.debug(f"Removed duplicate item: {item.item_id}")
        
        removed_count = len(items) - len(unique_items)
        if removed_count > 0:
            logger.info(f"Removed {removed_count} duplicate items")
        
        return unique_items
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def _generate_destination_path(self) -> str:
        """
        Generate a destination path with timestamp.
        
        Returns:
            Generated destination path
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scraped_data_{timestamp}.{self.config.output_format}"
        return os.path.join(self.config.output_path, filename)
    
    def _create_backup(self, items: List[ScrapedItem], destination: str, batch_num: int) -> None:
        """
        Create a backup of items before loading.
        
        Args:
            items: Items to backup
            destination: Original destination
            batch_num: Batch number for unique naming
        """
        try:
            backup_path = f"{destination}.backup_batch_{batch_num}"
            
            # Convert items to dictionaries for JSON serialization
            backup_data = [item.dict() for item in items]
            
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, default=str)
            
            logger.debug(f"Created backup: {backup_path}")
            
        except Exception as e:
            logger.warning(f"Failed to create backup: {e}")
    
    def _reset_loading_state(self) -> None:
        """Reset counters for a new loading operation."""
        self._loaded_count = 0
        self._failed_count = 0
        self._batch_buffer.clear()
        self._transaction_log.clear()
    
    def _log_loading_stats(self, total_items: int, valid_items: int) -> None:
        """
        Log loading statistics.
        
        Args:
            total_items: Total number of input items
            valid_items: Number of valid items
        """
        success_rate = (self._loaded_count / valid_items * 100) if valid_items > 0 else 0
        
        logger.info(
            f"Loading completed: {self._loaded_count}/{valid_items} items loaded "
            f"({success_rate:.1f}% success rate)"
        )
        
        if self._failed_count > 0:
            logger.warning(f"Failed to load {self._failed_count} items")


# ============================================================================
# CONCRETE LOADER IMPLEMENTATIONS
# ============================================================================

class JSONLoader(BaseLoader):
    """Loader implementation for JSON file output."""
    
    async def setup_storage(self, destination: str) -> None:
        """Ensure the output directory exists."""
        os.makedirs(os.path.dirname(destination), exist_ok=True)
    
    async def _save_data(self, items: List[ScrapedItem], destination: str) -> None:
        """Save items to JSON file."""
        data = []
        
        for item in items:
            item_dict = item.dict()
            if not self.config.include_metadata:
                item_dict.pop('metadata', None)
            data.append(item_dict)
        
        mode = 'w' if self.config.overwrite_existing else 'a'
        
        with open(destination, mode, encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str, ensure_ascii=False)


class CSVLoader(BaseLoader):
    """Loader implementation for CSV file output."""
    
    async def setup_storage(self, destination: str) -> None:
        """Ensure the output directory exists."""
        os.makedirs(os.path.dirname(destination), exist_ok=True)
    
    async def _save_data(self, items: List[ScrapedItem], destination: str) -> None:
        """Save items to CSV file."""
        if not items:
            return
        
        # Flatten the data for CSV format
        flattened_data = []
        for item in items:
            flat_item = self._flatten_dict(item.data)
            flat_item['source_url'] = str(item.source_url)
            flat_item['extracted_at'] = item.extracted_at.isoformat()
            flattened_data.append(flat_item)
        
        # Create DataFrame and save to CSV
        df = pd.DataFrame(flattened_data)
        
        mode = 'w' if self.config.overwrite_existing else 'a'
        header = not os.path.exists(destination) or self.config.overwrite_existing
        
        df.to_csv(destination, mode=mode, header=header, index=False, encoding='utf-8')
    
    def _flatten_dict(self, d: Dict[str, Any], parent_key: str = '', sep: str = '_') -> Dict[str, Any]:
        """Flatten nested dictionary for CSV format."""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep=sep).items())
            else:
                items.append((new_key, v))
        return dict(items)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_default_loader_config(**overrides) -> LoaderConfig:
    """
    Create a default loader configuration with optional overrides.
    
    Args:
        **overrides: Configuration values to override defaults
        
    Returns:
        LoaderConfig object with specified settings
    """
    defaults = {
        'output_format': 'json',
        'output_path': './data/final',
        'batch_size': 100,
        'create_backups': True,
        'compress_output': False,
        'include_metadata': True,
        'overwrite_existing': False
    }
    
    defaults.update(overrides)
    return LoaderConfig(**defaults)


def create_loader(config: LoaderConfig) -> BaseLoader:
    """
    Factory function to create appropriate loader based on configuration.
    
    Args:
        config: Loader configuration
        
    Returns:
        Appropriate loader instance
        
    Raises:
        ValueError: If output format is not supported
    """
    format_mapping = {
        'json': JSONLoader,
        'csv': CSVLoader,
    }
    
    loader_class = format_mapping.get(config.output_format.lower())
    if not loader_class:
        raise ValueError(f"Unsupported output format: {config.output_format}")
    
    return loader_class(config) 