"""
Pydantic models for JP Morgan Asset Management fund data validation.
Following ETL architecture patterns with strict data validation.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from decimal import Decimal
import re


class FundModel(BaseModel):
    """Main fund data model with comprehensive validation."""
    
    ticker: str = Field(..., description="Fund ticker symbol")
    cusip: str = Field(..., description="CUSIP identifier")
    sec_yield_30_day: Optional[Decimal] = Field(None, description="30 Day SEC Yield")
    sec_yield_30_day_unsubsidized: Optional[Decimal] = Field(None, description="30 Day SEC Yield Unsubsidized")
    fund_name: Optional[str] = Field(None, description="Full fund name")
    url: str = Field(..., description="Source URL")
    scraped_at: str = Field(..., description="Timestamp when data was scraped")
    
    @validator('ticker')
    def validate_ticker(cls, v):
        """Validate ticker format."""
        if not v or len(v) < 2:
            raise ValueError('Ticker must be at least 2 characters')
        return v.upper().strip()
    
    @validator('cusip')
    def validate_cusip(cls, v):
        """Validate CUSIP format (9 characters)."""
        cusip_clean = re.sub(r'[^A-Z0-9]', '', v.upper())
        if len(cusip_clean) != 9:
            raise ValueError('CUSIP must be exactly 9 alphanumeric characters')
        return cusip_clean
    
    @validator('sec_yield_30_day', 'sec_yield_30_day_unsubsidized', pre=True)
    def validate_yield(cls, v):
        """Convert yield strings to Decimal, handle percentage formats."""
        if v is None or v == '' or v == 'N/A':
            return None
        
        # Handle string input
        if isinstance(v, str):
            # Remove percentage sign and spaces
            v = v.replace('%', '').replace(' ', '').replace(',', '')
            if v == '' or v.lower() in ['n/a', 'na', '--', '-']:
                return None
            try:
                return Decimal(v)
            except:
                return None
        
        # Handle numeric input
        try:
            return Decimal(str(v))
        except:
            return None
    
    class Config:
        """Pydantic configuration."""
        json_encoders = {
            Decimal: lambda v: float(v) if v is not None else None
        }


class ScrapingResult(BaseModel):
    """Model for tracking scraping operation results."""
    
    url: str
    success: bool
    data: Optional[FundModel] = None
    error: Optional[str] = None
    method_used: str  # 'requests' or 'nodriver'
    response_time: float
    scraped_at: str
    
    class Config:
        """Pydantic configuration."""
        arbitrary_types_allowed = True


class DailyReport(BaseModel):
    """Model for daily scraping summary report."""
    
    date: str
    total_funds: int
    successful_scrapes: int
    failed_scrapes: int
    new_funds: int
    updated_funds: int
    unchanged_funds: int
    errors: Dict[str, int]  # error_type -> count
    execution_time: float
    output_file: str
    backup_file: Optional[str] = None 