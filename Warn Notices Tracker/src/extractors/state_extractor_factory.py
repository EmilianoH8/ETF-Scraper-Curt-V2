"""
Factory for creating state-specific WARN data extractors.

This factory pattern allows easy addition of new states by registering
new extractor classes.
"""

from setup_imports import *
from scraping_hub import BaseExtractor
from typing import Dict, Type, Optional
from loguru import logger

from ..models.warn_models import StateConfig


class StateExtractorFactory:
    """
    Factory for creating state-specific WARN data extractors.
    
    This allows the framework to be easily extended to support additional states
    by registering new extractor classes.
    """
    
    _extractors: Dict[str, Type[BaseExtractor]] = {}
    _configs: Dict[str, StateConfig] = {}
    
    @classmethod
    def register_extractor(cls, state_code: str, extractor_class: Type[BaseExtractor], config: StateConfig):
        """
        Register an extractor for a specific state.
        
        Args:
            state_code: Two-letter state code (e.g., 'NY', 'CA')
            extractor_class: Class that inherits from BaseExtractor
            config: StateConfig with state-specific configuration
        """
        state_code = state_code.upper()
        cls._extractors[state_code] = extractor_class
        cls._configs[state_code] = config
        logger.info(f"Registered extractor for state: {state_code}")
    
    @classmethod
    def create_extractor(cls, state_code: str, **kwargs) -> Optional[BaseExtractor]:
        """
        Create an extractor instance for the specified state.
        
        Args:
            state_code: Two-letter state code
            **kwargs: Additional arguments to pass to extractor constructor
            
        Returns:
            BaseExtractor instance or None if state not supported
        """
        state_code = state_code.upper()
        
        if state_code not in cls._extractors:
            logger.error(f"No extractor registered for state: {state_code}")
            logger.info(f"Supported states: {list(cls._extractors.keys())}")
            return None
        
        extractor_class = cls._extractors[state_code]
        config = cls._configs[state_code]
        
        try:
            # Create extractor instance with config and additional kwargs
            extractor = extractor_class(config=config, **kwargs)
            logger.info(f"Created {extractor_class.__name__} for state: {state_code}")
            return extractor
        except Exception as e:
            logger.error(f"Failed to create extractor for {state_code}: {e}")
            return None
    
    @classmethod
    def get_supported_states(cls) -> list[str]:
        """Get list of supported state codes."""
        return list(cls._extractors.keys())
    
    @classmethod
    def get_state_config(cls, state_code: str) -> Optional[StateConfig]:
        """Get configuration for a specific state."""
        return cls._configs.get(state_code.upper())
    
    @classmethod
    def is_state_supported(cls, state_code: str) -> bool:
        """Check if a state is supported."""
        return state_code.upper() in cls._extractors 