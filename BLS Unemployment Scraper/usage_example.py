"""
BLS Unemployment ETL Pipeline - Usage Examples

This file shows different ways to use the BLS ETL pipeline for various scenarios.
"""

import asyncio
from setup_imports import *
from bls_scraper import BLSUnemploymentETL

async def example_1_basic_usage():
    """Example 1: Basic usage - Get all default unemployment data"""
    print("=" * 60)
    print("EXAMPLE 1: Basic Usage - All Default Data")
    print("=" * 60)
    
    # Initialize ETL pipeline (no API key needed for basic usage)
    etl = BLSUnemploymentETL()
    
    # Run with all default series
    success = await etl.run_etl_pipeline()
    
    if success:
        print("✅ Basic ETL completed successfully!")
    else:
        print("❌ Basic ETL failed")

async def example_2_specific_series():
    """Example 2: Extract specific unemployment series only"""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Specific Series - Unemployment Rate Only")
    print("=" * 60)
    
    etl = BLSUnemploymentETL()
    
    # Get only unemployment rate data
    series_to_extract = ["national_unemployment_rate"]
    
    success = await etl.run_etl_pipeline(series_to_extract)
    
    if success:
        print("✅ Specific series ETL completed successfully!")
    else:
        print("❌ Specific series ETL failed")

async def example_3_with_api_key():
    """Example 3: Using API key for higher rate limits"""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: With API Key (Higher Rate Limits)")
    print("=" * 60)
    
    # Replace 'your_api_key_here' with actual BLS API key
    # Get free API key from: https://data.bls.gov/registrationEngine/
    api_key = None  # Set to your actual API key
    
    if api_key:
        etl = BLSUnemploymentETL(api_key=api_key)
        
        # With API key, you can request more data
        all_series = [
            "national_unemployment_rate",
            "labor_force_participation", 
            "employment_population_ratio",
            "civilian_labor_force",
            "unemployment_level"
        ]
        
        success = await etl.run_etl_pipeline(all_series)
        
        if success:
            print("✅ API key ETL completed successfully!")
        else:
            print("❌ API key ETL failed")
    else:
        print("⚠️  No API key provided - skipping this example")
        print("   Get a free API key from: https://data.bls.gov/registrationEngine/")

async def example_4_custom_processing():
    """Example 4: Custom processing with individual components"""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Custom Processing - Individual Components")
    print("=" * 60)
    
    from bls_scraper import BLSUnemploymentExtractor, BLSDataTransformer, BLSDataLoader
    from scraping_hub import ExtractorConfig, LoaderConfig
    
    # Create custom configurations
    extractor_config = ExtractorConfig(max_retries=5, delay_between_requests=2.0)
    loader_config = LoaderConfig(output_format="json", batch_size=50)
    
    # Initialize components separately
    extractor = BLSUnemploymentExtractor(extractor_config)
    transformer = BLSDataTransformer()
    loader = BLSDataLoader(loader_config)
    
    try:
        # Extract data
        print("📥 Custom extraction...")
        raw_items = await extractor.extract_unemployment_data(["national_unemployment_rate"])
        print(f"   Extracted {len(raw_items)} items")
        
        # Transform data  
        print("🔄 Custom transformation...")
        transformed_items = []
        for item in raw_items:
            transformed_item = transformer.transform_item(item)
            transformed_items.append(transformed_item)
        print(f"   Transformed {len(transformed_items)} items")
        
        # Load data
        print("💾 Custom loading...")
        success = await loader.load_items(transformed_items)
        
        if success:
            print("✅ Custom processing completed successfully!")
        else:
            print("❌ Custom processing failed during loading")
            
    except Exception as e:
        print(f"❌ Custom processing failed: {e}")

def show_pipeline_info():
    """Show information about the BLS ETL pipeline"""
    print("=" * 60)
    print("BLS UNEMPLOYMENT ETL PIPELINE INFO")
    print("=" * 60)
    
    from bls_scraper import BLSUnemploymentETL
    
    etl = BLSUnemploymentETL()
    
    print("📊 Available Data Series:")
    for name, series_id in etl.extractor.unemployment_series.items():
        print(f"   • {name.replace('_', ' ').title()}: {series_id}")
    
    print(f"\n📁 Output Directory: {etl.loader.output_dir}")
    print(f"🔄 Framework: Scraping Hub ETL Architecture")
    print(f"🌐 Data Source: BLS Public API")
    print(f"📅 Time Range: Last 10 years")
    print(f"🔧 Output Formats: JSON, CSV, Summary Report")

async def main():
    """Run all examples"""
    show_pipeline_info()
    
    # Run examples (uncomment the ones you want to test)
    await example_1_basic_usage()
    # await example_2_specific_series()
    # await example_3_with_api_key()
    # await example_4_custom_processing()
    
    print("\n" + "=" * 60)
    print("🎉 All examples completed!")
    print("📁 Check the 'bls_data' folder for output files")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main()) 