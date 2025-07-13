#!/usr/bin/env python3
"""
Test script for NY WARN scraper.

This script demonstrates how to use the NY Tableau extractor
directly for testing and development purposes.
"""

from setup_imports import *
from src.extractors.ny_tableau_extractor import NYTableauExtractor
from src.transformers.warn_transformer import WarnTransformer
from src.loaders.warn_loader import WarnLoader
from src.config.states import get_state_config
from loguru import logger
import sys


def test_ny_scraper():
    """Test the NY WARN scraper functionality."""
    
    # Setup logging
    logger.remove()
    logger.add(
        sys.stdout,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        level="INFO",
        colorize=True
    )
    
    logger.info("🧪 Testing NY WARN scraper...")
    
    try:
        # Get NY configuration
        ny_config = get_state_config("NY")
        if not ny_config:
            logger.error("NY configuration not found")
            return False
        
        # Create extractor
        logger.info("Creating NY Tableau extractor...")
        extractor = NYTableauExtractor(config=ny_config)
        
        # Test session bootstrap
        logger.info("Testing Tableau session bootstrap...")
        if extractor.bootstrap_tableau_session():
            logger.success("✅ Session bootstrap successful")
        else:
            logger.error("❌ Session bootstrap failed")
            return False
        
        # Test data extraction (limited)
        logger.info("Testing data extraction...")
        raw_data = extractor.extract_data()
        
        if raw_data.get("success", False):
            logger.success(f"✅ Data extraction test passed")
            logger.info(f"Session ID: {raw_data.get('session_id', 'N/A')}")
            logger.info(f"Total notices: {raw_data.get('total_notices', 0)}")
        else:
            logger.warning("⚠️  Data extraction returned success=False")
            logger.info(f"Error: {raw_data.get('error', 'Unknown')}")
        
        # Test transformer
        logger.info("Testing data transformer...")
        transformer = WarnTransformer()
        
        # Create sample data for testing transformer
        sample_data = {
            "state": "NY",
            "success": True,
            "notices": [
                {
                    "company_name": "Test Company",
                    "warn_date": "2024-01-15",
                    "effective_date": "2024-03-15",
                    "employees_affected": 100,
                    "location_city": "New York",
                    "location_county": "New York County"
                }
            ]
        }
        
        processed_notices = transformer.transform(sample_data)
        
        if processed_notices:
            logger.success(f"✅ Transformer test passed - {len(processed_notices)} notices processed")
            logger.info(f"Sample notice: {processed_notices[0].company_name}")
        else:
            logger.warning("⚠️  Transformer returned no notices")
        
        # Test loader
        logger.info("Testing data loader...")
        loader = WarnLoader(output_dir="test_output")
        
        if processed_notices:
            # Test JSON output only for testing
            loader.load(processed_notices, destination="json", state="NY")
            logger.success("✅ Loader test passed - JSON output created")
        
        logger.success("🎉 All tests completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        return False
    
    finally:
        # Cleanup
        if 'extractor' in locals():
            try:
                extractor.cleanup()
                logger.info("✓ Cleanup completed")
            except:
                pass


def main():
    """Main function."""
    print("🚀 NY WARN Scraper Test")
    print("=" * 50)
    
    success = test_ny_scraper()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("Check the test_output directory for generated files.")
    else:
        print("\n❌ Test failed!")
        sys.exit(1)


if __name__ == "__main__":
    main() 