PROJECT CONTEXT:
I'm building an automated land development prospecting system. The goal is to automatically collect sold land listings from Redfin, calculate fair market values by size and location, and identify underpriced new listings.
TECHNICAL STACK:

N8N for workflow automation
Playwright for browser automation
Node.js environment
CSV data processing

PROJECT REQUIREMENTS:

Use Redfin's download feature (not scraping) to get sold land data
Filter by size ranges: 0-0.25, 0.25-0.5, 0.5-1, 1-3, 3-5, 5+ acres
Apply price filter ≤$190k for lots under 1 acre (to exclude mislabeled houses)
Download data systematically by ZIP code and size range (max 300 listings per download)
Process CSV files to calculate $/acre values
Generate median $/acre matrix by ZIP code and size range
Monitor new listings and compare against fair value benchmarks

REDFIN FILTERS NEEDED:

Property Type: Land
Sold Date: Last 12 months
Lot Size: Variable ranges
Price: ≤$190k for smaller lots
Location: County-specific

DATA PROCESSING:

Calculate price per acre (price ÷ (lot_size_sqft ÷ 43,560))
Categorize by size ranges
Generate median values by ZIP + size category
Create comparison algorithms for new listings


