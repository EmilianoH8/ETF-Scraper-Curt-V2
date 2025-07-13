#!/usr/bin/env python3
"""
Schwab ETF Data Extractor using curl_cffi
Extracts SEC yield and other fund data from Schwab's ETF pages
"""

import json
import re
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, List, Tuple
from urllib.parse import urljoin, urlparse

try:
    from curl_cffi import requests
    from bs4 import BeautifulSoup
except ImportError:
    raise ImportError("Required packages not installed. Run: pip install curl-cffi beautifulsoup4")

class SchwabETFExtractor:
    """Extract ETF data from Schwab using curl_cffi with anti-detection"""
    
    def __init__(self, debug: bool = False):
        self.debug = debug
        self.session = None
        self.base_url = "https://www.schwab.com"
        
        # Comprehensive headers to mimic real browser
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Cache-Control': 'max-age=0',
        }
        
    def _log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def _create_session(self, impersonate: str = "chrome131") -> requests.Session:
        """Create curl_cffi session with specified impersonation"""
        session = requests.Session()
        
        # Try different impersonation profiles
        impersonation_profiles = [
            "chrome131",
            "chrome130", 
            "chrome129",
            "chrome128",
            "edge131",
            "safari17_0"
        ]
        
        if impersonate not in impersonation_profiles:
            impersonate = "chrome131"
            
        session.headers.update(self.headers)
        self._log(f"Created session with impersonation: {impersonate}")
        return session
        
    def _test_access(self, url: str, max_retries: int = 3) -> Tuple[bool, Optional[str], Optional[int]]:
        """Test if we can access the URL with different strategies"""
        
        impersonation_profiles = ["chrome131", "chrome130", "edge131", "safari17_0"]
        
        for profile in impersonation_profiles:
            self._log(f"Testing access with {profile} impersonation...")
            
            for attempt in range(max_retries):
                try:
                    # Create fresh session for each attempt
                    session = self._create_session(profile)
                    
                    # Add some delay between attempts
                    if attempt > 0:
                        time.sleep(2 ** attempt)
                    
                    response = session.get(
                        url, 
                        headers=self.headers,
                        timeout=30,
                        allow_redirects=True,
                        impersonate=profile
                    )
                    
                    self._log(f"Response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        content = response.text
                        
                        # Check for authorization errors
                        if "unable to authorize your request" in content.lower():
                            self._log("Authorization error detected")
                            continue
                        
                        # Check for blocking patterns
                        if "blocked" in content.lower() or "access denied" in content.lower():
                            self._log("Access blocked detected")
                            continue
                            
                        # Check if we have actual content
                        if len(content) > 1000:  # Reasonable content size
                            self._log(f"✅ Success with {profile}! Content length: {len(content)}")
                            self.session = session
                            return True, content, response.status_code
                    
                    elif response.status_code == 403:
                        self._log("403 Forbidden - trying next profile")
                        break  # Try next profile
                    elif response.status_code == 429:
                        self._log("429 Rate Limited - waiting...")
                        time.sleep(10)
                        continue
                    else:
                        self._log(f"Status {response.status_code} - trying next attempt")
                        
                except Exception as e:
                    self._log(f"Error with {profile}: {str(e)}")
                    continue
                    
        return False, None, None
    
    def _extract_iframe_url(self, content: str) -> Optional[str]:
        """Extract iframe URL from main Schwab page"""
        soup = BeautifulSoup(content, 'html.parser')
        
        # Look for iframe with schwab.wallst.com domain
        iframes = soup.find_all('iframe')
        for iframe in iframes:
            src = iframe.get('src', '')
            if 'schwab.wallst.com' in src and 'etfs/summary.asp' in src:
                # Clean up the URL (remove anchor fragments)
                if '#' in src:
                    src = src.split('#')[0]
                self._log(f"Found iframe URL: {src}")
                return src
                
        self._log("No iframe URL found in content")
        return None
        
    def extract_fund_data(self, ticker: str) -> Dict[str, any]:
        """Extract fund data for given ticker"""
        
        # Step 1: Get main page to find iframe URL
        main_url = f"https://www.schwab.com/research/etfs/quotes/summary/{ticker.lower()}"
        self._log(f"Extracting data for {ticker} from {main_url}")
        
        # Test access to main page
        success, content, status_code = self._test_access(main_url)
        
        if not success:
            return {
                "ticker": ticker,
                "status": "failed",
                "error": "Could not access main Schwab page",
                "timestamp": datetime.now().isoformat()
            }
        
        # Step 2: Extract iframe URL
        iframe_url = self._extract_iframe_url(content)
        
        if not iframe_url:
            return {
                "ticker": ticker,
                "status": "failed",
                "error": "Could not find iframe URL",
                "timestamp": datetime.now().isoformat()
            }
            
        # Step 3: Fetch actual fund data from iframe
        self._log(f"Fetching fund data from iframe: {iframe_url}")
        
        # Update headers for iframe request
        iframe_headers = self.headers.copy()
        iframe_headers['Referer'] = main_url
        
        try:
            response = self.session.get(
                iframe_url,
                headers=iframe_headers,
                timeout=30,
                allow_redirects=True
            )
            
            if response.status_code != 200:
                return {
                    "ticker": ticker,
                    "status": "failed",
                    "error": f"Iframe request failed with status {response.status_code}",
                    "timestamp": datetime.now().isoformat()
                }
            
            iframe_content = response.text
            
            # Save iframe content for debugging
            if self.debug:
                debug_file = f"schwab_{ticker}_iframe_debug.html"
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(iframe_content)
                self._log(f"Saved iframe HTML to {debug_file}")
                
        except Exception as e:
            return {
                "ticker": ticker,
                "status": "failed",
                "error": f"Error fetching iframe: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
            
        # Step 4: Parse fund data from iframe content
        soup = BeautifulSoup(iframe_content, 'html.parser')
        fund_data = self._parse_fund_data(soup, ticker)
        fund_data["status"] = "success"
        fund_data["timestamp"] = datetime.now().isoformat()
        fund_data["iframe_url"] = iframe_url
        
        return fund_data
        
    def _parse_fund_data(self, soup: BeautifulSoup, ticker: str) -> Dict[str, any]:
        """Parse fund data from Schwab iframe HTML"""
        
        data = {
            "ticker": ticker,
            "fund_name": None,
            "sec_yield": None,
            "expense_ratio": None,
            "net_assets": None,
            "price": None,
            "yield_info": [],
            "extracted_values": []
        }
        
        # Get all text content for analysis
        text_content = soup.get_text()
        
        # Extract fund name - look for common patterns
        fund_name_patterns = [
            r'(.*?)\s*\|\s*' + ticker.upper(),
            r'(.*?)\s*' + ticker.upper(),
            r'([A-Z][^|]*?ETF[^|]*?)',
            r'([A-Z][^|]*?Municipal[^|]*?)',
        ]
        
        for pattern in fund_name_patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            if matches:
                name = matches[0].strip()
                if len(name) > 10 and len(name) < 200:  # Reasonable length
                    data["fund_name"] = name
                    self._log(f"Found fund name: {name}")
                    break
                    
        # Extract SEC yield with multiple strategies
        sec_yield = self._extract_sec_yield(soup)
        if sec_yield:
            data["sec_yield"] = sec_yield
            
        # Extract other metrics
        data["expense_ratio"] = self._extract_expense_ratio(soup)
        data["net_assets"] = self._extract_net_assets(soup)
        data["price"] = self._extract_price(soup)
        
        # Save all percentage values for debugging
        all_percentages = re.findall(r'(\d+\.?\d*%)', text_content)
        unique_percentages = list(set(all_percentages))
        data["extracted_values"] = unique_percentages
        self._log(f"All percentage values found: {unique_percentages}")
        
        return data
        
    def _extract_sec_yield(self, soup: BeautifulSoup) -> Optional[float]:
        """Extract SEC yield using multiple strategies"""
        
        text_content = soup.get_text()
        
        # Strategy 1: Look for SEC yield labels with various patterns
        sec_yield_patterns = [
            r"sec yield[:\s-]*(\d+\.?\d*%?)",
            r"30[-\s]?day sec yield[:\s-]*(\d+\.?\d*%?)",
            r"sec[:\s-]*(\d+\.?\d*%?)",
            r"standardized yield[:\s-]*(\d+\.?\d*%?)",
            r"yield[:\s-]*(\d+\.?\d*%?)",
            r"30[-\s]?day yield[:\s-]*(\d+\.?\d*%?)",
            r"distribution yield[:\s-]*(\d+\.?\d*%?)",
            r"current yield[:\s-]*(\d+\.?\d*%?)"
        ]
        
        for pattern in sec_yield_patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            for match in matches:
                try:
                    # Clean the match
                    clean_match = re.sub(r'[^\d.]', '', match)
                    if clean_match:
                        value = float(clean_match)
                        # Reasonable range for SEC yield
                        if 0.01 <= value <= 20.0:
                            self._log(f"Found SEC yield: {value}% (pattern: {pattern})")
                            return value
                except (ValueError, TypeError):
                    continue
                    
        # Strategy 2: Look for table-based data with SEC yield labels (HIGHEST PRIORITY)
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                for i, cell in enumerate(cells):
                    cell_text = cell.get_text().strip().lower()
                    # Look for specific SEC yield labels
                    if any(keyword in cell_text for keyword in ['sec yield', '30 day', 'standardized yield']):
                        # Check adjacent cells for the value
                        if i + 1 < len(cells):
                            next_cell = cells[i + 1]
                            next_text = next_cell.get_text().strip()
                            matches = re.findall(r'(\d+\.?\d*%?)', next_text)
                            for match in matches:
                                try:
                                    clean_match = re.sub(r'[^\d.]', '', match)
                                    if clean_match:
                                        value = float(clean_match)
                                        if 0.01 <= value <= 20.0:
                                            self._log(f"Found SEC yield in table: {value}% (labeled as: {cell_text})")
                                            return value
                                except (ValueError, TypeError):
                                    continue
                                    
        # Strategy 3: Look for specific selectors with yield context
        yield_selectors = [
            "[data-testid*='yield']",
            "[data-testid*='sec']",
            ".yield",
            ".sec-yield",
            "[class*='yield']",
            "[class*='sec']"
        ]
        
        for selector in yield_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text().strip()
                # Look for percentage values
                matches = re.findall(r'(\d+\.?\d*%?)', text)
                for match in matches:
                    try:
                        clean_match = re.sub(r'[^\d.]', '', match)
                        if clean_match:
                            value = float(clean_match)
                            if 0.01 <= value <= 20.0:
                                # Check if this looks like a yield (has yield keywords nearby)
                                parent_text = element.parent.get_text().lower() if element.parent else ""
                                if any(keyword in parent_text for keyword in ['yield', 'sec', 'distribution']):
                                    self._log(f"Found SEC yield via selector: {value}% (selector: {selector})")
                                    return value
                    except (ValueError, TypeError):
                        continue
                        
        # Strategy 4: Generic table cells (LOWEST PRIORITY)
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                for cell in cells:
                    text = cell.get_text().strip()
                    # Look for percentage values
                    matches = re.findall(r'(\d+\.?\d*%?)', text)
                    for match in matches:
                        try:
                            clean_match = re.sub(r'[^\d.]', '', match)
                            if clean_match:
                                value = float(clean_match)
                                if 0.01 <= value <= 20.0:
                                    # Check if this looks like a yield (has yield keywords nearby)
                                    parent_text = cell.parent.get_text().lower() if cell.parent else ""
                                    if any(keyword in parent_text for keyword in ['yield', 'sec', 'distribution']):
                                        self._log(f"Found SEC yield via generic table cell: {value}%")
                                        return value
                        except (ValueError, TypeError):
                            continue
                        
        return None
        
    def _extract_expense_ratio(self, soup: BeautifulSoup) -> Optional[float]:
        """Extract expense ratio"""
        
        patterns = [
            r"expense ratio[:\s-]*(\d+\.?\d*%?)",
            r"management fee[:\s-]*(\d+\.?\d*%?)",
            r"total expense[:\s-]*(\d+\.?\d*%?)",
            r"annual fee[:\s-]*(\d+\.?\d*%?)"
        ]
        
        text_content = soup.get_text().lower()
        
        for pattern in patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            for match in matches:
                try:
                    clean_match = re.sub(r'[^\d.]', '', match)
                    if clean_match:
                        value = float(clean_match)
                        if 0.01 <= value <= 5.0:  # Reasonable range
                            return value
                except (ValueError, TypeError):
                    continue
                    
        return None
        
    def _extract_net_assets(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract net assets"""
        
        patterns = [
            r"net assets[:\s-]*\$?([\d.,]+[kmbt]?)",
            r"aum[:\s-]*\$?([\d.,]+[kmbt]?)",
            r"total assets[:\s-]*\$?([\d.,]+[kmbt]?)",
            r"assets under management[:\s-]*\$?([\d.,]+[kmbt]?)"
        ]
        
        text_content = soup.get_text().lower()
        
        for pattern in patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            for match in matches:
                if match.strip():
                    return match.strip()
                    
        return None
        
    def _extract_price(self, soup: BeautifulSoup) -> Optional[float]:
        """Extract current price"""
        
        price_selectors = [
            "[data-testid*='price']",
            ".price",
            ".last-price",
            "[class*='price']",
            "td",
            "th"
        ]
        
        for selector in price_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text().strip()
                # Look for price patterns
                matches = re.findall(r'\$?(\d+\.?\d*)', text)
                for match in matches:
                    try:
                        value = float(match)
                        if 1.0 <= value <= 1000.0:  # Reasonable range
                            # Check if this looks like a price ($ symbol or price keywords)
                            if '$' in text or any(keyword in text.lower() for keyword in ['price', 'last', 'nav']):
                                return value
                    except (ValueError, TypeError):
                        continue
                        
        return None

    def extract_multiple_funds(self, tickers: List[str]) -> List[Dict[str, any]]:
        """Extract data for multiple fund tickers"""
        
        results = []
        
        for i, ticker in enumerate(tickers):
            self._log(f"Processing {i+1}/{len(tickers)}: {ticker}")
            
            # Extract data for this ticker
            result = self.extract_fund_data(ticker)
            results.append(result)
            
            # Add delay between requests to avoid rate limiting
            if i < len(tickers) - 1:  # Don't delay after the last ticker
                time.sleep(2)  # 2 second delay between requests
                
        return results

def main():
    """Test the Schwab extractor"""
    
    print("🔍 Testing Schwab ETF Extractor with Iframe Support")
    print("=" * 60)
    
    extractor = SchwabETFExtractor(debug=True)
    
    # Test with JMST ticker
    ticker = "JMST"
    print(f"\n📊 Extracting data for {ticker}...")
    
    result = extractor.extract_fund_data(ticker)
    
    print(f"\n✅ Results for {ticker}:")
    print(json.dumps(result, indent=2))
    
    # Test with another ticker
    ticker2 = "SPY"
    print(f"\n📊 Extracting data for {ticker2}...")
    
    result2 = extractor.extract_fund_data(ticker2)
    
    print(f"\n✅ Results for {ticker2}:")
    print(json.dumps(result2, indent=2))

if __name__ == "__main__":
    main() 