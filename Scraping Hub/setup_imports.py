"""
Setup imports for scraping_hub framework

Import this file at the top of any new scraper files to enable scraping_hub imports:

    from setup_imports import *
    from scraping_hub import BaseExtractor, BaseTransformer, BaseLoader
"""

import sys
import os
from pathlib import Path

# Add the scraping hub to Python path
parent_dir = Path(__file__).parent.parent
scraping_hub_path = parent_dir / "Scraping Hub"

if str(scraping_hub_path) not in sys.path:
    sys.path.insert(0, str(scraping_hub_path))

# Verify the path exists
if not scraping_hub_path.exists():
    raise ImportError(f"Scraping Hub not found at: {scraping_hub_path}")

print(f"✓ Scraping Hub framework available from: {scraping_hub_path}") 