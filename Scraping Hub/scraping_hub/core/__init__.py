"""
Core ETL Components for Scraping Hub

This package contains the foundational classes and utilities that implement
the ETL (Extract, Transform, Load) pattern for web scraping operations.

Components:
- extractor: Abstract base class for data extraction
- transformer: Abstract base class for data transformation
- loader: Abstract base class for data loading
- models: Pydantic data models for type safety and validation
- exceptions: Custom exception hierarchy for error handling

All concrete implementations should inherit from these base classes
to ensure consistent behavior across the scraping framework.
"""

from .extractor import BaseExtractor, create_default_config
from .transformer import BaseTransformer, create_default_transformer_config
from .loader import BaseLoader, create_default_loader_config, create_loader
from .models import *
from .exceptions import *

__all__ = [
    'BaseExtractor',
    'BaseTransformer', 
    'BaseLoader',
    'create_default_config',
    'create_default_transformer_config',
    'create_default_loader_config',
    'create_loader'
] 