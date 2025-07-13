"""
Example: How to use the Scraping Hub Framework

This file demonstrates how to connect to and use the scraping hub
framework you just created. This is what you'll do for each new
scraping project.
"""

# Step 1: Import from your scraping hub
from scraping_hub import (
    BaseExtractor, 
    BaseTransformer, 
    BaseLoader,
    ScrapingResponse, 
    ScrapedItem,
    ScrapingMethod,
    create_extractor_config,
    create_default_transformer_config, 
    create_default_loader_config,
    JSONLoader
)
from scraping_hub.core.exceptions import HTTPError, ParsingError

# Step 2: Create your specific extractor
class MyWebsiteExtractor(BaseExtractor):
    """
    This is YOUR custom extractor for YOUR specific website.
    You only write the parts specific to your target site.
    """
    
    def get_method(self) -> ScrapingMethod:
        return ScrapingMethod.API  # or BROWSER
    
    async def setup_session(self) -> None:
        """Setup your HTTP client or browser"""
        # For curl_cffi (when you install it):
        # import curl_cffi.requests as requests
        # self._active_sessions['main'] = requests.Session()
        
        # For now, using requests as example:
        import requests
        self._active_sessions['main'] = requests.Session()
        
        # Add headers, cookies, etc.
        self._active_sessions['main'].headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    async def _make_request(self, url: str, **kwargs) -> ScrapingResponse:
        """Make the actual request - this is the only part you customize"""
        session = self._active_sessions['main']
        
        try:
            response = session.get(url, timeout=30)
            response.raise_for_status()
            
            return ScrapingResponse(
                url=url,
                status_code=response.status_code,
                content=response.text,
                headers=dict(response.headers),
                method=self.get_method(),
                response_time=1.0  # You can measure actual time
            )
            
        except Exception as e:
            raise HTTPError(f"Request failed: {str(e)}", url=url)
    
    def _close_session(self, session_key: str, session) -> None:
        """Clean up session"""
        session.close()


# Step 3: Create your specific transformer  
class MyWebsiteTransformer(BaseTransformer):
    """
    This transforms the raw HTML/data into structured data.
    You only write the parsing logic specific to your site.
    """
    
    def _get_item_model(self):
        """Return None for now, or create a Pydantic model"""
        return None
    
    async def _parse_content(self, response: ScrapingResponse) -> list[dict]:
        """Parse the response and extract data"""
        from selectolax.parser import HTMLParser
        
        try:
            # Parse HTML
            parser = HTMLParser(response.content)
            
            # Extract data (customize this for your site)
            items = []
            
            # Example: Extract title from page
            title_element = parser.css_first('title')
            if title_element:
                items.append({
                    'title': title_element.text(),
                    'url': str(response.url),
                    'scraped_at': response.timestamp.isoformat()
                })
            
            return items
            
        except Exception as e:
            raise ParsingError(f"Failed to parse content: {str(e)}")


# Step 4: Use everything together
async def main():
    """
    This is your main scraping function.
    The framework handles all the complex stuff, you just use it.
    """
    
    # Configure the components (the framework provides defaults)
    extractor_config = create_extractor_config(
        max_retries=3,
        delay_between_requests=2.0,
        timeout_seconds=30.0
    )
    
    transformer_config = create_default_transformer_config(
        clean_html=True,
        validate_data=True
    )
    
    loader_config = create_default_loader_config(
        output_format='json',
        output_path='./output'
    )
    
    # Create your components
    extractor = MyWebsiteExtractor(extractor_config)
    transformer = MyWebsiteTransformer(transformer_config) 
    loader = JSONLoader(loader_config)
    
    # URLs to scrape
    urls = [
        'https://httpbin.org/html',  # Test URL
        'https://example.com',       # Another test URL
    ]
    
    print("🚀 Starting scraping...")
    
    try:
        # The ETL Pipeline - Extract, Transform, Load
        for url in urls:
            print(f"📥 Extracting: {url}")
            
            # Extract (framework handles retries, rate limiting, etc.)
            response = await extractor.extract_data(url)
            
            print(f"✅ Got response: {response.status_code}")
            
            # Transform (framework handles errors, validation, etc.)
            items = await transformer.transform(response)
            
            print(f"🔄 Transformed {len(items)} items")
            
            # Load (framework handles batching, deduplication, etc.)
            if items:
                await loader.load(items, f"data_{url.split('/')[-1]}.json")
                print(f"💾 Saved to file")
    
    finally:
        # Cleanup (framework handles this automatically)
        extractor.cleanup()
        print("🧹 Cleanup completed")


# Step 5: Run it
if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 