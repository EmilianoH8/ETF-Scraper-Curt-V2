"""
Abstract Base Transformer Class for Scraping Hub

This module defines the abstract base class that all transformers must inherit from.
The Transformer is the middle component in the ETL pipeline, responsible for converting
raw scraped data into clean, validated, structured formats ready for loading.

Key Responsibilities:
- Parse raw HTML/JSON/XML content using appropriate parsers
- Extract structured data using CSS selectors or XPath expressions
- Validate data against Pydantic models and business rules
- Clean and normalize text data (remove HTML tags, fix encoding, etc.)
- Handle missing or malformed data gracefully
- Apply data transformations and enrichments
- Generate consistent output formats

Architecture Pattern:
- Chain of Responsibility: Multiple transformation steps can be chained
- Strategy Pattern: Different parsing strategies (HTML, JSON, XML)
- Template Method Pattern: Common transformation workflow with customizable steps
- Validator Pattern: Multiple validation rules applied in sequence

Usage:
    class MyTransformer(BaseTransformer):
        def _parse_content(self, response: ScrapingResponse) -> List[Dict[str, Any]]:
            # Implement specific parsing logic
            pass
        
        def _get_item_model(self) -> Type[BaseModel]:
            # Return the Pydantic model for validation
            pass
    
    transformer = MyTransformer(config)
    items = await transformer.transform(response)
"""

import re
import html
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union, Type, Generator
from datetime import datetime
from decimal import Decimal, InvalidOperation

from loguru import logger
from pydantic import BaseModel, ValidationError
from selectolax.parser import HTMLParser

from .exceptions import (
    ScrapingError,
    ParsingError,
    InvalidHTML,
    MissingSelector,
    DataValidationError
)
from .models import (
    ScrapingResponse,
    ScrapedItem,
    TransformerConfig,
    DataStatus
)


class BaseTransformer(ABC):
    """
    Abstract base class for all data transformers.
    
    This class provides the common interface and shared functionality for all
    transformation methods. It implements the Transform phase of the ETL pipeline
    with built-in data validation, cleaning, and error handling capabilities.
    
    Attributes:
        config: Transformer configuration settings
        _validation_errors: List of validation errors encountered during transformation
        _processed_count: Counter for tracking processed items
        _success_count: Counter for tracking successfully transformed items
        _parser_cache: Cache for parsed HTML documents to improve performance
    """
    
    def __init__(self, config: TransformerConfig):
        """
        Initialize the base transformer.
        
        Args:
            config: Configuration object with transformation settings
        """
        self.config = config
        self._validation_errors: List[str] = []
        self._processed_count = 0
        self._success_count = 0
        self._parser_cache: Dict[str, HTMLParser] = {}
        
        logger.info(f"Initialized {self.__class__.__name__} with config: {config.dict()}")
    
    # ========================================================================
    # PUBLIC INTERFACE METHODS
    # ========================================================================
    
    async def transform(self, response: ScrapingResponse) -> List[ScrapedItem]:
        """
        Transform raw scraped data into structured, validated items.
        
        This is the main public method that orchestrates the entire transformation
        process including parsing, validation, cleaning, and error handling.
        
        Args:
            response: Raw scraped response to transform
            
        Returns:
            List of validated ScrapedItem objects
            
        Raises:
            ParsingError: If the content cannot be parsed
            DataValidationError: If validation fails and no fallback is available
        """
        logger.info(f"Starting transformation of response from {response.url}")
        
        try:
            # Reset transformation state
            self._reset_transformation_state()
            
            # Parse the raw content
            raw_items = await self._parse_content(response)
            
            # Process each item through the transformation pipeline
            transformed_items = []
            for raw_item in raw_items:
                try:
                    transformed_item = await self._transform_single_item(
                        raw_item, response
                    )
                    if transformed_item:
                        transformed_items.append(transformed_item)
                        self._success_count += 1
                    
                    self._processed_count += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to transform item: {e}")
                    self._validation_errors.append(str(e))
            
            # Apply post-processing if configured
            if self.config.remove_duplicates:
                transformed_items = self._remove_duplicates(transformed_items)
            
            # Log transformation statistics
            self._log_transformation_stats(len(raw_items), len(transformed_items))
            
            return transformed_items
            
        except Exception as e:
            logger.error(f"Transformation failed for {response.url}: {e}")
            raise ParsingError(f"Failed to transform response: {str(e)}")
    
    async def transform_batch(
        self, 
        responses: List[ScrapingResponse]
    ) -> List[ScrapedItem]:
        """
        Transform multiple responses concurrently.
        
        This method processes multiple scraped responses and returns a flattened
        list of all successfully transformed items.
        
        Args:
            responses: List of scraped responses to transform
            
        Returns:
            Flattened list of all transformed items
        """
        logger.info(f"Starting batch transformation of {len(responses)} responses")
        
        all_items = []
        total_errors = 0
        
        for response in responses:
            try:
                items = await self.transform(response)
                all_items.extend(items)
                
            except Exception as e:
                logger.error(f"Failed to transform response from {response.url}: {e}")
                total_errors += 1
        
        logger.info(
            f"Batch transformation completed: {len(all_items)} items from "
            f"{len(responses) - total_errors}/{len(responses)} successful responses"
        )
        
        return all_items
    
    def get_validation_errors(self) -> List[str]:
        """
        Get all validation errors encountered during the last transformation.
        
        Returns:
            List of validation error messages
        """
        return self._validation_errors.copy()
    
    def get_transformation_stats(self) -> Dict[str, Union[int, float]]:
        """
        Get statistics about the last transformation operation.
        
        Returns:
            Dictionary containing transformation statistics
        """
        success_rate = (
            (self._success_count / self._processed_count * 100)
            if self._processed_count > 0 else 0.0
        )
        
        return {
            'processed_count': self._processed_count,
            'success_count': self._success_count,
            'error_count': len(self._validation_errors),
            'success_rate': success_rate
        }
    
    # ========================================================================
    # ABSTRACT METHODS (MUST BE IMPLEMENTED BY SUBCLASSES)
    # ========================================================================
    
    @abstractmethod
    async def _parse_content(self, response: ScrapingResponse) -> List[Dict[str, Any]]:
        """
        Parse raw response content and extract structured data.
        
        This is the core method that each transformer implementation must provide.
        It should parse the response content (HTML, JSON, XML, etc.) and return
        a list of dictionaries containing the extracted data.
        
        Args:
            response: The scraped response to parse
            
        Returns:
            List of dictionaries containing extracted data
            
        Raises:
            ParsingError: If content cannot be parsed
        """
        pass
    
    @abstractmethod
    def _get_item_model(self) -> Type[BaseModel]:
        """
        Get the Pydantic model class used for validating transformed items.
        
        This method should return the specific Pydantic model that defines
        the expected structure and validation rules for the transformed data.
        
        Returns:
            Pydantic model class for data validation
        """
        pass
    
    # ========================================================================
    # TEMPLATE METHODS (COMMON WORKFLOW WITH CUSTOMIZATION POINTS)
    # ========================================================================
    
    async def _transform_single_item(
        self, 
        raw_item: Dict[str, Any], 
        response: ScrapingResponse
    ) -> Optional[ScrapedItem]:
        """
        Transform a single raw item through the complete pipeline.
        
        This method applies the full transformation pipeline to a single item:
        cleaning, validation, and packaging into a ScrapedItem object.
        
        Args:
            raw_item: Raw extracted data dictionary
            response: Original response object for context
            
        Returns:
            Validated ScrapedItem or None if transformation fails
        """
        try:
            # Apply data cleaning
            cleaned_item = self._clean_item_data(raw_item)
            
            # Validate against schema if configured
            if self.config.validate_data:
                validated_data = self._validate_item_data(cleaned_item)
                if validated_data is None:
                    return None
            else:
                validated_data = cleaned_item
            
            # Create ScrapedItem object
            scraped_item = ScrapedItem(
                source_url=response.url,
                data=validated_data,
                item_id=self._generate_item_id(validated_data),
                status=DataStatus.TRANSFORMED,
                extracted_at=response.timestamp,
                transformed_at=datetime.utcnow(),
                metadata={
                    'extractor_method': response.method.value,
                    'response_time': response.response_time,
                    'transformer': self.__class__.__name__
                }
            )
            
            return scraped_item
            
        except Exception as e:
            logger.warning(f"Failed to transform item: {e}")
            return None
    
    def _clean_item_data(self, raw_item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean and normalize raw item data.
        
        This method applies various cleaning operations based on configuration:
        - HTML tag removal and text normalization
        - Whitespace cleanup and text normalization
        - Data type conversions
        - Field length limits
        
        Args:
            raw_item: Raw data dictionary
            
        Returns:
            Cleaned data dictionary
        """
        cleaned_item = {}
        
        for key, value in raw_item.items():
            try:
                # Apply cleaning based on data type and configuration
                cleaned_value = self._clean_field_value(key, value)
                
                # Apply field length limits
                if (isinstance(cleaned_value, str) and 
                    len(cleaned_value) > self.config.max_field_length):
                    cleaned_value = cleaned_value[:self.config.max_field_length].strip()
                    logger.debug(f"Truncated field {key} to {self.config.max_field_length} characters")
                
                cleaned_item[key] = cleaned_value
                
            except Exception as e:
                logger.warning(f"Error cleaning field {key}: {e}")
                # Keep original value if cleaning fails
                cleaned_item[key] = value
        
        return cleaned_item
    
    def _validate_item_data(self, item_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Validate item data against the configured schema.
        
        Args:
            item_data: Data dictionary to validate
            
        Returns:
            Validated data dictionary or None if validation fails
        """
        try:
            # Check required fields
            missing_fields = [
                field for field in self.config.required_fields 
                if field not in item_data or not item_data[field]
            ]
            
            if missing_fields:
                raise ValidationError(f"Missing required fields: {missing_fields}")
            
            # Validate against Pydantic model if available
            model_class = self._get_item_model()
            if model_class:
                try:
                    validated_model = model_class(**item_data)
                    return validated_model.dict()
                except ValidationError as e:
                    raise DataValidationError(
                        f"Pydantic validation failed: {e}",
                        validation_errors=e.errors(),
                        raw_data=item_data
                    )
            
            return item_data
            
        except Exception as e:
            logger.warning(f"Validation failed for item: {e}")
            self._validation_errors.append(str(e))
            return None
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def _clean_field_value(self, field_name: str, value: Any) -> Any:
        """
        Clean a single field value based on its type and configuration.
        
        Args:
            field_name: Name of the field being cleaned
            value: Value to clean
            
        Returns:
            Cleaned value
        """
        if value is None:
            return None
        
        # String cleaning
        if isinstance(value, str):
            # HTML cleaning
            if self.config.clean_html:
                value = self._clean_html_content(value)
            
            # Text normalization
            if self.config.normalize_text:
                value = self._normalize_text(value)
            
            return value.strip()
        
        # Number parsing and formatting
        elif isinstance(value, (int, float)):
            if isinstance(value, float):
                return round(value, self.config.number_precision)
            return value
        
        # List cleaning
        elif isinstance(value, list):
            return [self._clean_field_value(field_name, item) for item in value]
        
        # Dictionary cleaning
        elif isinstance(value, dict):
            return {k: self._clean_field_value(k, v) for k, v in value.items()}
        
        # Default: return as-is
        return value
    
    def _clean_html_content(self, html_content: str) -> str:
        """
        Remove HTML tags and decode HTML entities.
        
        Args:
            html_content: String containing HTML
            
        Returns:
            Clean text without HTML tags
        """
        try:
            # Parse HTML using selectolax for performance
            parser = HTMLParser(html_content)
            text = parser.text()
            
            # Decode HTML entities
            text = html.unescape(text)
            
            return text
            
        except Exception as e:
            logger.warning(f"HTML cleaning failed: {e}")
            # Fallback to simple regex-based cleaning
            clean_text = re.sub(r'<[^>]+>', '', html_content)
            return html.unescape(clean_text)
    
    def _normalize_text(self, text: str) -> str:
        """
        Normalize text by cleaning whitespace and standardizing format.
        
        Args:
            text: Text to normalize
            
        Returns:
            Normalized text
        """
        # Replace multiple whitespace with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Remove zero-width characters
        text = re.sub(r'[\u200b-\u200f\ufeff]', '', text)
        
        return text
    
    def _generate_item_id(self, item_data: Dict[str, Any]) -> str:
        """
        Generate a unique identifier for the item.
        
        Args:
            item_data: The item data to generate ID from
            
        Returns:
            Unique item identifier
        """
        import hashlib
        import json
        
        # Create stable hash from item data
        data_str = json.dumps(item_data, sort_keys=True, default=str)
        hash_obj = hashlib.md5(data_str.encode('utf-8'))
        return hash_obj.hexdigest()
    
    def _remove_duplicates(self, items: List[ScrapedItem]) -> List[ScrapedItem]:
        """
        Remove duplicate items based on their item_id.
        
        Args:
            items: List of items to deduplicate
            
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
                logger.debug(f"Removed duplicate item with ID: {item.item_id}")
        
        logger.info(f"Removed {len(items) - len(unique_items)} duplicate items")
        return unique_items
    
    def _reset_transformation_state(self) -> None:
        """Reset counters and error tracking for a new transformation."""
        self._validation_errors.clear()
        self._processed_count = 0
        self._success_count = 0
    
    def _log_transformation_stats(self, input_count: int, output_count: int) -> None:
        """
        Log transformation statistics.
        
        Args:
            input_count: Number of input items
            output_count: Number of successfully transformed items
        """
        success_rate = (output_count / input_count * 100) if input_count > 0 else 0
        
        logger.info(
            f"Transformation completed: {output_count}/{input_count} items "
            f"({success_rate:.1f}% success rate)"
        )
        
        if self._validation_errors:
            logger.warning(f"Encountered {len(self._validation_errors)} validation errors")


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_default_transformer_config(**overrides) -> TransformerConfig:
    """
    Create a default transformer configuration with optional overrides.
    
    Args:
        **overrides: Configuration values to override defaults
        
    Returns:
        TransformerConfig object with specified settings
    """
    defaults = {
        'validate_data': True,
        'clean_html': True,
        'normalize_text': True,
        'remove_duplicates': True,
        'max_field_length': 1000,
        'required_fields': [],
        'date_format': '%Y-%m-%d',
        'number_precision': 2
    }
    
    defaults.update(overrides)
    return TransformerConfig(**defaults)


def parse_price_string(price_str: str) -> Optional[float]:
    """
    Parse a price string and return a float value.
    
    This utility function handles common price formats like:
    - $29.99
    - €15,50
    - 1,234.56
    - £10.00
    
    Args:
        price_str: String containing price information
        
    Returns:
        Float price value or None if parsing fails
    """
    if not price_str or not isinstance(price_str, str):
        return None
    
    try:
        # Remove currency symbols and whitespace
        clean_price = re.sub(r'[^\d.,\-]', '', price_str.strip())
        
        # Handle different decimal separators
        if ',' in clean_price and '.' in clean_price:
            # Both comma and dot present - assume comma is thousands separator
            clean_price = clean_price.replace(',', '')
        elif ',' in clean_price:
            # Only comma - could be decimal separator (European format)
            if clean_price.count(',') == 1 and len(clean_price.split(',')[1]) <= 2:
                clean_price = clean_price.replace(',', '.')
            else:
                clean_price = clean_price.replace(',', '')
        
        return float(clean_price)
        
    except (ValueError, AttributeError):
        return None


def parse_date_flexible(date_str: str, formats: List[str] = None) -> Optional[datetime]:
    """
    Parse a date string using multiple possible formats.
    
    Args:
        date_str: String containing date information
        formats: List of date formats to try (uses common formats if None)
        
    Returns:
        Datetime object or None if parsing fails
    """
    if not date_str or not isinstance(date_str, str):
        return None
    
    if formats is None:
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%m/%d/%Y',
            '%Y-%m-%d %H:%M:%S',
            '%d-%m-%Y',
            '%B %d, %Y',
            '%b %d, %Y',
            '%Y%m%d'
        ]
    
    date_str = date_str.strip()
    
    for format_str in formats:
        try:
            return datetime.strptime(date_str, format_str)
        except ValueError:
            continue
    
    return None


def validate_transformer_implementation(transformer_class: type) -> bool:
    """
    Validate that a transformer class properly implements the required interface.
    
    Args:
        transformer_class: The transformer class to validate
        
    Returns:
        True if implementation is valid
        
    Raises:
        TypeError: If implementation is invalid
    """
    required_methods = ['_parse_content', '_get_item_model']
    
    for method_name in required_methods:
        if not hasattr(transformer_class, method_name):
            raise TypeError(f"Transformer must implement {method_name} method")
        
        method = getattr(transformer_class, method_name)
        if not callable(method):
            raise TypeError(f"{method_name} must be callable")
    
    if not issubclass(transformer_class, BaseTransformer):
        raise TypeError("Transformer must inherit from BaseTransformer")
    
    return True 