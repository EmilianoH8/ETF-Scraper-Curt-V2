"""
State-specific configurations for WARN data sources.

This file contains the configuration for each supported state,
making it easy to add new states to the framework.
"""

from ..models.warn_models import StateConfig

# New York State Configuration
NY_CONFIG = StateConfig(
    state_code="NY",
    state_name="New York",
    source_type="tableau",
    base_url="https://public.tableau.com/views/WorkerAdjustmentRetrainingNotificationWARN/WARN",
    tableau_workbook="WorkerAdjustmentRetrainingNotificationWARN",
    tableau_view="WARN",
    field_mappings={
        "warn_number": "notice_id",
        "company_name": "company_name",
        "location_city": "location_city",
        "location_county": "location_county",
        "wdb_region": "wdb_region",
        "warn_date": "warn_date",
        "effective_date": "effective_date",
        "employees_affected": "employees_affected",
        "employees_warned": "employees_warned",
        "reason": "reason",
        "industry": "industry",
        "contact_name": "contact_name",
        "contact_phone": "contact_phone",
        "contact_email": "contact_email"
    },
    date_formats=["%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y"],
    update_frequency="daily",
    is_active=True
)

# Configuration registry
STATE_CONFIGS = {
    "NY": NY_CONFIG,
    # Add more states as they're implemented
    # "CA": CA_CONFIG,
    # "TX": TX_CONFIG,
    # "FL": FL_CONFIG,
}

def get_state_config(state_code: str) -> StateConfig:
    """Get configuration for a specific state."""
    return STATE_CONFIGS.get(state_code.upper())

def get_supported_states() -> list[str]:
    """Get list of supported state codes."""
    return list(STATE_CONFIGS.keys())

def is_state_supported(state_code: str) -> bool:
    """Check if a state is supported."""
    return state_code.upper() in STATE_CONFIGS 