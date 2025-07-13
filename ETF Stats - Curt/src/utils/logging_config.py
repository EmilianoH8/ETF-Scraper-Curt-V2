"""
Logging configuration for JP Morgan Asset Management fund scraper.
Uses loguru for advanced logging with rotation and structured output.
"""

import sys
from pathlib import Path
from typing import Optional
from loguru import logger
import structlog


class LoggingConfig:
    """Configuration manager for logging setup."""
    
    def __init__(self, log_dir: str = "logs", log_level: str = "INFO"):
        """
        Initialize logging configuration.
        
        Args:
            log_dir: Directory for log files
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        self.log_dir = Path(log_dir)
        self.log_level = log_level.upper()
        self.log_dir.mkdir(exist_ok=True)
        
        # Remove default logger
        logger.remove()
        
        # Setup structured logging
        self._setup_structured_logging()
        
        # Setup console logging
        self._setup_console_logging()
        
        # Setup file logging
        self._setup_file_logging()
        
        logger.info(f"Logging initialized - Level: {self.log_level}, Directory: {self.log_dir}")
    
    def _setup_structured_logging(self):
        """Setup structlog for structured logging output."""
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )
    
    def _setup_console_logging(self):
        """Setup console logging with color formatting."""
        console_format = (
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        )
        
        logger.add(
            sys.stdout,
            format=console_format,
            level=self.log_level,
            colorize=True,
            enqueue=True,
            catch=True
        )
    
    def _setup_file_logging(self):
        """Setup file logging with rotation."""
        # Main application log
        logger.add(
            self.log_dir / "jp_morgan_scraper_{time:YYYY-MM-DD}.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
            level=self.log_level,
            rotation="1 day",
            retention="30 days",
            compression="gz",
            enqueue=True,
            catch=True
        )
        
        # Error-only log
        logger.add(
            self.log_dir / "errors_{time:YYYY-MM-DD}.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
            level="ERROR",
            rotation="1 day",
            retention="90 days",
            compression="gz",
            enqueue=True,
            catch=True
        )
        
        # Scraping activity log (INFO and above)
        logger.add(
            self.log_dir / "scraping_activity_{time:YYYY-MM-DD}.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
            level="INFO",
            rotation="1 day",
            retention="7 days",
            compression="gz",
            enqueue=True,
            catch=True,
            filter=lambda record: "scraping" in record["message"].lower() or "extract" in record["message"].lower()
        )
        
        # Performance log for timing analysis
        logger.add(
            self.log_dir / "performance_{time:YYYY-MM-DD}.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {message}",
            level="DEBUG",
            rotation="1 day",
            retention="7 days",
            compression="gz",
            enqueue=True,
            catch=True,
            filter=lambda record: "response_time" in record["message"].lower() or "performance" in record["message"].lower()
        )
    
    def get_structured_logger(self, name: str):
        """Get a structured logger instance."""
        return structlog.get_logger(name)
    
    def log_scraping_start(self, url: str, method: str):
        """Log the start of a scraping operation."""
        logger.bind(
            operation="scraping_start",
            url=url,
            method=method,
            timestamp=logger._core.get_time().isoformat()
        ).info(f"Starting scraping operation for {url} using {method}")
    
    def log_scraping_success(self, url: str, method: str, response_time: float, data_extracted: dict):
        """Log successful scraping operation."""
        logger.bind(
            operation="scraping_success",
            url=url,
            method=method,
            response_time=response_time,
            data_fields=list(data_extracted.keys()),
            timestamp=logger._core.get_time().isoformat()
        ).success(f"Successfully scraped {url} in {response_time:.2f}s using {method}")
    
    def log_scraping_failure(self, url: str, method: str, error: str, response_time: float):
        """Log failed scraping operation."""
        logger.bind(
            operation="scraping_failure",
            url=url,
            method=method,
            error=error,
            response_time=response_time,
            timestamp=logger._core.get_time().isoformat()
        ).error(f"Scraping failed for {url} after {response_time:.2f}s using {method}: {error}")
    
    def log_data_validation_error(self, data: dict, error: str):
        """Log data validation errors."""
        logger.bind(
            operation="validation_error",
            data_keys=list(data.keys()),
            error=error,
            timestamp=logger._core.get_time().isoformat()
        ).warning(f"Data validation failed: {error}")
    
    def log_performance_metric(self, operation: str, duration: float, additional_metrics: Optional[dict] = None):
        """Log performance metrics."""
        metrics = {
            "operation": operation,
            "duration_seconds": duration,
            "timestamp": logger._core.get_time().isoformat()
        }
        
        if additional_metrics:
            metrics.update(additional_metrics)
        
        logger.bind(**metrics).debug(f"Performance: {operation} took {duration:.2f}s")
    
    def log_daily_summary(self, summary_stats: dict):
        """Log daily summary statistics."""
        logger.bind(
            operation="daily_summary",
            **summary_stats,
            timestamp=logger._core.get_time().isoformat()
        ).info(f"Daily scraping summary: {summary_stats}")


def setup_logging(log_dir: str = "logs", log_level: str = "INFO") -> LoggingConfig:
    """
    Setup logging configuration for the application.
    
    Args:
        log_dir: Directory for log files
        log_level: Logging level
        
    Returns:
        LoggingConfig instance
    """
    return LoggingConfig(log_dir, log_level)


def get_logger(name: str):
    """Get a logger instance for a specific module."""
    return logger.bind(module=name) 