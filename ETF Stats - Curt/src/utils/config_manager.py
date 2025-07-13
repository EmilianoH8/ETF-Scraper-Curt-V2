"""
Configuration manager for JP Morgan Asset Management fund scraper.
Handles loading and validation of YAML configuration files.
"""

import os
from pathlib import Path
from typing import Dict, List, Any, Optional
import yaml
from loguru import logger
from pydantic import BaseModel, Field, validator


class FundConfig(BaseModel):
    """Configuration model for individual fund."""
    name: str
    ticker: str
    url: str
    active: bool = True
    category: Optional[str] = None
    
    @validator('url')
    def validate_institutional_url(cls, v):
        """Ensure URL is institutional view."""
        if '/institutional/' not in v:
            logger.warning(f"URL may not be institutional view: {v}")
        return v


class ScrapingConfig(BaseModel):
    """Configuration model for scraping settings."""
    request_timeout: int = 30
    max_retries: int = 3
    retry_delay_base: int = 2
    retry_delay_max: int = 10
    browser_headless: bool = True
    browser_timeout: int = 60
    page_load_wait: int = 3
    user_agent_rotation: bool = True
    respect_robots_txt: bool = False
    concurrent_requests: int = 5


class LoggingConfig(BaseModel):
    """Configuration model for logging settings."""
    level: str = "INFO"
    directory: str = "logs"
    console_output: bool = True
    file_output: bool = True
    structured_logging: bool = True


class OutputConfig(BaseModel):
    """Configuration model for output settings."""
    directory: str = "data"
    excel_format: bool = True
    timestamp_files: bool = True
    backup_previous: bool = True


class ValidationConfig(BaseModel):
    """Configuration model for data validation settings."""
    require_ticker: bool = True
    require_cusip: bool = True
    allow_missing_yields: bool = True
    validate_cusip_format: bool = True
    clean_ticker_symbols: bool = True


class AutomationConfig(BaseModel):
    """Configuration model for automation settings."""
    timestamp_format: str = "%Y%m%d_%H%M%S"
    daily_filename_format: str = "jp_morgan_funds_{date}.xlsx"
    backup_filename_format: str = "{original}_backup_{timestamp}.xlsx"
    compare_with_previous: bool = True
    previous_file_pattern: str = "jp_morgan_funds_*.xlsx"


class ErrorHandlingConfig(BaseModel):
    """Configuration model for error handling settings."""
    continue_on_single_failure: bool = True
    fail_threshold_percentage: int = 50
    log_all_errors: bool = True
    create_error_report: bool = True


class DevelopmentConfig(BaseModel):
    """Configuration model for development settings."""
    test_mode: bool = False
    test_fund_limit: int = 5
    debug_requests: bool = False
    save_html_responses: bool = False


class ETFConfig(BaseModel):
    """Root configuration model."""
    funds: List[FundConfig] = []
    scraping: ScrapingConfig = Field(default_factory=ScrapingConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    output: OutputConfig = Field(default_factory=OutputConfig)
    validation: ValidationConfig = Field(default_factory=ValidationConfig)
    automation: AutomationConfig = Field(default_factory=AutomationConfig)
    error_handling: ErrorHandlingConfig = Field(default_factory=ErrorHandlingConfig)
    development: DevelopmentConfig = Field(default_factory=DevelopmentConfig)


class ConfigManager:
    """Configuration manager for ETF scraper."""
    
    def __init__(self, config_dir: str = "config"):
        """Initialize configuration manager."""
        self.config_dir = Path(config_dir)
        self.settings_file = self.config_dir / "settings.yaml"
        self.fund_urls_file = self.config_dir / "fund_urls.yaml"
        self.settings = None
        
        # Create config directory if it doesn't exist
        self.config_dir.mkdir(exist_ok=True)
        
        # Load initial configuration
        self._load_settings()
        self._load_fund_urls()
    
    def _load_settings(self):
        """Load settings from YAML file."""
        if self.settings_file.exists():
            try:
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    settings_data = yaml.safe_load(f) or {}
                
                # Validate and create ETFConfig object
                self.settings = ETFConfig(**settings_data)
                logger.info(f"Settings loaded from {self.settings_file}")
                
            except Exception as e:
                logger.error(f"Error loading settings from {self.settings_file}: {e}")
                logger.info("Using default settings")
                self.settings = ETFConfig(**self._get_default_settings())
        else:
            logger.warning(f"Settings file not found: {self.settings_file}")
            logger.info("Creating default settings")
            self.settings = ETFConfig(**self._get_default_settings())
            
            # Create default settings file
            try:
                with open(self.settings_file, 'w', encoding='utf-8') as f:
                    yaml.safe_dump(self.settings.dict(), f, default_flow_style=False, sort_keys=False)
                logger.info(f"Default settings created at {self.settings_file}")
            except Exception as e:
                logger.error(f"Failed to create default settings file: {e}")
    
    def _load_fund_urls(self):
        """Load fund URLs from YAML file."""
        if self.fund_urls_file.exists():
            try:
                with open(self.fund_urls_file, 'r', encoding='utf-8') as f:
                    fund_data = yaml.safe_load(f) or {}
                
                # Extract fund list and validate
                funds_list = fund_data.get('etf_funds', [])
                self.settings.funds = [FundConfig(**fund) for fund in funds_list]
                
                logger.info(f"Fund URLs loaded from {self.fund_urls_file}")
                logger.info(f"Loaded {len(self.settings.funds)} fund configurations")
                
            except Exception as e:
                logger.error(f"Error loading fund URLs from {self.fund_urls_file}: {e}")
                self.settings.funds = []
        else:
            logger.warning(f"Fund URLs file not found: {self.fund_urls_file}")
            self.settings.funds = []
    
    def _get_default_settings(self) -> Dict[str, Any]:
        """Get default configuration settings."""
        return {
            'scraping': ScrapingConfig().dict(),
            'logging': LoggingConfig().dict(),
            'output': OutputConfig().dict(),
            'validation': ValidationConfig().dict(),
            'automation': AutomationConfig().dict(),
            'error_handling': ErrorHandlingConfig().dict(),
            'development': DevelopmentConfig().dict()
        }
    
    def get_active_fund_urls(self) -> List[str]:
        """Get list of active fund URLs."""
        if not self.settings or not self.settings.funds:
            return []
        
        return [fund.url for fund in self.settings.funds if fund.active]
    
    def get_fund_by_ticker(self, ticker: str) -> Optional[FundConfig]:
        """Get fund configuration by ticker symbol."""
        if not self.settings or not self.settings.funds:
            return None
        
        for fund in self.settings.funds:
            if fund.ticker.upper() == ticker.upper():
                return fund
        return None
    
    def get_fund_by_url(self, url: str) -> Optional[FundConfig]:
        """Get fund configuration by URL."""
        if not self.settings or not self.settings.funds:
            return None
        
        for fund in self.settings.funds:
            if fund.url == url:
                return fund
        return None
    
    def is_test_mode(self) -> bool:
        """Check if running in test mode."""
        return self.settings['development'].test_mode if self.settings else False
    
    def get_test_fund_limit(self) -> int:
        """Get the fund limit for test mode."""
        return self.settings['development'].test_fund_limit if self.settings else 5
    
    def get_output_directory(self) -> str:
        """Get the configured output directory."""
        return self.settings['output'].directory if self.settings else "data"
    
    def get_log_level(self) -> str:
        """Get the configured log level."""
        return self.settings['logging'].level if self.settings else "INFO"
    
    def get_scraping_config(self) -> ScrapingConfig:
        """Get scraping configuration."""
        return self.settings['scraping'] if self.settings else ScrapingConfig()
    
    def validate_configuration(self) -> List[str]:
        """Validate current configuration and return list of issues."""
        issues = []
        
        if not self.settings:
            issues.append("No settings loaded")
            return issues
        
        # Check for active funds
        active_funds = [f for f in self.settings.funds if f.active]
        if not active_funds:
            issues.append("No active funds configured")
        
        # Validate fund URLs
        for fund in active_funds:
            if not fund.url or not fund.url.startswith('http'):
                issues.append(f"Invalid URL for fund {fund.ticker}: {fund.url}")
        
        return issues
    
    def reload_configuration(self):
        """Reload configuration from files."""
        logger.info("Reloading configuration...")
        self._load_settings()
        self._load_fund_urls()
        logger.info("Configuration reloaded successfully")


def load_config(config_dir: str = "config") -> ConfigManager:
    """
    Load configuration manager.
    
    Args:
        config_dir: Directory containing configuration files
        
    Returns:
        ConfigManager instance
    """
    return ConfigManager(config_dir) 