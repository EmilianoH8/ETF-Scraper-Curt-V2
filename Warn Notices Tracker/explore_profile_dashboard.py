#!/usr/bin/env python3
"""
Explore the Tableau Public profile dashboard for NY WARN data.
This user profile URL might have better access options than the generic views URL.
"""

from setup_imports import *
from curl_cffi import requests
from selectolax.parser import HTMLParser
import json
import re
from urllib.parse import urljoin, urlparse
import time

def explore_profile_dashboard():
    """Explore the user profile dashboard for data access options."""
    
    # The user-provided URL
    dashboard_url = "https://public.tableau.com/app/profile/kylee.teague2482/viz/WorkerAdjustmentRetrainingNotificationWARN/WARN"
    
    print("🔍 Exploring User Profile Dashboard")
    print("=" * 60)
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
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    })
    
    try:
        print("📡 Fetching profile dashboard page...")
        response = session.get(dashboard_url, timeout=30)
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Page size: {len(response.text):,} characters")
        print()
        
        if response.status_code != 200:
            print(f"❌ Failed to fetch page: {response.status_code}")
            if response.status_code == 404:
                print("   → Dashboard might not be publicly available")
            elif response.status_code == 403:
                print("   → Access might be restricted")
            return
        
        # Parse HTML
        parser = HTMLParser(response.text)
        
        # 1. Look for download/export options (more thorough search)
        print("🔍 Searching for download/export options...")
        download_elements = []
        
        # Comprehensive download selectors for Tableau Public
        download_selectors = [
            # Direct download links
            'a[href*="download"]', 'a[href*="export"]', 'a[href*="csv"]', 'a[href*="xlsx"]', 'a[href*="excel"]',
            # Download buttons
            'button[aria-label*="download"]', 'button[title*="download"]', 'button[data-tooltip*="download"]',
            'button[aria-label*="export"]', 'button[title*="export"]', 'button[data-tooltip*="export"]',
            # Tableau-specific selectors
            '[data-tb-test-id*="download"]', '[data-tb-test-id*="export"]',
            '.download-button', '.export-button', '.toolbar-download',
            # Menu items
            '[role="menuitem"][aria-label*="download"]', '[role="menuitem"][aria-label*="export"]',
            # Icon-based buttons
            '[class*="download"]', '[class*="export"]',
            # Data attributes
            '[data-action*="download"]', '[data-action*="export"]',
        ]
        
        for selector in download_selectors:
            elements = parser.css(selector)
            for element in elements:
                href = element.attributes.get('href', '')
                text = element.text(strip=True) if element.text() else ''
                aria_label = element.attributes.get('aria-label', '')
                title = element.attributes.get('title', '')
                data_action = element.attributes.get('data-action', '')
                
                if href or text or aria_label or title or data_action:
                    download_elements.append({
                        "text": text,
                        "href": href,
                        "aria_label": aria_label,
                        "title": title,
                        "data_action": data_action,
                        "selector": selector,
                        "tag": element.tag
                    })
        
        if download_elements:
            print("✅ Found potential download/export options:")
            for i, elem in enumerate(download_elements[:15], 1):
                print(f"  {i}. {elem['tag'].upper()}: '{elem['text']}' | Href: '{elem['href']}'")
                if elem['aria_label']:
                    print(f"     Aria-label: '{elem['aria_label']}'")
                if elem['title']:
                    print(f"     Title: '{elem['title']}'")
                if elem['data_action']:
                    print(f"     Data-action: '{elem['data_action']}'")
                print()
        else:
            print("⚠️  No download/export elements found")
        print()
        
        # 2. Look for embedded data or configuration
        print("🔍 Searching for embedded data and configuration...")
        
        scripts = parser.css('script')
        interesting_data = []
        
        for i, script in enumerate(scripts):
            script_content = script.text() if script.text() else ""
            
            # Look for various data patterns
            patterns = [
                (r'workbook["\']?\s*:\s*["\']?([^"\']+)', "Workbook ID"),
                (r'view["\']?\s*:\s*["\']?([^"\']+)', "View ID"),
                (r'sessionId["\']?\s*:\s*["\']?([^"\']+)', "Session ID"),
                (r'apiRoot["\']?\s*:\s*["\']?([^"\']+)', "API Root"),
                (r'bootstrap["\']?\s*:\s*["\']?([^"\']+)', "Bootstrap URL"),
                (r'data["\']?\s*:\s*\{.*?\}', "Data Object"),
                (r'config["\']?\s*:\s*\{.*?\}', "Config Object"),
                (r'tableau.*?\.viz\.[^{]*\{[^}]*\}', "Tableau Viz Config"),
                (r'\/vizql\/[^"\']+', "VizQL API Endpoint"),
                (r'\/bootstrapSession\/[^"\']+', "Bootstrap Session Endpoint"),
                (r'\/commands\/[^"\']+', "Commands Endpoint"),
            ]
            
            for pattern, description in patterns:
                matches = re.findall(pattern, script_content, re.IGNORECASE | re.DOTALL)
                if matches:
                    interesting_data.append({
                        "type": description,
                        "matches": matches[:5],  # Limit to first 5 matches
                        "script_index": i
                    })
        
        if interesting_data:
            print("✅ Found interesting data patterns:")
            for data in interesting_data:
                print(f"  📊 {data['type']}:")
                for match in data['matches']:
                    match_str = str(match)[:100] + "..." if len(str(match)) > 100 else str(match)
                    print(f"     {match_str}")
                print()
        else:
            print("⚠️  No embedded data patterns found")
        print()
        
        # 3. Look for API endpoints in the page
        print("🔍 Extracting API endpoints...")
        
        all_text = response.text
        
        # Extract various URL patterns
        url_patterns = [
            (r'https://public\.tableau\.com/[^"\'>\s]+', "Tableau Public URLs"),
            (r'\/vizql\/[^"\'>\s]+', "VizQL API paths"),
            (r'\/api\/[^"\'>\s]+', "API paths"),
            (r'\/bootstrapSession\/[^"\'>\s]+', "Bootstrap Session paths"),
            (r'\/commands\/[^"\'>\s]+', "Commands paths"),
        ]
        
        extracted_urls = {}
        for pattern, description in url_patterns:
            matches = re.findall(pattern, all_text, re.IGNORECASE)
            if matches:
                # Remove duplicates and sort
                unique_matches = sorted(set(matches))
                extracted_urls[description] = unique_matches[:10]  # Limit to 10 per type
        
        if extracted_urls:
            print("✅ Found API endpoints:")
            for url_type, urls in extracted_urls.items():
                print(f"  🔗 {url_type}:")
                for url in urls:
                    print(f"     {url}")
                print()
        else:
            print("⚠️  No API endpoints found")
        print()
        
        # 4. Test common Tableau Public export patterns
        print("🧪 Testing Tableau Public export patterns...")
        
        base_url = dashboard_url.split('?')[0]  # Remove any existing query parameters
        
        # Common Tableau Public export patterns
        export_patterns = [
            # CSV exports
            f"{base_url}?:format=csv",
            f"{base_url}?:export=csv",
            f"{base_url}?:showVizHome=no&:format=csv",
            f"{base_url}?:embed=yes&:format=csv",
            f"{base_url}?:download=yes&:format=csv",
            # Excel exports
            f"{base_url}?:format=xlsx",
            f"{base_url}?:export=xlsx",
            # JSON exports
            f"{base_url}?:format=json",
            f"{base_url}?:export=json",
            # Data endpoints
            f"{base_url}/data",
            f"{base_url}/crosstab",
            f"{base_url}/crosstab/crosstab.csv",
        ]
        
        successful_exports = []
        
        for test_url in export_patterns:
            try:
                print(f"🧪 Testing: {test_url}")
                test_response = session.get(test_url, timeout=15)
                content_type = test_response.headers.get('content-type', '')
                content_length = len(test_response.text)
                
                print(f"   Status: {test_response.status_code}")
                print(f"   Content-Type: {content_type}")
                print(f"   Content-Length: {content_length:,}")
                
                if test_response.status_code == 200:
                    # Check if it's actually data (not just HTML)
                    if 'text/csv' in content_type or 'application/vnd.ms-excel' in content_type:
                        print(f"   🎯 SUCCESS! This looks like direct data export!")
                        successful_exports.append(test_url)
                    elif 'application/json' in content_type:
                        print(f"   🎯 SUCCESS! This looks like JSON data!")
                        successful_exports.append(test_url)
                    elif content_length > 10000 and 'text/html' not in content_type:
                        print(f"   ✅ Possible data endpoint (large non-HTML response)")
                        successful_exports.append(test_url)
                    else:
                        print(f"   ⚠️  Returns HTML (probably not direct data)")
                
                print()
                time.sleep(0.5)  # Be respectful to the server
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
                print()
        
        # Summary and recommendations
        print("📋 ANALYSIS SUMMARY")
        print("=" * 60)
        
        if successful_exports:
            print("🎉 GREAT NEWS! Found potential direct data access:")
            for i, url in enumerate(successful_exports, 1):
                print(f"  {i}. {url}")
            print()
            print("✅ RECOMMENDATION: Use direct export URLs")
            print("   → These URLs may provide CSV/Excel/JSON data directly")
            print("   → Much simpler than API reverse-engineering!")
            print("   → Test these URLs manually to verify data quality")
        
        elif download_elements:
            print("✅ Found download/export UI elements")
            print("   → May need browser automation to click download buttons")
            print("   → Consider using Selenium/NoDriver to automate clicks")
        
        elif extracted_urls:
            print("⚠️  Found API endpoints but no direct exports")
            print("   → May need to use the API reverse-engineering approach")
            print("   → Could be simpler than the original dol.ny.gov approach")
        
        else:
            print("❌ No obvious data access methods found")
            print("   → Dashboard might be heavily protected")
            print("   → Consider manual data collection")
        
        print()
        print("🔧 NEXT STEPS:")
        if successful_exports:
            print("1. Test the successful export URLs manually")
            print("2. Verify data quality and completeness")
            print("3. Integrate the working URLs into your scraper")
        else:
            print("1. Visit the dashboard manually to check for download buttons")
            print("2. Use browser dev tools to monitor network requests")
            print("3. Consider browser automation if manual downloads work")
        
    except Exception as e:
        print(f"❌ Error exploring dashboard: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        session.close()

def main():
    """Main function."""
    try:
        explore_profile_dashboard()
    except KeyboardInterrupt:
        print("\n👋 Exploration cancelled by user")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 