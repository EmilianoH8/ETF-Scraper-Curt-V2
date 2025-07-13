#!/usr/bin/env python3
"""
ETF Stats - Simple Main Application
Extracts ETF data from Schwab and saves to Excel
"""

import sys
import os
import yaml
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from src.extractors.schwab_etf_extractor import SchwabETFExtractor
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please ensure all required packages are installed:")
    print("pip install curl-cffi beautifulsoup4 pandas openpyxl pyyaml")
    sys.exit(1)

def load_config() -> Dict[str, Any]:
    """Load configuration from YAML files"""
    config_dir = Path("config")
    
    # Load fund URLs
    fund_urls_path = config_dir / "fund_urls.yaml"
    settings_path = config_dir / "settings.yaml"
    
    try:
        with open(fund_urls_path, 'r') as f:
            fund_config = yaml.safe_load(f)
        
        with open(settings_path, 'r') as f:
            settings = yaml.safe_load(f)
            
        return {
            'funds': fund_config.get('etf_funds', []),
            'settings': settings
        }
    except Exception as e:
        print(f"Error loading configuration: {e}")
        return {'funds': [], 'settings': {}}

def save_to_excel(df: pd.DataFrame, filepath: Path):
    """Save DataFrame to Excel file"""
    try:
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='ETF_Data', index=False)
        return True
    except Exception as e:
        print(f"Error saving to Excel: {e}")
        return False

def main():
    """Main application entry point"""
    print("=" * 60)
    print("ETF Stats - Schwab Data Extractor")
    print("=" * 60)
    
    # Load configuration
    config = load_config()
    funds = config['funds']
    settings = config['settings']
    
    if not funds:
        print("❌ No funds configured! Please check config/fund_urls.yaml")
        return
    
    print(f"📊 Processing {len(funds)} funds...")
    
    # Initialize extractor
    extractor = SchwabETFExtractor(debug=False)
    
    # Extract tickers from configuration
    tickers = [fund['ticker'] for fund in funds if fund.get('active', True)]
    
    print(f"🎯 Extracting data for: {', '.join(tickers)}")
    print("-" * 60)
    
    # Extract data for all funds
    results = extractor.extract_multiple_funds(tickers)
    
    if not results:
        print("❌ No data extracted. Check network connection and fund tickers.")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(results)
    
    # Add timestamp
    df['extracted_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Reorder columns for better readability
    column_order = [
        'ticker', 'fund_name', 'sec_yield', 'expense_ratio', 
        'price', 'net_assets', 'status', 'extracted_at'
    ]
    
    # Only include columns that exist in the DataFrame
    available_columns = [col for col in column_order if col in df.columns]
    df = df[available_columns]
    
    # Create output directory
    output_dir = Path("data")
    output_dir.mkdir(exist_ok=True)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"etf_data_{timestamp}.xlsx"
    filepath = output_dir / filename
    
    # Save to Excel
    if save_to_excel(df, filepath):
        print("✅ SUCCESS!")
        print(f"📁 Data saved to: {filepath}")
        print(f"📈 Extracted data for {len(df)} funds")
        
        # Show summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        
        successful = df[df['status'] == 'success']
        failed = df[df['status'] != 'success']
        
        print(f"✅ Successful extractions: {len(successful)}")
        print(f"❌ Failed extractions: {len(failed)}")
        
        if len(successful) > 0:
            print("\n📊 Successfully extracted funds:")
            for _, row in successful.iterrows():
                sec_yield = row.get('sec_yield', 'N/A')
                yield_display = f"{sec_yield}%" if sec_yield != 'N/A' else 'N/A'
                print(f"  • {row['ticker']}: {yield_display}")
        
        if len(failed) > 0:
            print("\n❌ Failed extractions:")
            for _, row in failed.iterrows():
                print(f"  • {row['ticker']}: {row.get('error', 'Unknown error')}")
    else:
        print("❌ Error saving to Excel file")

if __name__ == "__main__":
    main() 