"""
Scraping Hub - Modern ETL Web Scraping Framework

A comprehensive Python framework for building robust, scalable web scraping pipelines
using modern anti-detection techniques and ETL architecture principles.

Key Features:
- ETL Pattern: Clean separation of Extract, Transform, Load phases
- Anti-Detection: TLS fingerprinting and browser stealth techniques  
- Multiple Methods: API requests with curl_cffi and browser automation with nodriver
- Data Validation: Pydantic models for consistent data structures
- Error Handling: Comprehensive exception hierarchy with retry logic
- Performance: Async operations with configurable concurrency
- Storage: Multiple output formats (JSON, CSV, SQLite, PostgreSQL)

Quick Start:
    from scraping_hub import create_scraper
    from scraping_hub.core import ExtractorConfig, TransformerConfig, LoaderConfig
    
    # Create configurations
    extractor_config = ExtractorConfig(max_retries=3, delay_between_requests=2.0)
    transformer_config = TransformerConfig(clean_html=True, validate_data=True)
    loader_config = LoaderConfig(output_format='json', batch_size=100)
    
    # Initialize scraper components
    scraper = create_scraper(extractor_config, transformer_config, loader_config)
    
    # Run scraping pipeline
    results = await scraper.scrape_urls(['https://example.com'])

Core Components:
- BaseExtractor: Abstract base for data extraction
- BaseTransformer: Abstract base for data transformation  
- BaseLoader: Abstract base for data loading
- ScrapingResponse: Standard response model
- ScrapedItem: Standard data item model
- Exception hierarchy: Comprehensive error handling
"""

__version__ = "1.0.0"
__author__ = "Scraping Hub Team"

# Core ETL Components
from .core.extractor import BaseExtractor, create_default_config as create_extractor_config
from .core.transformer import BaseTransformer, create_default_transformer_config
from .core.loader import BaseLoader, create_default_loader_config, create_loader

# Data Models
from .core.models import (
    ScrapingResponse,
    ScrapedItem,
    SessionInfo,
    ExtractorConfig,
    TransformerConfig,
    LoaderConfig,
    ScrapingJob,
    ScrapingMethod,
    DataStatus
)

# Exception Classes
from .core.exceptions import (
    ScrapingError,
    NetworkError,
    ParsingError,
    BrowserError,
    HTTPError,
    ConnectionTimeout,
    ProxyError,
    InvalidHTML,
    MissingSelector,
    DataValidationError,
    ElementNotFound,
    PageLoadTimeout,
    JavaScriptError
)

# Public API
__all__ = [
    # Core Classes
    'BaseExtractor',
    'BaseTransformer', 
    'BaseLoader',
    
    # Data Models
    'ScrapingResponse',
    'ScrapedItem',
    'SessionInfo',
    'ExtractorConfig',
    'TransformerConfig',
    'LoaderConfig',
    'ScrapingJob',
    'ScrapingMethod',
    'DataStatus',
    
    # Exceptions
    'ScrapingError',
    'NetworkError',
    'ParsingError',
    'BrowserError',
    'HTTPError',
    'ConnectionTimeout',
    'ProxyError',
    'InvalidHTML',
    'MissingSelector',
    'DataValidationError',
    'ElementNotFound',
    'PageLoadTimeout',
    'JavaScriptError',
    
    # Utility Functions
    'create_extractor_config',
    'create_default_transformer_config',
    'create_default_loader_config',
    'create_loader',
] 