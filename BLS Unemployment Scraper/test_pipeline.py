"""
Test script to verify BLS ETL Pipeline setup
"""

from setup_imports import *

try:
    # Test imports
    from scraping_hub import BaseExtractor, BaseTransformer, BaseLoader
    print("✅ Scraping Hub imports successful")
    
    # Test BLS classes
    from bls_scraper import BLSUnemploymentExtractor, BLSDataTransformer, BLSDataLoader, BLSUnemploymentETL
    print("✅ BLS classes imported successfully")
    
    # Test initialization
    etl = BLSUnemploymentETL()
    print("✅ BLS ETL Pipeline initialized successfully")
    
    # Show available unemployment series
    print("\n📊 Available Unemployment Data Series:")
    for name, series_id in etl.extractor.unemployment_series.items():
        print(f"  - {name}: {series_id}")
    
    print(f"\n🎯 Output Directory: {etl.loader.output_dir.absolute()}")
    print("\n🚀 Pipeline is ready to run!")
    print("To run the full ETL pipeline, use: asyncio.run(etl.run_etl_pipeline())")
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
except Exception as e:
    print(f"❌ Setup Error: {e}") 