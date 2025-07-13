"""
Pydantic Data Models for Scraping Hub

This module defines standardized data models using Pydantic for consistent
data validation and serialization across the entire scraping hub. These models
serve as contracts between the Extract, Transform, and Load phases of the ETL pipeline.

Key Benefits:
- Automatic data validation and type checking
- Consistent JSON serialization/deserialization
- Clear data contracts between ETL components
- Runtime type safety and error detection
- Integration with IDE type hinting

Usage:
    # Define extracted data
    raw_data = ScrapingResponse(
        url="https://example.com",
        status_code=200,
        content="<html>...</html>",
        headers={"content-type": "text/html"}
    )
    
    # Define transformed item
    item = ScrapedItem(
        source_url="https://example.com",
        data={"title": "Example", "price": 29.99},
        extracted_at=datetime.utcnow()
    )
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl, validator
from pydantic.types import NonNegativeInt, PositiveFloat


class ScrapingMethod(str, Enum):
    """Enumeration of available scraping methods."""
    API = "api"
    BROWSER = "browser"
    HYBRID = "hybrid"


class DataStatus(str, Enum):
    """Status of scraped data processing."""
    RAW = "raw"
    PROCESSING = "processing"
    VALIDATED = "validated"
    TRANSFORMED = "transformed"
    LOADED = "loaded"
    FAILED = "failed"


class ScrapingResponse(BaseModel):
    """
    Standard response model for all extraction operations.
    
    This model represents the raw response from any scraping method,
    whether API-based or browser automation. It provides a consistent
    interface for the Transform phase to process data.
    
    Attributes:
        url: The URL that was scraped
        status_code: HTTP status code (200, 404, etc.)
        content: Raw response content (HTML, JSON string, etc.)
        headers: Response headers as key-value pairs
        method: Scraping method used (api, browser, hybrid)
        response_time: Time taken to complete the request in seconds
        metadata: Additional context about the scraping operation
    """
    
    url: HttpUrl = Field(..., description="URL that was scraped")
    status_code: NonNegativeInt = Field(..., description="HTTP status code")
    content: str = Field(..., description="Raw response content")
    headers: Dict[str, str] = Field(default_factory=dict, description="Response headers")
    method: ScrapingMethod = Field(..., description="Scraping method used")
    response_time: PositiveFloat = Field(..., description="Response time in seconds")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When response was captured")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            HttpUrl: str
        }
    
    @validator('content')
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Content cannot be empty')
        return v


class ScrapedItem(BaseModel):
    """
    Standard model for individual scraped data items.
    
    This represents a single piece of extracted and transformed data,
    regardless of the source or scraping method. All scraped items
    should conform to this structure for consistent processing.
    
    Attributes:
        source_url: Original URL where data was scraped from
        data: The actual scraped data as key-value pairs
        item_id: Unique identifier for this item (auto-generated)
        status: Current processing status of the item
        extracted_at: When the data was originally extracted
        transformed_at: When the data was transformed (if applicable)
        validation_errors: Any validation errors encountered
        metadata: Additional context about the item
    """
    
    source_url: HttpUrl = Field(..., description="Source URL of the data")
    data: Dict[str, Any] = Field(..., description="Scraped data as key-value pairs")
    item_id: Optional[str] = Field(None, description="Unique identifier for this item")
    status: DataStatus = Field(DataStatus.RAW, description="Processing status")
    extracted_at: datetime = Field(default_factory=datetime.utcnow, description="Extraction timestamp")
    transformed_at: Optional[datetime] = Field(None, description="Transformation timestamp")
    validation_errors: List[str] = Field(default_factory=list, description="Validation errors")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            HttpUrl: str
        }
    
    @validator('data')
    def data_not_empty(cls, v):
        if not v:
            raise ValueError('Data dictionary cannot be empty')
        return v
    
    def add_validation_error(self, error: str) -> None:
        """Add a validation error to the item."""
        self.validation_errors.append(error)
        self.status = DataStatus.FAILED
    
    def mark_transformed(self) -> None:
        """Mark the item as successfully transformed."""
        self.transformed_at = datetime.utcnow()
        self.status = DataStatus.TRANSFORMED


class SessionInfo(BaseModel):
    """
    Information about a scraping session.
    
    This model tracks session-level information for batch scraping operations,
    including authentication details, proxy settings, and performance metrics.
    
    Attributes:
        session_id: Unique identifier for the session
        start_time: When the session started
        end_time: When the session ended (if completed)
        user_agent: User agent string used
        proxy_url: Proxy server used (if any)
        cookies: Session cookies as key-value pairs
        requests_made: Total number of requests in this session
        success_rate: Percentage of successful requests
        avg_response_time: Average response time across all requests
        errors: List of errors encountered during the session
    """
    
    session_id: str = Field(..., description="Unique session identifier")
    start_time: datetime = Field(default_factory=datetime.utcnow, description="Session start time")
    end_time: Optional[datetime] = Field(None, description="Session end time")
    user_agent: str = Field(..., description="User agent string")
    proxy_url: Optional[str] = Field(None, description="Proxy server URL")
    cookies: Dict[str, str] = Field(default_factory=dict, description="Session cookies")
    requests_made: NonNegativeInt = Field(0, description="Total requests made")
    success_rate: float = Field(0.0, description="Success rate percentage")
    avg_response_time: float = Field(0.0, description="Average response time")
    errors: List[str] = Field(default_factory=list, description="Session errors")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    def calculate_success_rate(self, successful_requests: int) -> None:
        """Calculate and update the success rate."""
        if self.requests_made > 0:
            self.success_rate = (successful_requests / self.requests_made) * 100
    
    def end_session(self) -> None:
        """Mark the session as ended."""
        self.end_time = datetime.utcnow()


class ExtractorConfig(BaseModel):
    """
    Configuration model for Extractor classes.
    
    This model standardizes configuration across different extractor implementations,
    ensuring consistent behavior and easy configuration management.
    
    Attributes:
        max_retries: Maximum number of retry attempts
        timeout_seconds: Request timeout in seconds
        delay_between_requests: Delay between consecutive requests
        use_proxy: Whether to use proxy rotation
        respect_robots_txt: Whether to respect robots.txt rules
        max_concurrent_requests: Maximum concurrent requests
        user_agent_rotation: Whether to rotate user agents
        session_persistence: Whether to maintain session cookies
    """
    
    max_retries: NonNegativeInt = Field(3, description="Maximum retry attempts")
    timeout_seconds: PositiveFloat = Field(30.0, description="Request timeout")
    delay_between_requests: float = Field(1.0, description="Delay between requests")
    use_proxy: bool = Field(False, description="Enable proxy rotation")
    respect_robots_txt: bool = Field(True, description="Respect robots.txt")
    max_concurrent_requests: int = Field(5, description="Max concurrent requests")
    user_agent_rotation: bool = Field(True, description="Rotate user agents")
    session_persistence: bool = Field(True, description="Maintain session cookies")
    
    @validator('delay_between_requests')
    def delay_must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Delay must be non-negative')
        return v


class TransformerConfig(BaseModel):
    """
    Configuration model for Transformer classes.
    
    This model defines settings for data transformation and validation,
    ensuring consistent behavior across different transformer implementations.
    
    Attributes:
        validate_data: Whether to validate transformed data
        clean_html: Whether to clean HTML content
        normalize_text: Whether to normalize text data
        remove_duplicates: Whether to remove duplicate items
        max_field_length: Maximum allowed field length
        required_fields: List of required fields in transformed data
        date_format: Standard date format for parsing
        number_precision: Decimal precision for numeric values
    """
    
    validate_data: bool = Field(True, description="Enable data validation")
    clean_html: bool = Field(True, description="Clean HTML content")
    normalize_text: bool = Field(True, description="Normalize text data")
    remove_duplicates: bool = Field(True, description="Remove duplicate items")
    max_field_length: int = Field(1000, description="Maximum field length")
    required_fields: List[str] = Field(default_factory=list, description="Required fields")
    date_format: str = Field("%Y-%m-%d", description="Date format for parsing")
    number_precision: int = Field(2, description="Decimal precision")
    
    @validator('max_field_length')
    def field_length_positive(cls, v):
        if v <= 0:
            raise ValueError('Max field length must be positive')
        return v


class LoaderConfig(BaseModel):
    """
    Configuration model for Loader classes.
    
    This model defines settings for data loading and storage,
    supporting multiple output formats and storage destinations.
    
    Attributes:
        output_format: Output format (json, csv, sqlite, postgresql)
        output_path: Path for file-based outputs
        database_url: Connection string for database outputs
        batch_size: Number of items to process in each batch
        create_backups: Whether to create backup files
        compress_output: Whether to compress output files
        include_metadata: Whether to include metadata in output
        overwrite_existing: Whether to overwrite existing files
    """
    
    output_format: str = Field("json", description="Output format")
    output_path: str = Field("./data", description="Output directory path")
    database_url: Optional[str] = Field(None, description="Database connection URL")
    batch_size: int = Field(100, description="Batch processing size")
    create_backups: bool = Field(True, description="Create backup files")
    compress_output: bool = Field(False, description="Compress output files")
    include_metadata: bool = Field(True, description="Include metadata in output")
    overwrite_existing: bool = Field(False, description="Overwrite existing files")
    
    @validator('output_format')
    def valid_format(cls, v):
        valid_formats = ['json', 'csv', 'sqlite', 'postgresql', 'excel']
        if v.lower() not in valid_formats:
            raise ValueError(f'Output format must be one of: {valid_formats}')
        return v.lower()
    
    @validator('batch_size')
    def batch_size_positive(cls, v):
        if v <= 0:
            raise ValueError('Batch size must be positive')
        return v


class ScrapingJob(BaseModel):
    """
    Complete scraping job specification.
    
    This model represents a full scraping job with all necessary configuration
    and tracking information. It serves as the main coordination object
    for complex scraping operations.
    
    Attributes:
        job_id: Unique identifier for the job
        name: Human-readable job name
        urls: List of URLs to scrape
        extractor_config: Configuration for the extractor
        transformer_config: Configuration for the transformer
        loader_config: Configuration for the loader
        created_at: When the job was created
        started_at: When execution started
        completed_at: When execution completed
        status: Current job status
        total_items: Total number of items processed
        successful_items: Number of successfully processed items
        failed_items: Number of failed items
        errors: List of errors encountered during execution
    """
    
    job_id: str = Field(..., description="Unique job identifier")
    name: str = Field(..., description="Human-readable job name")
    urls: List[HttpUrl] = Field(..., description="URLs to scrape")
    extractor_config: ExtractorConfig = Field(..., description="Extractor configuration")
    transformer_config: TransformerConfig = Field(..., description="Transformer configuration")
    loader_config: LoaderConfig = Field(..., description="Loader configuration")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    started_at: Optional[datetime] = Field(None, description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    status: DataStatus = Field(DataStatus.RAW, description="Job status")
    total_items: NonNegativeInt = Field(0, description="Total items processed")
    successful_items: NonNegativeInt = Field(0, description="Successful items")
    failed_items: NonNegativeInt = Field(0, description="Failed items")
    errors: List[str] = Field(default_factory=list, description="Job errors")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            HttpUrl: str
        }
    
    @validator('urls')
    def urls_not_empty(cls, v):
        if not v:
            raise ValueError('URLs list cannot be empty')
        return v
    
    def start_job(self) -> None:
        """Mark the job as started."""
        self.started_at = datetime.utcnow()
        self.status = DataStatus.PROCESSING
    
    def complete_job(self) -> None:
        """Mark the job as completed."""
        self.completed_at = datetime.utcnow()
        self.status = DataStatus.LOADED if self.failed_items == 0 else DataStatus.FAILED
    
    def add_error(self, error: str) -> None:
        """Add an error to the job."""
        self.errors.append(error)
    
    def calculate_success_rate(self) -> float:
        """Calculate the success rate of the job."""
        if self.total_items == 0:
            return 0.0
        return (self.successful_items / self.total_items) * 100 