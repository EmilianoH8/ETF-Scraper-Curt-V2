"""
Abstract Base Extractor Class for Scraping Hub

This module defines the abstract base class that all extractors must inherit from.
The Extractor is the first component in the ETL pipeline, responsible for acquiring
raw data from various sources using different methods (API, browser automation, etc.).

Key Responsibilities:
- Establish connections to target sources
- Handle authentication and session management  
- Implement retry logic and error handling
- Apply anti-detection techniques
- Return standardized response objects
- Log all extraction activities

Architecture Pattern:
- Template Method Pattern: Common workflow with customizable steps
- Strategy Pattern: Different extraction strategies (API vs Browser)
- Factory Pattern: Create appropriate HTTP clients or browser instances
- Observer Pattern: Notify about extraction progress and errors

Usage:
    class MyExtractor(BaseExtractor):
        def _make_request(self, url: str) -> ScrapingResponse:
            # Implement specific extraction logic
            pass
    
    extractor = MyExtractor(config)
    response = await extractor.extract_data("https://example.com")
"""

import asyncio
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin, urlparse

from loguru import logger
from tenacity import (
    retry, 
    stop_after_attempt, 
    wait_exponential,
    retry_if_exception_type
)

from .exceptions import (
    ScrapingError, 
    NetworkError, 
    HTTPError, 
    ConnectionTimeout,
    ProxyError
)
from .models import (
    ScrapingResponse, 
    ExtractorConfig, 
    SessionInfo,
    ScrapingMethod
)


class BaseExtractor(ABC):
    """
    Abstract base class for all data extractors.
    
    This class provides the common interface and shared functionality for all
    extraction methods, whether API-based or browser automation. It implements
    the Extract phase of the ETL pipeline with built-in error handling,
    retry logic, and anti-detection capabilities.
    
    Attributes:
        config: Extractor configuration settings
        session_info: Information about the current scraping session
        _active_sessions: Dictionary of active HTTP sessions or browser instances
        _request_count: Counter for tracking request volume
        _last_request_time: Timestamp of the last request for rate limiting
    """
    
    def __init__(self, config: ExtractorConfig):
        """
        Initialize the base extractor.
        
        Args:
            config: Configuration object with extraction settings
        """
        self.config = config
        self.session_info = SessionInfo(
            session_id=self._generate_session_id(),
            user_agent=self._get_user_agent()
        )
        self._active_sessions: Dict[str, Any] = {}
        self._request_count = 0
        self._last_request_time = 0.0
        
        logger.info(f"Initialized {self.__class__.__name__} with session {self.session_info.session_id}")
    
    # ========================================================================
    # PUBLIC INTERFACE METHODS
    # ========================================================================
    
    async def extract_data(self, url: str, **kwargs) -> ScrapingResponse:
        """
        Extract data from a single URL.
        
        This is the main public method that orchestrates the entire extraction
        process with proper error handling, rate limiting, and retry logic.
        
        Args:
            url: The URL to extract data from
            **kwargs: Additional parameters specific to the extraction method
            
        Returns:
            ScrapingResponse object containing the extracted data
            
        Raises:
            ScrapingError: If extraction fails after all retry attempts
        """
        logger.info(f"Starting extraction from {url}")
        
        try:
            # Validate URL
            self._validate_url(url)
            
            # Apply rate limiting
            await self._apply_rate_limit()
            
            # Setup session if not already active
            await self._ensure_session_active()
            
            # Perform the actual extraction with retry logic
            response = await self._extract_with_retry(url, **kwargs)
            
            # Track successful request
            self._track_request_success(response)
            
            logger.success(f"Successfully extracted data from {url}")
            return response
            
        except Exception as e:
            # Track failed request
            self._track_request_failure(str(e))
            
            logger.error(f"Failed to extract data from {url}: {e}")
            raise
    
    async def extract_batch(self, urls: List[str], **kwargs) -> List[ScrapingResponse]:
        """
        Extract data from multiple URLs concurrently.
        
        This method implements concurrent extraction with proper semaphore-based
        concurrency control to avoid overwhelming target servers.
        
        Args:
            urls: List of URLs to extract data from
            **kwargs: Additional parameters for each extraction
            
        Returns:
            List of ScrapingResponse objects (may contain failed responses)
        """
        logger.info(f"Starting batch extraction of {len(urls)} URLs")
        
        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(self.config.max_concurrent_requests)
        
        async def extract_with_semaphore(url: str) -> ScrapingResponse:
            async with semaphore:
                try:
                    return await self.extract_data(url, **kwargs)
                except Exception as e:
                    # Return error response instead of raising
                    return ScrapingResponse(
                        url=url,
                        status_code=0,
                        content=str(e),
                        method=self.get_method(),
                        response_time=0.0,
                        headers={},
                        metadata={"error": True, "error_message": str(e)}
                    )
        
        # Execute all extractions concurrently
        tasks = [extract_with_semaphore(url) for url in urls]
        responses = await asyncio.gather(*tasks, return_exceptions=False)
        
        # Calculate batch statistics
        successful = sum(1 for r in responses if not r.metadata.get("error", False))
        failed = len(responses) - successful
        
        logger.info(f"Batch extraction completed: {successful} successful, {failed} failed")
        return responses
    
    def cleanup(self) -> None:
        """
        Clean up resources and close active sessions.
        
        This method should be called when the extractor is no longer needed
        to properly close HTTP sessions, browser instances, and other resources.
        """
        logger.info(f"Cleaning up {self.__class__.__name__} session {self.session_info.session_id}")
        
        # Close all active sessions
        for session_key, session in self._active_sessions.items():
            try:
                self._close_session(session_key, session)
            except Exception as e:
                logger.warning(f"Error closing session {session_key}: {e}")
        
        # Clear session tracking
        self._active_sessions.clear()
        self.session_info.end_session()
        
        logger.info("Cleanup completed")
    
    # ========================================================================
    # ABSTRACT METHODS (MUST BE IMPLEMENTED BY SUBCLASSES)
    # ========================================================================
    
    @abstractmethod
    async def _make_request(self, url: str, **kwargs) -> ScrapingResponse:
        """
        Make the actual request to extract data from the URL.
        
        This is the core method that each extractor implementation must provide.
        It should handle the specific details of how to acquire data from the
        target source (HTTP request, browser automation, etc.).
        
        Args:
            url: The URL to extract data from
            **kwargs: Method-specific parameters
            
        Returns:
            ScrapingResponse containing the extracted data
            
        Raises:
            ScrapingError: If the request fails
        """
        pass
    
    @abstractmethod
    def get_method(self) -> ScrapingMethod:
        """
        Return the scraping method used by this extractor.
        
        Returns:
            ScrapingMethod enum value (API, BROWSER, or HYBRID)
        """
        pass
    
    @abstractmethod
    async def setup_session(self) -> None:
        """
        Set up the session for this extractor.
        
        This method should initialize HTTP clients, browser instances,
        authentication, proxy settings, and any other session-specific
        configuration required for extraction.
        
        Raises:
            ScrapingError: If session setup fails
        """
        pass
    
    @abstractmethod
    def _close_session(self, session_key: str, session: Any) -> None:
        """
        Close a specific session.
        
        Args:
            session_key: Identifier for the session
            session: The session object to close
        """
        pass
    
    # ========================================================================
    # TEMPLATE METHODS (COMMON WORKFLOW WITH CUSTOMIZATION POINTS)
    # ========================================================================
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((NetworkError, ConnectionTimeout))
    )
    async def _extract_with_retry(self, url: str, **kwargs) -> ScrapingResponse:
        """
        Extract data with automatic retry logic.
        
        This method wraps the actual extraction with tenacity-based retry
        logic, automatically retrying on transient network errors.
        
        Args:
            url: URL to extract from
            **kwargs: Extraction parameters
            
        Returns:
            ScrapingResponse object
        """
        start_time = time.time()
        
        try:
            response = await self._make_request(url, **kwargs)
            response.response_time = time.time() - start_time
            return response
            
        except Exception as e:
            # Re-raise as appropriate scraping error
            if isinstance(e, ScrapingError):
                raise
            else:
                raise NetworkError(f"Extraction failed: {str(e)}")
    
    async def _ensure_session_active(self) -> None:
        """
        Ensure that a session is active and ready for requests.
        
        This method checks if a session exists and is valid, setting up
        a new session if necessary.
        """
        if not self._active_sessions:
            await self.setup_session()
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def _validate_url(self, url: str) -> None:
        """
        Validate that the URL is properly formatted and accessible.
        
        Args:
            url: URL to validate
            
        Raises:
            ValueError: If URL is invalid
        """
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                raise ValueError("URL must include scheme and domain")
        except Exception as e:
            raise ValueError(f"Invalid URL format: {e}")
    
    async def _apply_rate_limit(self) -> None:
        """
        Apply rate limiting between requests.
        
        This method enforces the configured delay between requests to avoid
        overwhelming target servers and reduce detection risk.
        """
        if self.config.delay_between_requests > 0:
            time_since_last = time.time() - self._last_request_time
            if time_since_last < self.config.delay_between_requests:
                delay = self.config.delay_between_requests - time_since_last
                logger.debug(f"Rate limiting: waiting {delay:.2f} seconds")
                await asyncio.sleep(delay)
        
        self._last_request_time = time.time()
    
    def _track_request_success(self, response: ScrapingResponse) -> None:
        """
        Track a successful request for metrics and session management.
        
        Args:
            response: The successful response to track
        """
        self._request_count += 1
        self.session_info.requests_made += 1
        
        # Update session statistics
        if self.session_info.requests_made > 0:
            self.session_info.calculate_success_rate(
                self.session_info.requests_made - len(self.session_info.errors)
            )
    
    def _track_request_failure(self, error_message: str) -> None:
        """
        Track a failed request for metrics and session management.
        
        Args:
            error_message: Description of the failure
        """
        self._request_count += 1
        self.session_info.requests_made += 1
        self.session_info.errors.append(error_message)
        
        # Update session statistics
        self.session_info.calculate_success_rate(
            self.session_info.requests_made - len(self.session_info.errors)
        )
    
    def _generate_session_id(self) -> str:
        """
        Generate a unique session ID.
        
        Returns:
            Unique session identifier string
        """
        import uuid
        return f"{self.__class__.__name__}_{uuid.uuid4().hex[:8]}"
    
    def _get_user_agent(self) -> str:
        """
        Get the user agent string to use for requests.
        
        Returns:
            User agent string
        """
        # Default user agent - should be overridden by implementations
        return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    # ========================================================================
    # CONTEXT MANAGER SUPPORT
    # ========================================================================
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session_active()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        self.cleanup()
    
    def __enter__(self):
        """Sync context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Sync context manager exit."""
        self.cleanup()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_default_config(**overrides) -> ExtractorConfig:
    """
    Create a default extractor configuration with optional overrides.
    
    Args:
        **overrides: Configuration values to override defaults
        
    Returns:
        ExtractorConfig object with specified settings
    """
    defaults = {
        'max_retries': 3,
        'timeout_seconds': 30.0,
        'delay_between_requests': 2.0,
        'use_proxy': False,
        'respect_robots_txt': True,
        'max_concurrent_requests': 5,
        'user_agent_rotation': True,
        'session_persistence': True
    }
    
    defaults.update(overrides)
    return ExtractorConfig(**defaults)


def validate_extractor_implementation(extractor_class: type) -> bool:
    """
    Validate that an extractor class properly implements the required interface.
    
    Args:
        extractor_class: The extractor class to validate
        
    Returns:
        True if implementation is valid
        
    Raises:
        TypeError: If implementation is invalid
    """
    required_methods = ['_make_request', 'get_method', 'setup_session', '_close_session']
    
    for method_name in required_methods:
        if not hasattr(extractor_class, method_name):
            raise TypeError(f"Extractor must implement {method_name} method")
        
        method = getattr(extractor_class, method_name)
        if not callable(method):
            raise TypeError(f"{method_name} must be callable")
    
    if not issubclass(extractor_class, BaseExtractor):
        raise TypeError("Extractor must inherit from BaseExtractor")
    
    return True 