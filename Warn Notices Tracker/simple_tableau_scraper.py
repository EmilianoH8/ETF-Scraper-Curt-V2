#!/usr/bin/env python3
"""
Simple Tableau Public WARN scraper based on HAR analysis.
This replicates the actual API calls made by the dashboard.
"""

from setup_imports import *
from curl_cffi import requests
import json
import re
import time
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class WarnRecord:
    """Simple WARN record structure."""
    company: str = ""
    location: str = ""
    employees_affected: int = 0
    warn_date: str = ""
    layoff_date: str = ""
    reason: str = ""
    county: str = ""
    raw_data: dict = None

class SimpleTableauScraper:
    """Simple scraper that replicates the Tableau Public API calls."""
    
    def __init__(self):
        self.session = requests.Session(impersonate="chrome110")
        self.session_id = None
        self.warn_records = []
        
        # Headers based on HAR analysis
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://public.tableau.com",
            "Referer": "https://public.tableau.com/app/profile/kylee.teague2482/viz/WorkerAdjustmentRetrainingNotificationWARN/WARN",
        })
        
        # Base URLs from HAR analysis
        self.base_url = "https://public.tableau.com/vizql/w/WorkerAdjustmentRetrainingNotificationWARN/v/WARN"
        self.dashboard_url = "https://public.tableau.com/app/profile/kylee.teague2482/viz/WorkerAdjustmentRetrainingNotificationWARN/WARN"
    
    def get_session_id(self) -> Optional[str]:
        """Get a session ID by loading the dashboard page."""
        print("🔄 Getting session ID...")
        
        try:
            response = self.session.get(self.dashboard_url, timeout=30)
            
            if response.status_code != 200:
                print(f"❌ Failed to load dashboard: {response.status_code}")
                return None
            
            # Extract session ID from the page
            # Look for session ID patterns in the HTML
            session_patterns = [
                r'sessions/([A-F0-9]{32}-\d+:\d+)',
                r'sessionId["\']?\s*[:=]\s*["\']([A-F0-9]{32}-\d+:\d+)',
                r'session["\']?\s*[:=]\s*["\']([A-F0-9]{32}-\d+:\d+)',
            ]
            
            for pattern in session_patterns:
                matches = re.findall(pattern, response.text)
                if matches:
                    session_id = matches[0]
                    print(f"✅ Found session ID: {session_id}")
                    return session_id
            
            print("⚠️  No session ID found in page - using sample from HAR")
            # Use the session ID from our HAR analysis as a fallback
            return "814BDC19C0F84865B73ACE24D4C3B8D0-0:0"
            
        except Exception as e:
            print(f"❌ Error getting session ID: {e}")
            return None
    
    def fetch_warn_data(self, session_id: str) -> List[Dict]:
        """Fetch WARN data using the categorical-filter endpoint."""
        print("📡 Fetching WARN data...")
        
        # Endpoint from HAR analysis
        endpoint = f"{self.base_url}/sessions/{session_id}/commands/tabdoc/categorical-filter"
        
        # POST data based on HAR analysis
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        post_data = f"""------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="visualIdPresModel"

{{"worksheet":"Bar Chart WN","dashboard":"WARN"}}
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="membershipTarget"

filter
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="filterUpdateType"

filter-replace
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="filterMask"

-1
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="filterSelection"

{{"$all": true}}
------WebKitFormBoundary7MA4YWxkTrZu0gW--"""
        
        headers = {
            "Content-Type": f"multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
            "Content-Length": str(len(post_data)),
        }
        
        try:
            response = self.session.post(endpoint, data=post_data, headers=headers, timeout=30)
            
            if response.status_code != 200:
                print(f"❌ API request failed: {response.status_code}")
                return []
            
            print(f"✅ Got response: {len(response.text):,} bytes")
            
            # Parse JSON response
            try:
                data = json.loads(response.text)
                return self.parse_warn_data(data)
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                # Try to find JSON in the response
                json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                if json_match:
                    try:
                        data = json.loads(json_match.group())
                        return self.parse_warn_data(data)
                    except:
                        pass
                
                print("❌ Could not parse JSON response")
                return []
                
        except Exception as e:
            print(f"❌ Error fetching data: {e}")
            return []
    
    def parse_warn_data(self, data: Dict) -> List[WarnRecord]:
        """Parse WARN data from the API response."""
        print("🔍 Parsing WARN data...")
        
        records = []
        
        try:
            # Navigate the JSON structure based on HAR analysis
            vql_response = data.get('vqlCmdResponse', {})
            
            # Look for data in various places
            potential_data_paths = [
                'layoutStatus',
                'vizStateList',
                'cmdResultList',
                'applicationPresModel',
                'dataSegments',
                'data',
                'values',
                'records'
            ]
            
            def extract_data_recursive(obj, path=""):
                """Recursively extract data from nested JSON."""
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        new_path = f"{path}.{key}" if path else key
                        
                        # Look for WARN-related data
                        if any(keyword in key.lower() for keyword in ['warn', 'company', 'employee', 'data', 'record']):
                            print(f"📊 Found potential data at: {new_path}")
                            
                            if isinstance(value, list):
                                for item in value:
                                    if isinstance(item, dict):
                                        record = self.extract_warn_record(item)
                                        if record:
                                            records.append(record)
                            elif isinstance(value, dict):
                                record = self.extract_warn_record(value)
                                if record:
                                    records.append(record)
                        
                        # Continue recursion
                        extract_data_recursive(value, new_path)
                
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        extract_data_recursive(item, f"{path}[{i}]")
            
            extract_data_recursive(vql_response)
            
            if not records:
                print("⚠️  No WARN records found in standard paths")
                # Try to find any text that looks like WARN data
                text_data = json.dumps(data)
                
                # Look for company names, dates, etc.
                company_patterns = [
                    r'"([^"]+(?:Corp|Inc|LLC|Company|Industries|Manufacturing|Services)[^"]*)"',
                    r'"([^"]+(?:Hospital|Medical|Healthcare|Clinic)[^"]*)"',
                    r'"([^"]+(?:School|University|College|Education)[^"]*)"',
                ]
                
                for pattern in company_patterns:
                    matches = re.findall(pattern, text_data, re.IGNORECASE)
                    for match in matches[:10]:  # Limit to first 10
                        record = WarnRecord(
                            company=match,
                            raw_data={"source": "pattern_match", "pattern": pattern}
                        )
                        records.append(record)
                        print(f"📊 Found company via pattern: {match}")
            
            print(f"✅ Parsed {len(records)} WARN records")
            
        except Exception as e:
            print(f"❌ Error parsing data: {e}")
            import traceback
            traceback.print_exc()
        
        return records
    
    def extract_warn_record(self, data: Dict) -> Optional[WarnRecord]:
        """Extract a single WARN record from a data object."""
        try:
            # Common field mappings
            field_mappings = {
                'company': ['company', 'companyName', 'employer', 'business', 'name'],
                'location': ['location', 'address', 'city', 'site'],
                'employees_affected': ['employees', 'affected', 'workers', 'count', 'number'],
                'warn_date': ['warnDate', 'warn_date', 'date', 'notice_date'],
                'layoff_date': ['layoffDate', 'layoff_date', 'effective_date', 'separation_date'],
                'reason': ['reason', 'type', 'cause', 'description'],
                'county': ['county', 'region', 'area']
            }
            
            record = WarnRecord(raw_data=data)
            
            for field, possible_keys in field_mappings.items():
                for key in possible_keys:
                    if key in data:
                        value = data[key]
                        if field == 'employees_affected':
                            try:
                                record.employees_affected = int(value)
                            except:
                                pass
                        else:
                            setattr(record, field, str(value))
                        break
            
            # Only return if we found some meaningful data
            if record.company or record.location or record.employees_affected > 0:
                return record
            
        except Exception as e:
            print(f"⚠️  Error extracting record: {e}")
        
        return None
    
    def scrape_all_data(self) -> List[WarnRecord]:
        """Main scraping method."""
        print("🚀 Starting Simple Tableau Scraper")
        print("=" * 50)
        
        try:
            # Get session ID
            session_id = self.get_session_id()
            if not session_id:
                print("❌ Could not get session ID")
                return []
            
            # Fetch data
            records = self.fetch_warn_data(session_id)
            
            if records:
                print(f"🎉 Successfully scraped {len(records)} WARN records!")
                
                # Show sample
                print("\n📋 Sample Records:")
                for i, record in enumerate(records[:3], 1):
                    print(f"\n{i}. Company: {record.company}")
                    print(f"   Location: {record.location}")
                    print(f"   Employees: {record.employees_affected}")
                    print(f"   Date: {record.warn_date}")
            else:
                print("⚠️  No records found")
            
            return records
            
        except Exception as e:
            print(f"❌ Scraping error: {e}")
            import traceback
            traceback.print_exc()
            return []
        
        finally:
            self.session.close()
    
    def save_data(self, records: List[WarnRecord], filename: str = "warn_data.json"):
        """Save scraped data to file."""
        if not records:
            print("⚠️  No data to save")
            return
        
        try:
            data = []
            for record in records:
                data.append({
                    'company': record.company,
                    'location': record.location,
                    'employees_affected': record.employees_affected,
                    'warn_date': record.warn_date,
                    'layoff_date': record.layoff_date,
                    'reason': record.reason,
                    'county': record.county,
                    'raw_data': record.raw_data
                })
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"💾 Saved {len(records)} records to {filename}")
            
        except Exception as e:
            print(f"❌ Error saving data: {e}")

def main():
    """Main function."""
    try:
        scraper = SimpleTableauScraper()
        records = scraper.scrape_all_data()
        
        if records:
            scraper.save_data(records)
            print("\n🎉 Scraping completed successfully!")
        else:
            print("\n❌ No data scraped")
            
    except KeyboardInterrupt:
        print("\n👋 Scraping cancelled by user")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 