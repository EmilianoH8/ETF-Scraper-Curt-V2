"""
New York State WARN data extractor for Tableau dashboard.

This extractor handles the specific Tableau Public dashboard used by
NY Department of Labor for WARN notices.
"""

from setup_imports import *
from scraping_hub import BaseExtractor
from typing import Dict, List, Any, Optional
from datetime import datetime, date
import json
import urllib.parse
from curl_cffi import requests
from tenacity import retry, stop_after_attempt, wait_exponential
from loguru import logger

from ..models.warn_models import StateConfig


class NYTableauExtractor(BaseExtractor):
    """
    Extractor for New York State WARN data from Tableau Public dashboard.
    
    Based on reverse engineering of:
    https://public.tableau.com/views/WorkerAdjustmentRetrainingNotificationWARN/WARN
    """
    
    def __init__(self, config: StateConfig, **kwargs):
        """Initialize NY Tableau extractor."""
        super().__init__(config=config, **kwargs)
        self.config = config
        self.session = None
        self.session_id = None
        self.workbook_id = "14152870"
        self.view_id = "96110785"
        self.base_url = "https://public.tableau.com"
        
        # Tableau-specific URLs from HAR analysis
        self.bootstrap_url = f"{self.base_url}/vizql/w/WorkerAdjustmentRetrainingNotificationWARN/v/WARN/bootstrapSession/sessions"
        self.command_base_url = f"{self.base_url}/vizql/w/WorkerAdjustmentRetrainingNotificationWARN/v/WARN/sessions"
        
    def setup_session(self) -> None:
        """Setup curl_cffi session with proper headers and TLS fingerprinting."""
        self.session = requests.Session(impersonate="chrome110")
        
        # Headers based on HAR analysis
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9,es;q=0.8,da;q=0.7",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Cache-Control": "no-cache",
            "Origin": "https://public.tableau.com",
            "Referer": "https://public.tableau.com/views/WorkerAdjustmentRetrainingNotificationWARN/WARN",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Ch-Ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
        })
        
        logger.info("✓ Curl_cffi session initialized with Chrome fingerprinting")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def bootstrap_tableau_session(self) -> bool:
        """
        Initialize Tableau session using bootstrapSession endpoint.
        
        Returns:
            bool: True if session was successfully initialized
        """
        if not self.session:
            self.setup_session()
        
        # Generate session ID (following Tableau pattern)
        import uuid
        self.session_id = f"{uuid.uuid4().hex.upper()[:32]}-0:0"
        
        bootstrap_url = f"{self.bootstrap_url}/{self.session_id}"
        
        # Bootstrap payload based on HAR analysis
        bootstrap_data = {
            "worksheetPortSize": json.dumps({"w": 1000, "h": 1400}),
            "dashboardPortSize": json.dumps({"w": 1000, "h": 1400}),
            "clientDimension": json.dumps({"w": 776, "h": 600}),
            "renderMapsClientSide": "true",
            "isBrowserRendering": "true",
            "browserRenderingThreshold": "100",
            "formatDataValueLocally": "false",
            "clientNum": "",
            "navType": "Nav",
            "navSrc": "Boot",
            "devicePixelRatio": "2",
            "clientRenderPixelLimit": "16000000",
            "allowAutogenWorksheetPhoneLayouts": "false",
            ":device": "default",
            "sheet_id": "WARN",
            "showParams": json.dumps({
                "checkpoint": False,
                "refresh": False,
                "refreshUnmodified": False,
                "unknownParams": ":hideEditButton=y"
            }),
            "stickySessionKey": json.dumps({
                "capabilities": "6500f1780010",
                "dataserverPermissions": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
                "featureFlags": "{}",
                "isAuthoring": False,
                "isOfflineMode": False,
                "lastUpdatedAt": int(datetime.now().timestamp() * 1000),
                "unknownParamsHash": "65fd329fa7af4124e6e9fea9e82c57695e999393cd297034a8c6e299b91492f3",
                "viewId": int(self.view_id),
                "workbookId": int(self.workbook_id)
            }),
            "filterTileSize": "200",
            "locale": "en_US",
            "language": "en",
            "verboseMode": "false"
        }
        
        try:
            self.session.headers.update({
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Tsi-Active-Tab": "WARN"
            })
            
            response = self.session.post(
                bootstrap_url,
                data=bootstrap_data,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"✓ Tableau session bootstrapped: {self.session_id}")
                return True
            else:
                logger.error(f"Bootstrap failed: {response.status_code} - {response.text[:200]}")
                return False
                
        except Exception as e:
            logger.error(f"Bootstrap session error: {e}")
            return False
    
    def get_command_url(self, command: str) -> str:
        """Generate command URL for Tableau session."""
        return f"{self.command_base_url}/{self.session_id}/commands/{command}"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    def get_filtered_data(self, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Get WARN data using Tableau's categorical-filter endpoint.
        
        Args:
            filters: Optional filters to apply (date range, region, etc.)
            
        Returns:
            List of WARN notices as dictionaries
        """
        if not self.session_id:
            if not self.bootstrap_tableau_session():
                raise Exception("Failed to bootstrap Tableau session")
        
        command_url = self.get_command_url("tabdoc/categorical-filter")
        
        # Default filter data - this might need adjustment based on actual usage
        filter_data = {
            "globalFieldName": "[federated.0n2ltzy0qojezj1c1o7xm0p7koxz].[none:WARN Number:nk]",
            "filterUpdateType": "filter-clear",
            "filterIndices": "[]",
            "stateOnly": "false"
        }
        
        # Apply custom filters if provided
        if filters:
            # This would need to be customized based on available filters
            # For now, we'll use default to get all data
            pass
        
        try:
            response = self.session.post(
                command_url,
                data=filter_data,
                timeout=30
            )
            
            if response.status_code == 200:
                # Parse Tableau response - this is complex and may need adjustment
                return self._parse_tableau_response(response.text)
            else:
                logger.error(f"Filter request failed: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Get filtered data error: {e}")
            return []
    
    def _parse_tableau_response(self, response_text: str) -> List[Dict[str, Any]]:
        """
        Parse Tableau's complex response format.
        
        Tableau responses are often complex and may require specific parsing.
        This is a placeholder that needs to be developed based on actual responses.
        """
        try:
            # Tableau responses can be complex JSON structures
            # This is a simplified parser that may need enhancement
            
            # Look for data arrays in the response
            if "dataValues" in response_text:
                # Extract actual data - this needs to be developed based on real responses
                logger.info("Found dataValues in response")
                
            # For now, return empty list - this needs real implementation
            logger.warning("Response parsing not yet implemented - needs development with real data")
            return []
            
        except Exception as e:
            logger.error(f"Error parsing Tableau response: {e}")
            return []
    
    def get_tooltip_data(self, coordinates: Dict[str, int]) -> Optional[Dict[str, Any]]:
        """
        Get detailed data for a specific mark using tooltip endpoint.
        
        Args:
            coordinates: X,Y coordinates of the mark to query
            
        Returns:
            Detailed information for the mark
        """
        if not self.session_id:
            if not self.bootstrap_tableau_session():
                return None
        
        command_url = self.get_command_url("tabsrv/render-tooltip-server")
        
        tooltip_data = {
            "worksheet": "WARN List",
            "dashboard": "WARN",
            "clientX": coordinates.get("x", 400),
            "clientY": coordinates.get("y", 300),
            "devType": "desktop"
        }
        
        try:
            response = self.session.post(
                command_url,
                data=tooltip_data,
                timeout=15
            )
            
            if response.status_code == 200:
                return self._parse_tooltip_response(response.text)
            else:
                logger.error(f"Tooltip request failed: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Get tooltip data error: {e}")
            return None
    
    def _parse_tooltip_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Parse tooltip response to extract detailed WARN notice data."""
        try:
            # Tooltip responses typically contain HTML with structured data
            # This needs to be implemented based on actual response format
            logger.info("Tooltip response received - parsing not yet implemented")
            return None
            
        except Exception as e:
            logger.error(f"Error parsing tooltip response: {e}")
            return None
    
    def extract_data(self, **kwargs) -> Dict[str, Any]:
        """
        Main extraction method implementing BaseExtractor interface.
        
        Returns:
            Dictionary containing extracted WARN data
        """
        logger.info("Starting NY WARN data extraction")
        
        try:
            # Initialize session
            if not self.bootstrap_tableau_session():
                raise Exception("Failed to initialize Tableau session")
            
            # Get filtered data
            warn_notices = self.get_filtered_data()
            
            result = {
                "state": "NY",
                "source": "tableau_dashboard",
                "extracted_at": datetime.now().isoformat(),
                "session_id": self.session_id,
                "total_notices": len(warn_notices),
                "notices": warn_notices,
                "success": True
            }
            
            logger.info(f"✓ Extracted {len(warn_notices)} WARN notices from NY")
            return result
            
        except Exception as e:
            logger.error(f"NY data extraction failed: {e}")
            return {
                "state": "NY",
                "source": "tableau_dashboard", 
                "extracted_at": datetime.now().isoformat(),
                "error": str(e),
                "success": False
            }
    
    def handle_errors(self, exception: Exception) -> None:
        """Handle extraction errors."""
        logger.error(f"NY Tableau extractor error: {exception}")
        
        # Reset session on certain errors
        if "session" in str(exception).lower():
            self.session_id = None
            logger.info("Session reset due to error")
    
    def cleanup(self) -> None:
        """Cleanup resources."""
        if self.session:
            self.session.close()
            logger.info("✓ Session closed")
    
    def _close_session(self) -> None:
        """Close the current session (required by BaseExtractor)."""
        self.cleanup()
    
    def _make_request(self, url: str, method: str = "GET", **kwargs) -> Any:
        """Make HTTP request (required by BaseExtractor)."""
        if not self.session:
            self.setup_session()
        
        if method.upper() == "GET":
            return self.session.get(url, **kwargs)
        elif method.upper() == "POST":
            return self.session.post(url, **kwargs)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
    
    def get_method(self) -> str:
        """Get the extraction method name (required by BaseExtractor)."""
        return "tableau_api" 