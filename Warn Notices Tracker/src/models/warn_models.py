"""
Pydantic models for WARN (Worker Adjustment and Retraining Notification) data.

These models are designed to be state-agnostic and handle variations in data
structure across different state Department of Labor websites.
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator


class LayoffType(str, Enum):
    """Type of layoff/closure"""
    PERMANENT = "permanent"
    TEMPORARY = "temporary"
    CLOSURE = "closure"
    UNKNOWN = "unknown"


class WarnNoticeStatus(str, Enum):
    """Status of the WARN notice"""
    ACTIVE = "active"
    COMPLETED = "completed"
    AMENDED = "amended"
    CANCELLED = "cancelled"
    UNKNOWN = "unknown"


class WarnNotice(BaseModel):
    """
    Standardized WARN notice model that can accommodate data from all states.
    
    Core fields that should be present in most states, with optional fields
    for state-specific variations.
    """
    
    # Core identification fields
    state: str = Field(..., description="Two-letter state code (e.g., 'NY', 'CA')")
    notice_id: Optional[str] = Field(None, description="State-specific notice identifier")
    
    # Company information
    company_name: str = Field(..., description="Name of the company/employer")
    company_address: Optional[str] = Field(None, description="Company address")
    parent_company: Optional[str] = Field(None, description="Parent company name if applicable")
    
    # Location information
    location_city: Optional[str] = Field(None, description="City where layoffs occur")
    location_county: Optional[str] = Field(None, description="County where layoffs occur")
    location_address: Optional[str] = Field(None, description="Full address of affected location")
    
    # Geographic/administrative regions
    wdb_region: Optional[str] = Field(None, description="Workforce Development Board region")
    economic_region: Optional[str] = Field(None, description="Economic development region")
    
    # Dates
    warn_date: Optional[date] = Field(None, description="Date WARN notice was filed")
    notice_date: Optional[date] = Field(None, description="Date notice was given to workers")
    effective_date: Optional[date] = Field(None, description="Date layoffs become effective")
    received_date: Optional[date] = Field(None, description="Date state received the notice")
    
    # Employment details
    employees_affected: Optional[int] = Field(None, description="Total number of affected employees")
    employees_warned: Optional[int] = Field(None, description="Number of employees warned")
    temporary_layoffs: Optional[int] = Field(None, description="Number of temporary layoffs")
    permanent_layoffs: Optional[int] = Field(None, description="Number of permanent layoffs")
    
    # Layoff details
    layoff_type: LayoffType = Field(LayoffType.UNKNOWN, description="Type of layoff")
    closure_type: Optional[str] = Field(None, description="Type of closure (partial/full)")
    reason: Optional[str] = Field(None, description="Reason for layoffs")
    
    # Industry classification
    industry: Optional[str] = Field(None, description="Industry classification")
    naics_code: Optional[str] = Field(None, description="NAICS industry code")
    sic_code: Optional[str] = Field(None, description="SIC industry code")
    
    # Contact information
    contact_name: Optional[str] = Field(None, description="Contact person name")
    contact_title: Optional[str] = Field(None, description="Contact person title")
    contact_phone: Optional[str] = Field(None, description="Contact phone number")
    contact_email: Optional[str] = Field(None, description="Contact email address")
    
    # Status and metadata
    status: WarnNoticeStatus = Field(WarnNoticeStatus.UNKNOWN, description="Status of the notice")
    is_amended: bool = Field(False, description="Whether this notice has been amended")
    amendment_details: Optional[str] = Field(None, description="Details of amendments")
    
    # State-specific fields (flexible storage)
    state_specific_data: Dict[str, Any] = Field(default_factory=dict, description="State-specific additional data")
    
    # Data source metadata
    source_url: Optional[str] = Field(None, description="URL where data was scraped from")
    scraped_at: datetime = Field(default_factory=datetime.now, description="When this data was scraped")
    last_updated: Optional[datetime] = Field(None, description="When this record was last updated")
    data_source: str = Field("web_scraping", description="Source of the data")
    
    class Config:
        """Pydantic configuration"""
        use_enum_values = True
        validate_assignment = True
        json_encoders = {
            date: lambda v: v.isoformat() if v else None,
            datetime: lambda v: v.isoformat() if v else None,
        }
    
    @field_validator('state')
    @classmethod
    def validate_state(cls, v):
        """Ensure state is uppercase and 2 characters"""
        if v:
            v = v.upper().strip()
            if len(v) != 2:
                raise ValueError("State must be 2-character code")
        return v
    
    @field_validator('employees_affected', 'employees_warned', 'temporary_layoffs', 'permanent_layoffs')
    @classmethod
    def validate_employee_counts(cls, v):
        """Ensure employee counts are non-negative"""
        if v is not None and v < 0:
            raise ValueError("Employee counts must be non-negative")
        return v
    
    @model_validator(mode='before')
    @classmethod
    def validate_dates(cls, values):
        """Ensure date logical consistency"""
        if isinstance(values, dict):
            warn_date = values.get('warn_date')
            effective_date = values.get('effective_date')
            notice_date = values.get('notice_date')
            
            # WARN date should be before or same as effective date
            if warn_date and effective_date and warn_date > effective_date:
                # Log warning but don't fail validation
                pass
                
        return values
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with ISO date formatting"""
        return self.dict()
    
    def get_unique_key(self) -> str:
        """Generate a unique key for deduplication"""
        key_parts = [
            self.state,
            self.company_name,
            str(self.warn_date) if self.warn_date else "",
            str(self.effective_date) if self.effective_date else "",
            str(self.employees_affected) if self.employees_affected else ""
        ]
        return "|".join(key_parts).lower()


class WarnSummary(BaseModel):
    """
    Summary statistics for a collection of WARN notices
    """
    
    state: str = Field(..., description="State code")
    total_notices: int = Field(..., description="Total number of notices")
    total_employees_affected: int = Field(..., description="Total employees affected")
    
    date_range_start: Optional[date] = Field(None, description="Earliest WARN date in dataset")
    date_range_end: Optional[date] = Field(None, description="Latest WARN date in dataset")
    
    top_industries: List[Dict[str, Any]] = Field(default_factory=list, description="Top industries by notices")
    top_companies: List[Dict[str, Any]] = Field(default_factory=list, description="Top companies by employees affected")
    top_regions: List[Dict[str, Any]] = Field(default_factory=list, description="Top regions by notices")
    
    layoff_type_breakdown: Dict[str, int] = Field(default_factory=dict, description="Breakdown by layoff type")
    monthly_trends: List[Dict[str, Any]] = Field(default_factory=list, description="Monthly trends")
    
    generated_at: datetime = Field(default_factory=datetime.now, description="When summary was generated")
    
    class Config:
        """Pydantic configuration"""
        json_encoders = {
            date: lambda v: v.isoformat() if v else None,
            datetime: lambda v: v.isoformat() if v else None,
        }


class StateConfig(BaseModel):
    """
    Configuration for each state's WARN data source
    """
    
    state_code: str = Field(..., description="Two-letter state code")
    state_name: str = Field(..., description="Full state name")
    source_type: str = Field(..., description="Type of data source (tableau, api, html, etc.)")
    base_url: str = Field(..., description="Base URL for the state's WARN data")
    
    # Tableau-specific configuration
    tableau_workbook: Optional[str] = Field(None, description="Tableau workbook identifier")
    tableau_view: Optional[str] = Field(None, description="Tableau view identifier")
    
    # API-specific configuration
    api_endpoint: Optional[str] = Field(None, description="API endpoint for direct data access")
    api_key_required: bool = Field(False, description="Whether API key is required")
    
    # HTML scraping configuration
    list_page_url: Optional[str] = Field(None, description="URL for notices list page")
    detail_page_pattern: Optional[str] = Field(None, description="URL pattern for detail pages")
    
    # Data mapping configuration
    field_mappings: Dict[str, str] = Field(default_factory=dict, description="Mapping of source fields to standard fields")
    date_formats: List[str] = Field(default_factory=list, description="Expected date formats")
    
    # Update frequency and metadata
    update_frequency: str = Field("daily", description="How often data is updated")
    last_successful_scrape: Optional[datetime] = Field(None, description="Last successful scrape timestamp")
    is_active: bool = Field(True, description="Whether this state is actively being scraped")
    
    class Config:
        """Pydantic configuration"""
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
        } 