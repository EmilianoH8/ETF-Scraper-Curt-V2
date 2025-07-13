"""
API-Based Scraping Methods

This package contains extractors that use HTTP clients to make direct
API requests with advanced anti-detection techniques:

- curl_cffi_extractor: Primary extractor using curl_cffi for TLS fingerprinting
- httpx_extractor: Async HTTP client for high-performance requests
- requests_extractor: Fallback extractor using the requests library
- tls_client_extractor: Alternative TLS fingerprinting solution

These extractors are optimized for speed and stealth, making them ideal
for scenarios where direct HTTP requests are sufficient.
"""

__all__ = [] 