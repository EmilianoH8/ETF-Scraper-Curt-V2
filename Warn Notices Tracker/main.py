#!/usr/bin/env python3
"""
WARN Notices Tracker - Main Entry Point

This script demonstrates how to use the scalable WARN framework
to extract, transform, and load WARN data from different states.

Usage:
    python main.py --state NY --output json
    python main.py --state NY --output all
    python main.py --help
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime
from loguru import logger

# Setup imports for accessing scraping_hub
from setup_imports import *

# Import our framework components
from src.extractors.state_extractor_factory import StateExtractorFactory
from src.extractors.ny_tableau_extractor import NYTableauExtractor
from src.transformers.warn_transformer import WarnTransformer
from src.loaders.warn_loader import WarnLoader
from src.config.states import get_state_config, get_supported_states, is_state_supported


def setup_logging(verbose: bool = False):
    """Setup logging configuration."""
    level = "DEBUG" if verbose else "INFO"
    
    # Configure loguru
    logger.remove()  # Remove default handler
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        level=level,
        colorize=True
    )
    
    # Add file logging
    logger.add(
        f"logs/warn_tracker_{datetime.now().strftime('%Y%m%d')}.log",
        rotation="10 MB",
        retention="30 days",
        level="DEBUG"
    )


def register_extractors():
    """Register all available extractors with the factory."""
    # Register NY extractor
    ny_config = get_state_config("NY")
    if ny_config:
        StateExtractorFactory.register_extractor("NY", NYTableauExtractor, ny_config)
        logger.info("✓ NY extractor registered")
    
    # Additional extractors would be registered here
    # CA_config = get_state_config("CA")
    # if CA_config:
    #     StateExtractorFactory.register_extractor("CA", CAExtractor, CA_config)


def run_warn_scraper(state: str, output_format: str = "all", verbose: bool = False):
    """
    Run the complete WARN scraping pipeline for a specified state.
    
    Args:
        state: Two-letter state code (e.g., 'NY', 'CA')
        output_format: Output format ('json', 'csv', 'sqlite', 'excel', 'all')
        verbose: Enable verbose logging
    """
    setup_logging(verbose)
    logger.info(f"🚀 Starting WARN scraper for {state}")
    
    # Validate state
    if not is_state_supported(state):
        logger.error(f"State '{state}' is not supported")
        logger.info(f"Supported states: {get_supported_states()}")
        return False
    
    try:
        # Step 1: Register extractors
        register_extractors()
        
        # Step 2: Create extractor for the state
        logger.info(f"Creating extractor for {state}...")
        extractor = StateExtractorFactory.create_extractor(state)
        
        if not extractor:
            logger.error(f"Failed to create extractor for {state}")
            return False
        
        # Step 3: Extract data
        logger.info(f"Extracting WARN data from {state}...")
        raw_data = extractor.extract_data()
        
        if not raw_data.get("success", False):
            logger.error(f"Data extraction failed: {raw_data.get('error', 'Unknown error')}")
            return False
        
        logger.info(f"✓ Extracted {raw_data.get('total_notices', 0)} notices")
        
        # Step 4: Transform data
        logger.info("Transforming and validating data...")
        transformer = WarnTransformer()
        processed_notices = transformer.transform(raw_data)
        
        if not processed_notices:
            logger.error("No valid notices after transformation")
            return False
        
        logger.info(f"✓ Transformed {len(processed_notices)} valid notices")
        
        # Step 5: Load data
        logger.info(f"Loading data to {output_format} format(s)...")
        loader = WarnLoader()
        
        # Deduplicate before loading
        unique_notices = loader.deduplicate(processed_notices)
        
        # Load to specified format(s)
        loader.load(unique_notices, destination=output_format, state=state)
        
        logger.info(f"✅ WARN scraping completed successfully for {state}")
        logger.info(f"📊 Final count: {len(unique_notices)} unique notices")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ WARN scraping failed: {e}")
        return False
    
    finally:
        # Cleanup
        if 'extractor' in locals():
            extractor.cleanup()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="WARN Notices Tracker - Multi-State Scraping Framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --state NY --output json
  python main.py --state NY --output all --verbose
  python main.py --list-states
        """
    )
    
    parser.add_argument(
        "--state",
        type=str,
        help="Two-letter state code (e.g., NY, CA, TX)"
    )
    
    parser.add_argument(
        "--output",
        type=str,
        choices=["json", "csv", "sqlite", "excel", "all"],
        default="all",
        help="Output format (default: all)"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    parser.add_argument(
        "--list-states",
        action="store_true",
        help="List all supported states"
    )
    
    args = parser.parse_args()
    
    # Handle list states command
    if args.list_states:
        print("📋 Supported States:")
        for state in get_supported_states():
            config = get_state_config(state)
            print(f"  {state}: {config.state_name} ({config.source_type})")
        return
    
    # Validate required arguments
    if not args.state:
        parser.error("--state is required (or use --list-states)")
    
    # Create logs directory
    Path("logs").mkdir(exist_ok=True)
    
    # Run the scraper
    success = run_warn_scraper(args.state.upper(), args.output, args.verbose)
    
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main() 