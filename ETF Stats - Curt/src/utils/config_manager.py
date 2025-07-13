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
    send_email_notifications: bool = False
    email_on_success: bool = True
    email_on_failure: bool = True
    email_on_changes: bool = True


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


class ConfigManager:
    """Configuration manager for loading and managing application settings."""
    
    def __init__(self, config_dir: str = "config"):
        """
        Initialize configuration manager.
        
        Args:
            config_dir: Directory containing configuration files
        """
        self.config_dir = Path(config_dir)
        self.settings = None
        self.fund_urls = None
        
        # Load configurations
        self._load_settings()
        self._load_fund_urls()
        
        logger.info(f"Configuration loaded from {self.config_dir}")
    
    def _load_settings(self):
        """Load application settings from YAML file."""
        settings_file = self.config_dir / "settings.yaml"
        
        if not settings_file.exists():
            logger.warning(f"Settings file not found: {settings_file}")
            self.settings = self._get_default_settings()
            return
        
        try:
            with open(settings_file, 'r') as f:
                settings_data = yaml.safe_load(f)
            
            # Parse settings into structured models
            self.settings = {
                'logging': LoggingConfig(**settings_data.get('logging', {})),
                'output': OutputConfig(**settings_data.get('output', {})),
                'scraping': ScrapingConfig(**settings_data.get('scraping', {})),
                'validation': ValidationConfig(**settings_data.get('validation', {})),
                'automation': AutomationConfig(**settings_data.get('automation', {})),
                'error_handling': ErrorHandlingConfig(**settings_data.get('error_handling', {})),
                'development': DevelopmentConfig(**settings_data.get('development', {})),
                'raw': settings_data  # Keep raw data for any additional settings
            }
            
            logger.debug(f"Settings loaded successfully from {settings_file}")
            
        except Exception as e:
            logger.error(f"Failed to load settings: {e}")
            self.settings = self._get_default_settings()
    
    def _load_fund_urls(self):
        """Load fund URLs from YAML file."""
        urls_file = self.config_dir / "fund_urls.yaml"
        
        if not urls_file.exists():
            logger.warning(f"Fund URLs file not found: {urls_file}")
            self.fund_urls = {'all_funds': [], 'active_funds': []}
            return
        
        try:
            with open(urls_file, 'r') as f:
                urls_data = yaml.safe_load(f)
            
            # Parse fund URLs into structured format
            all_funds = []
            
            # Combine all fund categories
            for category in ['etf_funds', 'mutual_funds', 'money_market_funds', 'bond_funds']:
                if category in urls_data:
                    for fund_data in urls_data[category]:
                        fund_config = FundConfig(**fund_data)
                        fund_config.category = category  # Add category info
                        all_funds.append(fund_config)
            
            # Filter active funds
            active_funds = [f for f in all_funds if f.active]
            
            self.fund_urls = {
                'all_funds': all_funds,
                'active_funds': active_funds,
                'metadata': urls_data.get('metadata', {}),
                'url_config': urls_data.get('url_config', {}),
                'raw': urls_data
            }
            
            logger.info(f"Loaded {len(all_funds)} funds ({len(active_funds)} active) from {urls_file}")
            
        except Exception as e:
            logger.error(f"Failed to load fund URLs: {e}")
            self.fund_urls = {'all_funds': [], 'active_funds': []}
    
    def _get_default_settings(self) -> Dict[str, Any]:
        """Get default settings if configuration file is missing."""
        return {
            'logging': LoggingConfig(),
            'output': OutputConfig(),
            'scraping': ScrapingConfig(),
            'validation': ValidationConfig(),
            'automation': AutomationConfig(),
            'error_handling': ErrorHandlingConfig(),
            'development': DevelopmentConfig(),
            'raw': {}
        }
    
    def get_active_fund_urls(self) -> List[str]:
        """Get list of active fund URLs for scraping."""
        if not self.fund_urls or not self.fund_urls['active_funds']:
            logger.warning("No active fund URLs found")
            return []
        
        urls = [fund.url for fund in self.fund_urls['active_funds']]
        logger.debug(f"Retrieved {len(urls)} active fund URLs")
        return urls
    
    def get_fund_by_ticker(self, ticker: str) -> Optional[FundConfig]:
        """Get fund configuration by ticker symbol."""
        if not self.fund_urls:
            return None
        
        for fund in self.fund_urls['all_funds']:
            if fund.ticker.upper() == ticker.upper():
                return fund
        
        return None
    
    def get_fund_by_url(self, url: str) -> Optional[FundConfig]:
        """Get fund configuration by URL."""
        if not self.fund_urls:
            return None
        
        for fund in self.fund_urls['all_funds']:
            if fund.url == url:
                return fund
        
        return None
    
    def is_test_mode(self) -> bool:
        """Check if application is running in test mode."""
        return self.settings['development'].test_mode if self.settings else False
    
    def get_test_fund_limit(self) -> int:
        """Get the fund limit for test mode."""
        return self.settings['development'].test_fund_limit if self.settings else 5
    
    def should_send_emails(self) -> bool:
        """Check if email notifications are enabled."""
        return self.settings['automation'].send_email_notifications if self.settings else False
    
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
        """Validate configuration and return list of issues."""
        issues = []
        
        # Check if essential files exist
        if not (self.config_dir / "settings.yaml").exists():
            issues.append("settings.yaml file is missing")
        
        if not (self.config_dir / "fund_urls.yaml").exists():
            issues.append("fund_urls.yaml file is missing")
        
        # Check if we have active funds
        if not self.fund_urls or not self.fund_urls['active_funds']:
            issues.append("No active funds configured for scraping")
        
        # Validate fund URLs
        if self.fund_urls and self.fund_urls['active_funds']:
            for fund in self.fund_urls['active_funds']:
                if '/institutional/' not in fund.url:
                    issues.append(f"Fund {fund.ticker} may not have institutional view URL")
        
        return issues
    
    def reload_configuration(self):
        """Reload configuration from files."""
        logger.info("Reloading configuration...")
        self._load_settings()
        self._load_fund_urls()
        logger.info("Configuration reloaded successfully")


def load_config(config_dir: str = "config") -> ConfigManager:
    """
    Load configuration manager instance.
    
    Args:
        config_dir: Directory containing configuration files
        
    Returns:
        ConfigManager instance
    """
    return ConfigManager(config_dir) 