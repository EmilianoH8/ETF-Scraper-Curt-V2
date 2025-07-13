#!/usr/bin/env python3
"""
Explore Tableau Public options for NY WARN data.

This script investigates simpler alternatives to API reverse-engineering:
1. Download options (CSV/Excel export)
2. Direct data access URLs
3. Embedded data in page source
"""

from setup_imports import *
from curl_cffi import requests
from selectolax.parser import HTMLParser
import json
import re
from urllib.parse import urljoin, urlparse
import time

def explore_tableau_public():
    """Explore Tableau Public dashboard for data access options."""
    
    dashboard_url = "https://public.tableau.com/views/WorkerAdjustmentRetrainingNotificationWARN/WARN"
    
    print("🔍 Exploring Tableau Public Dashboard")
    print("=" * 50)
    print(f"URL: {dashboard_url}")
    print()
    
    # Create session with browser fingerprinting
    session = requests.Session(impersonate="chrome110")
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
    })
    
    try:
        print("📡 Fetching dashboard page...")
        response = session.get(dashboard_url, timeout=30)
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Page size: {len(response.text):,} characters")
        print()
        
        if response.status_code != 200:
            print(f"❌ Failed to fetch page: {response.status_code}")
            return
        
        # Parse HTML
        parser = HTMLParser(response.text)
        
        # 1. Look for download/export options
        print("🔍 Searching for download options...")
        download_links = []
        
        # Common Tableau download selectors
        download_selectors = [
            'a[href*="download"]',
            'button[aria-label*="download"]',
            'a[href*="csv"]', 
            'a[href*="excel"]',
            'a[href*="export"]',
            '[data-tb-test-id*="download"]',
            '.download-button',
            '.export-button'
        ]
        
        for selector in download_selectors:
            elements = parser.css(selector)
            for element in elements:
                href = element.attributes.get('href', '')
                text = element.text(strip=True)
                if href or text:
                    download_links.append({"text": text, "href": href, "selector": selector})
        
        if download_links:
            print("✅ Found potential download options:")
            for i, link in enumerate(download_links[:10], 1):
                print(f"  {i}. Text: '{link['text']}' | Href: '{link['href']}'")
        else:
            print("⚠️  No obvious download links found")
        print()
        
        # 2. Look for embedded data or data URLs
        print("🔍 Searching for embedded data...")
        
        # Look for JSON data in script tags
        scripts = parser.css('script')
        data_found = False
        
        for script in scripts:
            script_content = script.text(strip=True) if script.text() else ""
            
            # Look for common data patterns
            if any(pattern in script_content.lower() for pattern in ['warn', 'company', 'employee', 'layoff']):
                # Look for JSON-like structures
                json_matches = re.findall(r'\{[^{}]*(?:"warn"|"company"|"employee")[^{}]*\}', script_content, re.IGNORECASE)
                if json_matches:
                    print(f"✅ Found potential data in script tag:")
                    for match in json_matches[:3]:  # Show first 3 matches
                        print(f"  📄 {match[:100]}...")
                    data_found = True
                    break
        
        if not data_found:
            print("⚠️  No embedded data found in scripts")
        print()
        
        # 3. Look for API endpoints or data URLs
        print("🔍 Searching for data endpoints...")
        
        # Extract all URLs from the page
        all_urls = set()
        
        # From href attributes
        for element in parser.css('[href]'):
            href = element.attributes.get('href', '')
            if href:
                all_urls.add(href)
        
        # From script content
        for script in scripts:
            script_content = script.text() if script.text() else ""
            # Look for URL patterns
            url_patterns = re.findall(r'https?://[^\s"\']+', script_content)
            all_urls.update(url_patterns)
        
        # Filter for potentially useful data URLs
        data_urls = []
        data_keywords = ['data', 'api', 'json', 'csv', 'export', 'query', 'vql', 'bootstrap']
        
        for url in all_urls:
            if any(keyword in url.lower() for keyword in data_keywords):
                data_urls.append(url)
        
        if data_urls:
            print("✅ Found potential data URLs:")
            for i, url in enumerate(sorted(set(data_urls))[:10], 1):
                print(f"  {i}. {url}")
        else:
            print("⚠️  No obvious data URLs found")
        print()
        
        # 4. Look for alternative access methods
        print("🔍 Checking for alternative access methods...")
        
        # Check if there's a direct data view
        possible_data_urls = [
            dashboard_url.replace('/WARN', '/WARN?:showVizHome=no'),
            dashboard_url + '?:format=csv',
            dashboard_url + '?:format=json', 
            dashboard_url + '?:export=yes',
            dashboard_url.replace('views/', 'views/').replace('/WARN', '/WARN/crosstab/crosstab.csv'),
        ]
        
        print("🧪 Testing alternative URLs...")
        for test_url in possible_data_urls:
            try:
                test_response = session.head(test_url, timeout=10)
                content_type = test_response.headers.get('content-type', '')
                
                if test_response.status_code == 200:
                    print(f"✅ {test_url}")
                    print(f"   Content-Type: {content_type}")
                    
                    # If it's CSV or JSON, this could be our data!
                    if 'csv' in content_type or 'json' in content_type:
                        print(f"   🎯 This looks like a direct data endpoint!")
                        
                elif test_response.status_code in [403, 404]:
                    print(f"❌ {test_url} - {test_response.status_code}")
                else:
                    print(f"⚠️  {test_url} - {test_response.status_code}")
                    
            except Exception as e:
                print(f"❌ {test_url} - Error: {e}")
            
            time.sleep(0.5)  # Be nice to the server
        
        print()
        print("📋 Summary:")
        print("=" * 50)
        
        # Provide recommendations
        if download_links:
            print("✅ RECOMMENDATION: Use download/export functionality")
            print("   → Look for download buttons in the actual dashboard")
            print("   → May provide CSV/Excel exports of the data")
        
        if data_urls:
            print("✅ RECOMMENDATION: Investigate data URLs")
            print("   → Some URLs may provide direct data access")
            print("   → Test these URLs with proper parameters")
        
        if not download_links and not data_urls:
            print("⚠️  No simple alternatives found")
            print("   → May need to stick with API reverse-engineering")
            print("   → Or investigate browser automation (Selenium)")
        
        print()
        print("🔧 Next Steps:")
        print("1. Visit the dashboard manually to check for download buttons")
        print("2. Test any promising URLs found above")
        print("3. Consider browser automation if no direct access available")
        
    except Exception as e:
        print(f"❌ Error exploring dashboard: {e}")
    
    finally:
        session.close()

def main():
    """Main function."""
    try:
        explore_tableau_public()
    except KeyboardInterrupt:
        print("\n👋 Exploration cancelled by user")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 