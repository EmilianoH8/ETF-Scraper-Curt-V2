"""
Fund data transformer for JP Morgan Asset Management scraper.
Implements ETL transformation pattern with data cleaning and validation.
"""

from typing import List, Optional, Dict, Any
from loguru import logger
import re
from decimal import Decimal, InvalidOperation

from ..models.fund_models import FundModel, ScrapingResult


class FundTransformer:
    """Transformer for cleaning and validating fund data."""
    
    def __init__(self):
        """Initialize transformer."""
        pass
    
    def transform(self, raw_data: Dict[str, Any]) -> Optional[FundModel]:
        """
        Transform and clean raw fund data into validated FundModel.
        
        Args:
            raw_data: Raw scraped data dictionary
            
        Returns:
            FundModel instance or None if validation fails
        """
        try:
            # Clean and normalize data
            cleaned_data = self._clean_data(raw_data)
            
            # Validate and create FundModel
            fund_model = FundModel(**cleaned_data)
            
            logger.debug(f"Successfully transformed data for {fund_model.ticker}")
            return fund_model
            
        except Exception as e:
            logger.error(f"Transformation failed for data {raw_data}: {str(e)}")
            return None
    
    def _clean_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and normalize raw scraped data."""
        cleaned = {}
        
        # Copy required fields
        for field in ['url', 'scraped_at']:
            if field in raw_data:
                cleaned[field] = raw_data[field]
        
        # Clean ticker
        if 'ticker' in raw_data and raw_data['ticker']:
            cleaned['ticker'] = self._clean_ticker(raw_data['ticker'])
        
        # Clean CUSIP
        if 'cusip' in raw_data and raw_data['cusip']:
            cleaned['cusip'] = self._clean_cusip(raw_data['cusip'])
        
        # Clean fund name
        if 'fund_name' in raw_data and raw_data['fund_name']:
            cleaned['fund_name'] = self._clean_fund_name(raw_data['fund_name'])
        
        # Clean yields
        for yield_field in ['sec_yield_30_day', 'sec_yield_30_day_unsubsidized']:
            if yield_field in raw_data and raw_data[yield_field]:
                cleaned_yield = self._clean_yield(raw_data[yield_field])
                if cleaned_yield is not None:
                    cleaned[yield_field] = cleaned_yield
        
        logger.debug(f"Cleaned data: {cleaned}")
        return cleaned
    
    def _clean_ticker(self, ticker: str) -> str:
        """Clean and normalize ticker symbol."""
        if not ticker:
            raise ValueError("Ticker cannot be empty")
        
        # Remove common prefixes/suffixes and clean
        ticker = str(ticker).strip().upper()
        
        # Remove common patterns
        ticker = re.sub(r'\s*\(.*?\)\s*', '', ticker)  # Remove parentheses content
        ticker = re.sub(r'\s*-\s*ETF\s*$', '', ticker)  # Remove ETF suffix
        ticker = re.sub(r'\s+', '', ticker)  # Remove spaces
        
        # Keep only alphanumeric characters
        ticker = re.sub(r'[^A-Z0-9]', '', ticker)
        
        if len(ticker) < 1:
            raise ValueError("Ticker too short after cleaning")
        
        return ticker
    
    def _clean_cusip(self, cusip: str) -> str:
        """Clean and normalize CUSIP identifier."""
        if not cusip:
            raise ValueError("CUSIP cannot be empty")
        
        # Clean CUSIP - keep only alphanumeric
        cusip = str(cusip).strip().upper()
        cusip = re.sub(r'[^A-Z0-9]', '', cusip)
        
        if len(cusip) != 9:
            raise ValueError(f"CUSIP must be exactly 9 characters, got {len(cusip)}: {cusip}")
        
        return cusip
    
    def _clean_fund_name(self, name: str) -> str:
        """Clean and normalize fund name."""
        if not name:
            return ""
        
        name = str(name).strip()
        
        # Remove common unwanted text
        patterns_to_remove = [
            r'\s*\|\s*JPMorgan.*',  # Remove JPMorgan suffix
            r'\s*-\s*ETF\s*$',      # Remove ETF suffix
            r'\s*\(.*?\)\s*',       # Remove parentheses content
        ]
        
        for pattern in patterns_to_remove:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        
        # Normalize whitespace
        name = re.sub(r'\s+', ' ', name).strip()
        
        return name
    
    def _clean_yield(self, yield_str: str) -> Optional[Decimal]:
        """Clean and convert yield string to Decimal."""
        if not yield_str:
            return None
        
        yield_str = str(yield_str).strip()
        
        # Handle N/A cases
        if yield_str.upper() in ['N/A', 'NA', '--', '-', '']:
            return None
        
        # Remove percentage sign, spaces, commas
        yield_str = yield_str.replace('%', '').replace(' ', '').replace(',', '')
        
        # Handle parentheses for negative values
        is_negative = False
        if yield_str.startswith('(') and yield_str.endswith(')'):
            is_negative = True
            yield_str = yield_str[1:-1]
        
        # Extract numeric value
        match = re.search(r'[-+]?\d*\.?\d+', yield_str)
        if not match:
            logger.warning(f"Could not extract numeric value from yield: {yield_str}")
            return None
        
        try:
            value = Decimal(match.group())
            if is_negative:
                value = -value
            return value
        except (InvalidOperation, ValueError) as e:
            logger.warning(f"Could not convert yield to decimal: {yield_str}, error: {e}")
            return None
    
    def transform_batch(self, scraped_results: List[ScrapingResult]) -> List[FundModel]:
        """
        Transform a batch of scraping results into validated fund models.
        
        Args:
            scraped_results: List of ScrapingResult objects
            
        Returns:
            List of successfully transformed FundModel objects
        """
        transformed_funds = []
        errors = []
        
        for result in scraped_results:
            if not result.success or not result.data:
                errors.append(f"Skipping failed scrape: {result.url} - {result.error}")
                continue
            
            # Data is already a FundModel from the extractor
            if isinstance(result.data, FundModel):
                transformed_funds.append(result.data)
            else:
                # Transform raw data if needed
                fund_model = self.transform(result.data)
                if fund_model:
                    transformed_funds.append(fund_model)
                else:
                    errors.append(f"Transformation failed for {result.url}")
        
        logger.info(f"Transformed {len(transformed_funds)} funds successfully, {len(errors)} errors")
        if errors:
            for error in errors:
                logger.warning(error)
        
        return transformed_funds
    
    def validate_data_quality(self, funds: List[FundModel]) -> Dict[str, Any]:
        """
        Analyze data quality of transformed funds.
        
        Args:
            funds: List of FundModel objects
            
        Returns:
            Dictionary with data quality metrics
        """
        if not funds:
            return {'total': 0, 'quality_score': 0}
        
        total = len(funds)
        
        # Count completeness
        complete_tickers = sum(1 for f in funds if f.ticker)
        complete_cusips = sum(1 for f in funds if f.cusip)
        complete_yields = sum(1 for f in funds if f.sec_yield_30_day is not None)
        complete_unsubsidized = sum(1 for f in funds if f.sec_yield_30_day_unsubsidized is not None)
        complete_names = sum(1 for f in funds if f.fund_name)
        
        # Calculate quality score (0-100)
        required_fields_score = ((complete_tickers + complete_cusips) / (total * 2)) * 60
        optional_fields_score = ((complete_yields + complete_unsubsidized + complete_names) / (total * 3)) * 40
        quality_score = required_fields_score + optional_fields_score
        
        quality_report = {
            'total': total,
            'completeness': {
                'ticker': f"{complete_tickers}/{total} ({complete_tickers/total*100:.1f}%)",
                'cusip': f"{complete_cusips}/{total} ({complete_cusips/total*100:.1f}%)",
                'sec_yield_30_day': f"{complete_yields}/{total} ({complete_yields/total*100:.1f}%)",
                'sec_yield_30_day_unsubsidized': f"{complete_unsubsidized}/{total} ({complete_unsubsidized/total*100:.1f}%)",
                'fund_name': f"{complete_names}/{total} ({complete_names/total*100:.1f}%)"
            },
            'quality_score': round(quality_score, 1)
        }
        
        logger.info(f"Data quality analysis: {quality_report}")
        return quality_report 