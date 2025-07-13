"""
WARN data transformer for processing and standardizing WARN notices
from different state sources into a common format.
"""

from setup_imports import *
from scraping_hub import BaseTransformer
from typing import Dict, List, Any, Optional
from datetime import datetime, date
import re
from loguru import logger
from dateutil import parser

from ..models.warn_models import WarnNotice, LayoffType, WarnNoticeStatus


class WarnTransformer(BaseTransformer):
    """
    Transformer for standardizing WARN data from different state sources.
    
    Handles data cleaning, validation, and transformation into standardized
    WarnNotice models.
    """
    
    def __init__(self, **kwargs):
        """Initialize WARN transformer."""
        super().__init__(**kwargs)
        self.state_processors = {
            "NY": self._process_ny_data,
            # Add more states as they're implemented
            # "CA": self._process_ca_data,
            # "TX": self._process_tx_data,
        }
    
    def transform(self, raw_data: Dict[str, Any]) -> List[WarnNotice]:
        """
        Transform raw extraction data into standardized WarnNotice objects.
        
        Args:
            raw_data: Raw data from extractor
            
        Returns:
            List of validated WarnNotice objects
        """
        if not raw_data.get("success", False):
            logger.error(f"Cannot transform failed extraction: {raw_data.get('error', 'Unknown error')}")
            return []
        
        state = raw_data.get("state", "").upper()
        notices = raw_data.get("notices", [])
        
        if not state or not notices:
            logger.warning("No state or notices found in raw data")
            return []
        
        # Get state-specific processor
        processor = self.state_processors.get(state)
        if not processor:
            logger.error(f"No processor available for state: {state}")
            return []
        
        logger.info(f"Transforming {len(notices)} notices for {state}")
        
        # Process each notice
        processed_notices = []
        for notice_data in notices:
            try:
                processed_notice = processor(notice_data, raw_data)
                if processed_notice:
                    processed_notices.append(processed_notice)
            except Exception as e:
                logger.error(f"Failed to process notice: {e}")
                continue
        
        logger.info(f"✓ Successfully transformed {len(processed_notices)}/{len(notices)} notices")
        return processed_notices
    
    def _process_ny_data(self, notice_data: Dict[str, Any], context: Dict[str, Any]) -> Optional[WarnNotice]:
        """
        Process New York specific WARN notice data.
        
        Args:
            notice_data: Individual notice data from NY extractor
            context: Full extraction context
            
        Returns:
            WarnNotice object or None if processing fails
        """
        try:
            # Clean and extract fields from NY data structure
            # This needs to be customized based on actual NY data format
            
            warn_notice = WarnNotice(
                state="NY",
                notice_id=self._clean_string(notice_data.get("warn_number")),
                company_name=self._clean_string(notice_data.get("company_name", "")),
                company_address=self._clean_string(notice_data.get("company_address")),
                location_city=self._clean_string(notice_data.get("location_city")),
                location_county=self._clean_string(notice_data.get("location_county")),
                wdb_region=self._clean_string(notice_data.get("wdb_region")),
                warn_date=self._parse_date(notice_data.get("warn_date")),
                effective_date=self._parse_date(notice_data.get("effective_date")),
                notice_date=self._parse_date(notice_data.get("notice_date")),
                employees_affected=self._parse_int(notice_data.get("employees_affected")),
                employees_warned=self._parse_int(notice_data.get("employees_warned")),
                layoff_type=self._determine_layoff_type(notice_data.get("layoff_type")),
                reason=self._clean_string(notice_data.get("reason")),
                industry=self._clean_string(notice_data.get("industry")),
                contact_name=self._clean_string(notice_data.get("contact_name")),
                contact_phone=self._clean_phone(notice_data.get("contact_phone")),
                contact_email=self._clean_email(notice_data.get("contact_email")),
                source_url=context.get("source_url", "https://dol.ny.gov/warn-dashboard"),
                scraped_at=datetime.now(),
                data_source="tableau_dashboard"
            )
            
            return warn_notice
            
        except Exception as e:
            logger.error(f"Error processing NY notice: {e}")
            return None
    
    def _clean_string(self, value: Any) -> Optional[str]:
        """Clean and normalize string values."""
        if value is None:
            return None
        
        if not isinstance(value, str):
            value = str(value)
        
        # Remove extra whitespace and normalize
        cleaned = re.sub(r'\s+', ' ', value.strip())
        
        # Return None for empty strings
        return cleaned if cleaned else None
    
    def _parse_date(self, value: Any) -> Optional[date]:
        """Parse date from various formats."""
        if value is None:
            return None
        
        if isinstance(value, date):
            return value
        
        if isinstance(value, datetime):
            return value.date()
        
        if isinstance(value, str):
            try:
                # Try common date formats
                parsed_date = parser.parse(value, fuzzy=True)
                return parsed_date.date()
            except (ValueError, TypeError):
                logger.warning(f"Could not parse date: {value}")
                return None
        
        return None
    
    def _parse_int(self, value: Any) -> Optional[int]:
        """Parse integer values safely."""
        if value is None:
            return None
        
        if isinstance(value, int):
            return value
        
        if isinstance(value, str):
            # Remove commas and other formatting
            cleaned = re.sub(r'[,\s]', '', value.strip())
            try:
                return int(cleaned)
            except ValueError:
                logger.warning(f"Could not parse integer: {value}")
                return None
        
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    def _determine_layoff_type(self, value: Any) -> LayoffType:
        """Determine layoff type from various string formats."""
        if value is None:
            return LayoffType.UNKNOWN
        
        value_str = str(value).lower().strip()
        
        if "permanent" in value_str or "closure" in value_str:
            return LayoffType.PERMANENT
        elif "temporary" in value_str or "temp" in value_str:
            return LayoffType.TEMPORARY
        elif "closure" in value_str or "closing" in value_str:
            return LayoffType.CLOSURE
        else:
            return LayoffType.UNKNOWN
    
    def _clean_phone(self, value: Any) -> Optional[str]:
        """Clean and format phone numbers."""
        if value is None:
            return None
        
        # Extract digits only
        digits = re.sub(r'\D', '', str(value))
        
        if len(digits) == 10:
            # Format as (XXX) XXX-XXXX
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == '1':
            # Format as +1 (XXX) XXX-XXXX
            return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        elif digits:
            # Return as-is if valid but different format
            return digits
        
        return None
    
    def _clean_email(self, value: Any) -> Optional[str]:
        """Clean and validate email addresses."""
        if value is None:
            return None
        
        email = str(value).strip().lower()
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(email_pattern, email):
            return email
        
        return None
    
    def validate_item(self, item: WarnNotice) -> bool:
        """
        Validate a transformed WarnNotice item.
        
        Args:
            item: WarnNotice to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            # Check required fields
            if not item.state:
                logger.warning("Missing state")
                return False
            
            if not item.company_name:
                logger.warning("Missing company name")
                return False
            
            # Check data consistency
            if item.warn_date and item.effective_date:
                if item.warn_date > item.effective_date:
                    logger.warning(f"WARN date after effective date: {item.company_name}")
                    # Don't fail validation, just log warning
            
            # Check employee counts are reasonable
            if item.employees_affected and item.employees_affected < 0:
                logger.warning(f"Negative employee count: {item.company_name}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False
    
    def clean_text(self, text: str) -> str:
        """
        Clean text content for consistency.
        
        Args:
            text: Raw text to clean
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', text.strip())
        
        # Remove special characters that might cause issues
        cleaned = re.sub(r'[^\w\s\-\.,\(\)@]', '', cleaned)
        
        return cleaned
    
    def deduplicate(self, notices: List[WarnNotice]) -> List[WarnNotice]:
        """
        Remove duplicate notices based on unique keys.
        
        Args:
            notices: List of WarnNotice objects
            
        Returns:
            Deduplicated list
        """
        seen_keys = set()
        unique_notices = []
        
        for notice in notices:
            key = notice.get_unique_key()
            if key not in seen_keys:
                seen_keys.add(key)
                unique_notices.append(notice)
            else:
                logger.debug(f"Duplicate notice removed: {notice.company_name}")
        
        logger.info(f"Removed {len(notices) - len(unique_notices)} duplicates")
        return unique_notices
    
    def generate_summary(self, notices: List[WarnNotice]) -> Dict[str, Any]:
        """
        Generate summary statistics for the notices.
        
        Args:
            notices: List of processed notices
            
        Returns:
            Summary dictionary
        """
        if not notices:
            return {"total_notices": 0, "total_employees": 0}
        
        # Calculate basic stats
        total_employees = sum(
            notice.employees_affected or 0 
            for notice in notices
        )
        
        # Group by industry
        industry_counts = {}
        for notice in notices:
            industry = notice.industry or "Unknown"
            industry_counts[industry] = industry_counts.get(industry, 0) + 1
        
        # Group by region
        region_counts = {}
        for notice in notices:
            region = notice.wdb_region or "Unknown"
            region_counts[region] = region_counts.get(region, 0) + 1
        
        # Date range
        dates = [notice.warn_date for notice in notices if notice.warn_date]
        date_range = {
            "start": min(dates) if dates else None,
            "end": max(dates) if dates else None
        }
        
        return {
            "total_notices": len(notices),
            "total_employees_affected": total_employees,
            "date_range": date_range,
            "top_industries": sorted(industry_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            "top_regions": sorted(region_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            "generated_at": datetime.now().isoformat()
        } 