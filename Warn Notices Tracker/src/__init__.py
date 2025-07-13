"""
WARN Notices Tracker - Multi-State Scraping Framework

A scalable framework for scraping Worker Adjustment and Retraining Notification (WARN) 
data from various state Department of Labor websites.

Currently supported states:
- New York (NY) - Tableau dashboard
"""

__version__ = "1.0.0"
__author__ = "WARN Tracker"

from .models.warn_models import WarnNotice, WarnSummary
from .extractors.state_extractor_factory import StateExtractorFactory
from .transformers.warn_transformer import WarnTransformer
from .loaders.warn_loader import WarnLoader

__all__ = [
    "WarnNotice",
    "WarnSummary", 
    "StateExtractorFactory",
    "WarnTransformer",
    "WarnLoader"
] 