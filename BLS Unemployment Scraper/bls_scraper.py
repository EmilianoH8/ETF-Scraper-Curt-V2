import sys
import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path

# Add the parent directory to Python path to access scraping_hub
parent_dir = Path(__file__).parent.parent
scraping_hub_path = parent_dir / "Scraping Hub"
sys.path.insert(0, str(scraping_hub_path))

# Now you can import from scraping_hub
from scraping_hub import BaseExtractor, BaseTransformer, BaseLoader
from scraping_hub import ScrapingResponse, ScrapedItem, ExtractorConfig, LoaderConfig
from scraping_hub.core.models import ScrapingMethod

class BLSUnemploymentExtractor(BaseExtractor):
    """Extractor for BLS unemployment data using the official BLS API"""
    
    def __init__(self, config: ExtractorConfig = None, api_key: Optional[str] = None):
        super().__init__(config)
        self.api_base_url = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
        self.api_key = api_key
        
        # Common BLS unemployment series IDs
        self.unemployment_series = {
            "national_unemployment_rate": "LNS14000000",  # National unemployment rate
            "labor_force_participation": "LNS11300000",   # Labor force participation rate
            "employment_population_ratio": "LNS12300000", # Employment-population ratio
            "civilian_labor_force": "LNS11000000",        # Civilian labor force
            "unemployment_level": "LNS13000000",          # Unemployment level
        }
    
    async def _make_request(self, url: str) -> ScrapingResponse:
        """Make request to BLS API"""
        try:
            # Extract series IDs from the custom URL format we'll use
            if "series=" in url:
                series_ids = url.split("series=")[1].split("&")[0].split(",")
            else:
                # Default to national unemployment rate
                series_ids = [self.unemployment_series["national_unemployment_rate"]]
            
            # Build API request payload
            current_year = datetime.now().year
            start_year = current_year - 10  # Get last 10 years of data
            
            payload = {
                "seriesid": series_ids,
                "startyear": str(start_year),
                "endyear": str(current_year),
                "registrationkey": self.api_key if self.api_key else ""
            }
            
            # Make the API request
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "BLS-Unemployment-Scraper/1.0"
            }
            
            response = await self._make_http_request(
                url=self.api_base_url,
                method="POST",
                headers=headers,
                json_data=payload
            )
            
            return ScrapingResponse(
                url=url,
                status_code=response.status_code,
                content=response.text,
                headers=dict(response.headers),
                method=ScrapingMethod.API_REQUEST
            )
            
        except Exception as e:
            self.logger.error(f"Error making BLS API request: {e}")
            raise
    
    def _parse_content(self, content: str, url: str) -> List[ScrapedItem]:
        """Parse BLS API response into structured data items"""
        try:
            data = json.loads(content)
            items = []
            
            if data.get("status") != "REQUEST_SUCCEEDED":
                self.logger.warning(f"BLS API request failed: {data.get('message', 'Unknown error')}")
                return items
            
            # Parse each time series
            for series in data.get("Results", {}).get("series", []):
                series_id = series.get("seriesID")
                series_title = self._get_series_title(series_id)
                
                # Parse each data point
                for data_point in series.get("data", []):
                    item_data = {
                        "series_id": series_id,
                        "series_title": series_title,
                        "year": data_point.get("year"),
                        "period": data_point.get("period"),
                        "period_name": data_point.get("periodName"),
                        "value": data_point.get("value"),
                        "footnotes": [f.get("text", "") for f in data_point.get("footnotes", [])],
                        "date_extracted": datetime.now().isoformat(),
                        "source_url": url
                    }
                    
                    items.append(ScrapedItem(
                        url=url,
                        data=item_data,
                        item_type="unemployment_data",
                        timestamp=datetime.now()
                    ))
            
            self.logger.info(f"Parsed {len(items)} unemployment data points from BLS API")
            return items
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse BLS API response as JSON: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Error parsing BLS API content: {e}")
            return []
    
    def _get_series_title(self, series_id: str) -> str:
        """Get human-readable title for BLS series ID"""
        series_titles = {
            "LNS14000000": "National Unemployment Rate",
            "LNS11300000": "Labor Force Participation Rate", 
            "LNS12300000": "Employment-Population Ratio",
            "LNS11000000": "Civilian Labor Force",
            "LNS13000000": "Unemployment Level"
        }
        return series_titles.get(series_id, f"BLS Series {series_id}")
    
    async def extract_unemployment_data(self, series_names: List[str] = None) -> List[ScrapedItem]:
        """Extract unemployment data for specified series"""
        if series_names is None:
            series_names = ["national_unemployment_rate"]
        
        # Build series IDs string
        series_ids = [self.unemployment_series.get(name, name) for name in series_names]
        url = f"bls://api?series={','.join(series_ids)}"
        
        response = await self._make_request(url)
        return self._parse_content(response.content, url)

class BLSDataTransformer(BaseTransformer):
    """Transform BLS unemployment data"""
    
    def transform_item(self, item: ScrapedItem) -> ScrapedItem:
        """Transform individual unemployment data item"""
        try:
            data = item.data.copy()
            
            # Convert value to float if possible
            if data.get("value") and data["value"] != "-":
                try:
                    data["value_numeric"] = float(data["value"])
                except (ValueError, TypeError):
                    data["value_numeric"] = None
            else:
                data["value_numeric"] = None
            
            # Create standardized date from year and period
            if data.get("year") and data.get("period"):
                try:
                    year = int(data["year"])
                    period = data["period"]
                    
                    if period.startswith("M"):  # Monthly data (M01, M02, etc.)
                        month = int(period[1:])
                        data["date"] = f"{year}-{month:02d}-01"
                        data["date_type"] = "monthly"
                    elif period.startswith("Q"):  # Quarterly data
                        quarter = int(period[1:])
                        month = (quarter - 1) * 3 + 1
                        data["date"] = f"{year}-{month:02d}-01"
                        data["date_type"] = "quarterly"
                    elif period == "A01":  # Annual data
                        data["date"] = f"{year}-01-01"
                        data["date_type"] = "annual"
                    else:
                        data["date"] = f"{year}-01-01"
                        data["date_type"] = "unknown"
                        
                except (ValueError, TypeError):
                    data["date"] = None
                    data["date_type"] = "invalid"
            
            # Add data quality flags
            data["has_footnotes"] = len(data.get("footnotes", [])) > 0
            data["is_preliminary"] = any("preliminary" in f.lower() for f in data.get("footnotes", []))
            data["is_revised"] = any("revised" in f.lower() for f in data.get("footnotes", []))
            
            # Categorize the data
            series_id = data.get("series_id", "")
            if "14000000" in series_id:
                data["category"] = "unemployment_rate"
                data["unit"] = "percent"
            elif "13000000" in series_id:
                data["category"] = "unemployment_level"
                data["unit"] = "thousands"
            elif "11300000" in series_id:
                data["category"] = "labor_force_participation"
                data["unit"] = "percent"
            elif "12300000" in series_id:
                data["category"] = "employment_population_ratio"
                data["unit"] = "percent"
            elif "11000000" in series_id:
                data["category"] = "civilian_labor_force"
                data["unit"] = "thousands"
            else:
                data["category"] = "other"
                data["unit"] = "unknown"
            
            return ScrapedItem(
                url=item.url,
                data=data,
                item_type=item.item_type,
                timestamp=item.timestamp
            )
            
        except Exception as e:
            self.logger.error(f"Error transforming BLS data item: {e}")
            return item

class BLSDataLoader(BaseLoader):
    """Load BLS unemployment data to various storage formats"""
    
    def __init__(self, config: LoaderConfig = None):
        super().__init__(config)
        self.output_dir = Path("bls_data")
        self.output_dir.mkdir(exist_ok=True)
    
    async def load_items(self, items: List[ScrapedItem]) -> bool:
        """Load unemployment data items to storage"""
        try:
            if not items:
                self.logger.warning("No items to load")
                return True
            
            # Group items by category for better organization
            categorized_data = {}
            for item in items:
                category = item.data.get("category", "other")
                if category not in categorized_data:
                    categorized_data[category] = []
                categorized_data[category].append(item.data)
            
            # Save each category to separate files
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            for category, data_items in categorized_data.items():
                # Save as JSON
                json_file = self.output_dir / f"bls_{category}_{timestamp}.json"
                with open(json_file, "w") as f:
                    json.dump(data_items, f, indent=2, default=str)
                
                # Save as CSV for easy analysis
                csv_file = self.output_dir / f"bls_{category}_{timestamp}.csv"
                await self._save_as_csv(data_items, csv_file)
                
                self.logger.info(f"Saved {len(data_items)} {category} records to {json_file} and {csv_file}")
            
            # Create summary report
            await self._create_summary_report(categorized_data, timestamp)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error loading BLS data: {e}")
            return False
    
    async def _save_as_csv(self, data_items: List[Dict], csv_file: Path):
        """Save data items as CSV"""
        import csv
        
        if not data_items:
            return
        
        # Get all possible field names
        fieldnames = set()
        for item in data_items:
            fieldnames.update(item.keys())
        fieldnames = sorted(list(fieldnames))
        
        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data_items)
    
    async def _create_summary_report(self, categorized_data: Dict, timestamp: str):
        """Create a summary report of the extracted data"""
        summary_file = self.output_dir / f"bls_summary_{timestamp}.txt"
        
        with open(summary_file, "w") as f:
            f.write("BLS Unemployment Data Extraction Summary\n")
            f.write("=" * 50 + "\n")
            f.write(f"Extraction Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            total_records = sum(len(items) for items in categorized_data.values())
            f.write(f"Total Records: {total_records}\n\n")
            
            for category, items in categorized_data.items():
                f.write(f"{category.upper()}: {len(items)} records\n")
                
                if items:
                    # Get date range
                    dates = [item.get("date") for item in items if item.get("date")]
                    if dates:
                        dates.sort()
                        f.write(f"  Date Range: {dates[0]} to {dates[-1]}\n")
                    
                    # Get value range for numeric data
                    values = [item.get("value_numeric") for item in items if item.get("value_numeric") is not None]
                    if values:
                        f.write(f"  Value Range: {min(values):.2f} to {max(values):.2f}\n")
                
                f.write("\n")

# ETL Pipeline Orchestrator
class BLSUnemploymentETL:
    """Main ETL pipeline orchestrator for BLS unemployment data"""
    
    def __init__(self, api_key: Optional[str] = None):
        # Initialize ETL components
        extractor_config = ExtractorConfig(max_retries=3, delay_between_requests=1.0)
        loader_config = LoaderConfig(output_format="json", batch_size=100)
        
        self.extractor = BLSUnemploymentExtractor(extractor_config, api_key)
        self.transformer = BLSDataTransformer()
        self.loader = BLSDataLoader(loader_config)
    
    async def run_etl_pipeline(self, series_names: List[str] = None) -> bool:
        """Run the complete ETL pipeline"""
        try:
            print("🚀 Starting BLS Unemployment Data ETL Pipeline...")
            
            # Extract
            print("📥 Extracting data from BLS API...")
            raw_items = await self.extractor.extract_unemployment_data(series_names)
            print(f"✅ Extracted {len(raw_items)} raw data points")
            
            if not raw_items:
                print("❌ No data extracted. Check API key or series IDs.")
                return False
            
            # Transform
            print("🔄 Transforming data...")
            transformed_items = []
            for item in raw_items:
                transformed_item = self.transformer.transform_item(item)
                transformed_items.append(transformed_item)
            print(f"✅ Transformed {len(transformed_items)} data points")
            
            # Load
            print("💾 Loading data to storage...")
            success = await self.loader.load_items(transformed_items)
            
            if success:
                print("🎉 ETL Pipeline completed successfully!")
                print(f"📁 Data saved to: {self.loader.output_dir.absolute()}")
                return True
            else:
                print("❌ ETL Pipeline failed during loading phase")
                return False
                
        except Exception as e:
            print(f"❌ ETL Pipeline failed: {e}")
            return False

async def main():
    """Main function to run the BLS unemployment ETL pipeline"""
    # You can get a free API key from: https://data.bls.gov/registrationEngine/
    api_key = None  # Replace with your BLS API key for higher rate limits
    
    # Initialize ETL pipeline
    etl = BLSUnemploymentETL(api_key)
    
    # Define which unemployment series to extract
    series_to_extract = [
        "national_unemployment_rate",
        "labor_force_participation", 
        "employment_population_ratio",
        "civilian_labor_force",
        "unemployment_level"
    ]
    
    # Run the ETL pipeline
    success = await etl.run_etl_pipeline(series_to_extract)
    
    if success:
        print("\n📊 Data extraction complete! Check the 'bls_data' folder for results.")
    else:
        print("\n🚫 Data extraction failed. Please check the logs for details.")

if __name__ == "__main__":
    # Example usage
    print("BLS Unemployment Scraper - ETL Pipeline Ready!")
    print("Available classes:")
    print("- BLSUnemploymentExtractor (API-based extraction)")
    print("- BLSDataTransformer (Data cleaning & standardization)")
    print("- BLSDataLoader (Multi-format data storage)")
    print("- BLSUnemploymentETL (Complete pipeline orchestrator)")
    print("\nRunning ETL pipeline...")
    
    # Run the pipeline
    asyncio.run(main()) 