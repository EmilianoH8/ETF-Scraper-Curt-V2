"""
Custom Exception Classes for Scraping Hub

This module defines a comprehensive exception hierarchy for handling different types
of errors that can occur during web scraping operations. The hierarchy follows the
ETL pattern and provides specific exceptions for network, parsing, and browser automation errors.

Exception Hierarchy:
    ScrapingError (base)
    ├── NetworkError
    │   ├── ConnectionTimeout
    │   ├── HTTPError
    │   └── ProxyError
    ├── ParsingError
    │   ├── InvalidHTML
    │   ├── MissingSelector
    │   └── DataValidationError
    └── BrowserError
        ├── ElementNotFound
        ├── PageLoadTimeout
        └── JavaScriptError

Usage:
    try:
        response = extractor.extract_data(url)
    except HTTPError as e:
        logger.error(f"HTTP request failed: {e}")
    except DataValidationError as e:
        logger.warning(f"Data validation failed: {e}")
"""

from typing import Optional, Dict, Any


class ScrapingError(Exception):
    """
    Base exception class for all scraping-related errors.
    
    All custom exceptions in the scraping hub inherit from this base class,
    providing a consistent interface for error handling and logging.
    
    Attributes:
        message: Human-readable error description
        error_code: Optional error code for programmatic handling
        context: Additional context information about the error
    """
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.context = context or {}
        super().__init__(self.message)
    
    def __str__(self) -> str:
        error_str = self.message
        if self.error_code:
            error_str = f"[{self.error_code}] {error_str}"
        return error_str


# ============================================================================
# NETWORK ERROR HIERARCHY
# ============================================================================

class NetworkError(ScrapingError):
    """
    Base class for all network-related errors.
    
    This includes connection issues, HTTP errors, proxy problems,
    and other network-level failures that occur during data extraction.
    """
    pass


class ConnectionTimeout(NetworkError):
    """
    Raised when a network connection times out.
    
    This typically indicates network latency issues, server overload,
    or connectivity problems that prevent establishing or maintaining
    a connection to the target server.
    """
    
    def __init__(self, message: str, timeout_seconds: Optional[float] = None):
        super().__init__(message, error_code="CONN_TIMEOUT")
        self.timeout_seconds = timeout_seconds


class HTTPError(NetworkError):
    """
    Raised when an HTTP request returns an error status code.
    
    This includes 4xx client errors (like 404, 403) and 5xx server errors
    (like 500, 502). The status code and response details are preserved
    for debugging and retry logic decisions.
    """
    
    def __init__(
        self, 
        message: str, 
        status_code: Optional[int] = None,
        response_text: Optional[str] = None,
        url: Optional[str] = None
    ):
        super().__init__(message, error_code=f"HTTP_{status_code}")
        self.status_code = status_code
        self.response_text = response_text
        self.url = url


class ProxyError(NetworkError):
    """
    Raised when proxy-related issues occur.
    
    This includes proxy connection failures, authentication issues,
    proxy server errors, or proxy rotation problems.
    """
    
    def __init__(self, message: str, proxy_url: Optional[str] = None):
        super().__init__(message, error_code="PROXY_ERROR")
        self.proxy_url = proxy_url


# ============================================================================
# PARSING ERROR HIERARCHY
# ============================================================================

class ParsingError(ScrapingError):
    """
    Base class for all data parsing and transformation errors.
    
    This includes HTML parsing failures, missing selectors,
    data validation errors, and other issues that occur during
    the transformation phase of the ETL pipeline.
    """
    pass


class InvalidHTML(ParsingError):
    """
    Raised when HTML content cannot be parsed or is malformed.
    
    This typically occurs when the response content is not valid HTML,
    contains encoding issues, or is corrupted during transmission.
    """
    
    def __init__(self, message: str, html_snippet: Optional[str] = None):
        super().__init__(message, error_code="INVALID_HTML")
        self.html_snippet = html_snippet


class MissingSelector(ParsingError):
    """
    Raised when a CSS selector or XPath expression finds no matching elements.
    
    This indicates that the expected HTML structure has changed,
    or the selector needs to be updated to match the current page layout.
    """
    
    def __init__(self, message: str, selector: Optional[str] = None):
        super().__init__(message, error_code="MISSING_SELECTOR")
        self.selector = selector


class DataValidationError(ParsingError):
    """
    Raised when extracted data fails Pydantic model validation.
    
    This occurs when the scraped data doesn't match the expected schema,
    contains invalid values, or is missing required fields.
    """
    
    def __init__(
        self, 
        message: str, 
        validation_errors: Optional[Dict[str, Any]] = None,
        raw_data: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, error_code="DATA_VALIDATION")
        self.validation_errors = validation_errors or {}
        self.raw_data = raw_data


# ============================================================================
# BROWSER ERROR HIERARCHY
# ============================================================================

class BrowserError(ScrapingError):
    """
    Base class for all browser automation errors.
    
    This includes element interaction failures, page load issues,
    JavaScript execution errors, and other problems that occur
    during browser-based scraping operations.
    """
    pass


class ElementNotFound(BrowserError):
    """
    Raised when a browser automation cannot find a required element.
    
    This typically occurs when the page structure has changed,
    elements are loaded dynamically, or the selector is incorrect.
    """
    
    def __init__(self, message: str, selector: Optional[str] = None):
        super().__init__(message, error_code="ELEMENT_NOT_FOUND")
        self.selector = selector


class PageLoadTimeout(BrowserError):
    """
    Raised when a page fails to load within the specified timeout.
    
    This can indicate slow server response, network issues,
    or pages with heavy JavaScript that take excessive time to render.
    """
    
    def __init__(
        self, 
        message: str, 
        url: Optional[str] = None,
        timeout_seconds: Optional[float] = None
    ):
        super().__init__(message, error_code="PAGE_LOAD_TIMEOUT")
        self.url = url
        self.timeout_seconds = timeout_seconds


class JavaScriptError(BrowserError):
    """
    Raised when JavaScript execution fails in the browser.
    
    This includes syntax errors in injected scripts, runtime exceptions,
    or failures in JavaScript-based data extraction methods.
    """
    
    def __init__(
        self, 
        message: str, 
        script: Optional[str] = None,
        js_error: Optional[str] = None
    ):
        super().__init__(message, error_code="JAVASCRIPT_ERROR")
        self.script = script
        self.js_error = js_error


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def classify_error(exception: Exception) -> str:
    """
    Classify an exception into a category for logging and metrics.
    
    Args:
        exception: The exception to classify
        
    Returns:
        String category: 'network', 'parsing', 'browser', or 'unknown'
    """
    if isinstance(exception, NetworkError):
        return 'network'
    elif isinstance(exception, ParsingError):
        return 'parsing'
    elif isinstance(exception, BrowserError):
        return 'browser'
    elif isinstance(exception, ScrapingError):
        return 'scraping'
    else:
        return 'unknown'


def should_retry(exception: Exception) -> bool:
    """
    Determine if an operation should be retried based on the exception type.
    
    Args:
        exception: The exception to evaluate
        
    Returns:
        True if the operation should be retried, False otherwise
    """
    # Network errors are often transient and worth retrying
    if isinstance(exception, (ConnectionTimeout, ProxyError)):
        return True
    
    # Some HTTP errors are worth retrying (5xx server errors)
    if isinstance(exception, HTTPError):
        return exception.status_code and exception.status_code >= 500
    
    # Browser timeouts can be retried
    if isinstance(exception, PageLoadTimeout):
        return True
    
    # Parsing and element errors usually indicate structural issues
    # and are not worth retrying without fixing the selectors
    return False 