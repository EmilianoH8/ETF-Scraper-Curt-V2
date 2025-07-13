# WARN Notices Tracker

A scalable framework for scraping **Worker Adjustment and Retraining Notification (WARN)** data from various state Department of Labor websites.

## 🎯 Features

- **Multi-State Support**: Easily extensible to support additional states
Easy state addition: Just add config + extractor class
Factory pattern: Automatic extractor selection

- **Robust Tableau Handling**: Specialized extractors for Tableau Public dashboards
- **Advanced Anti-Detection**: Uses curl_cffi with browser fingerprinting
- **Comprehensive Data Models**: Standardized Pydantic models for all states
- **Multiple Output Formats**: JSON, CSV, SQLite, Excel support
- **Built-in Validation**: Data cleaning and deduplication
- **Scalable Architecture**: Factory pattern for easy state additions

## 🏗️ Architecture

The framework is built on the **scraping_hub** base classes and follows the **Extract-Transform-Load (ETL)** pattern:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EXTRACTORS    │    │  TRANSFORMERS   │    │    LOADERS      │
│                 │    │                 │    │                 │
│ • NY Tableau    │───▶│ • Data Cleaning │───▶│ • JSON Export   │
│ • CA API        │    │ • Validation    │    │ • CSV Export    │
│ • TX HTML       │    │ • Standardization│    │ • SQLite DB     │
│ • [More...]     │    │ • Deduplication │    │ • Excel Export  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Currently Supported States

| State | Source Type | Status | Notes |
|-------|-------------|---------|-------|
| **NY** | Tableau Dashboard | ✅ Active | Reverse-engineered from HAR analysis |
| CA | API | 🔄 Planned | Direct API access |
| TX | HTML Scraping | 🔄 Planned | Traditional web scraping |
| FL | Mixed | 🔄 Planned | API + HTML hybrid |

## 📦 Installation

### 1. Clone and Setup

```bash
git clone [repository-url]
cd warn-notices-tracker
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Verify scraping_hub Access

The framework depends on the **scraping_hub** framework:

```bash
python -c "from setup_imports import *; print('✓ Scraping Hub available')"
```

## 🔧 Usage

### Quick Start

```bash
# List supported states
python main.py --list-states

# Scrape NY data to all formats
python main.py --state NY --output all

# Scrape NY data to JSON only
python main.py --state NY --output json

# Verbose logging
python main.py --state NY --output csv --verbose
```

### Programmatic Usage

```python
from src.extractors.state_extractor_factory import StateExtractorFactory
from src.transformers.warn_transformer import WarnTransformer
from src.loaders.warn_loader import WarnLoader

# Create extractor for NY
extractor = StateExtractorFactory.create_extractor("NY")

# Extract raw data
raw_data = extractor.extract_data()

# Transform to standard format
transformer = WarnTransformer()
processed_notices = transformer.transform(raw_data)

# Load to multiple formats
loader = WarnLoader()
loader.load(processed_notices, destination="all", state="NY")
```

## 📊 Data Model

All state data is standardized to the `WarnNotice` model:

```python
class WarnNotice(BaseModel):
    # Core fields
    state: str
    notice_id: Optional[str]
    company_name: str
    
    # Location details
    location_city: Optional[str]
    location_county: Optional[str]
    wdb_region: Optional[str]
    
    # Dates
    warn_date: Optional[date]
    effective_date: Optional[date]
    notice_date: Optional[date]
    
    # Employment impact
    employees_affected: Optional[int]
    employees_warned: Optional[int]
    layoff_type: LayoffType
    
    # Additional metadata...
```

## 🔍 NY Tableau Implementation

The NY extractor reverse-engineers the Tableau Public dashboard:

### Key Features:
- **Session Bootstrap**: Initializes Tableau session with proper headers
- **API Discovery**: Uses endpoints discovered from HAR analysis
- **Anti-Detection**: Chrome fingerprinting via curl_cffi
- **Retry Logic**: Automatic retry on failures

### Tableau Endpoints Used:
```
POST /vizql/w/WorkerAdjustmentRetrainingNotificationWARN/v/WARN/bootstrapSession/sessions/{session_id}
POST /vizql/w/.../sessions/{session_id}/commands/tabdoc/categorical-filter
POST /vizql/w/.../sessions/{session_id}/commands/tabsrv/render-tooltip-server
```

## 📁 Output Structure

```
data/exports/
├── json/
│   └── warn_notices_ny_20240115_143022.json
├── csv/
│   └── warn_notices_ny_20240115_143022.csv
├── sqlite/
│   └── warn_notices_ny.db
├── excel/
│   └── warn_notices_ny_20240115_143022.xlsx
└── summaries/
    └── warn_notices_ny_20240115_143022_summary.json
```

## 🔧 Adding New States

### 1. Create State Configuration

```python
# src/config/states.py
CA_CONFIG = StateConfig(
    state_code="CA",
    state_name="California",
    source_type="api",
    base_url="https://edd.ca.gov/api/warn",
    api_endpoint="/notices",
    field_mappings={
        "company": "company_name",
        "layoff_date": "effective_date",
        # ... more mappings
    }
)
```

### 2. Create State Extractor

```python
# src/extractors/ca_api_extractor.py
class CAApiExtractor(BaseExtractor):
    def extract_data(self, **kwargs) -> Dict[str, Any]:
        # Implementation for CA API
        pass
```

### 3. Register Extractor

```python
# main.py
CA_config = get_state_config("CA")
StateExtractorFactory.register_extractor("CA", CAApiExtractor, CA_config)
```

### 4. Update Transformer

```python
# src/transformers/warn_transformer.py
self.state_processors["CA"] = self._process_ca_data
```

## 🧪 Testing

```bash
# Test NY scraper functionality
python test_ny_scraper.py

# Test with verbose logging
python test_ny_scraper.py --verbose
```

## 📈 Performance & Scaling

### Anti-Detection Features:
- **Browser Fingerprinting**: curl_cffi with Chrome TLS fingerprinting
- **Header Rotation**: Realistic browser headers
- **Rate Limiting**: Configurable delays between requests
- **Session Management**: Proper session handling and cleanup

### Scaling Considerations:
- **Concurrent States**: Run multiple states in parallel
- **Caching**: Redis support for session caching
- **Database**: SQLite for development, PostgreSQL for production
- **Monitoring**: Comprehensive logging and error tracking

## 🛡️ Error Handling

The framework includes robust error handling:

- **Retry Logic**: Automatic retries with exponential backoff
- **Graceful Degradation**: Continues processing even if some records fail
- **Validation**: Data validation at multiple stages
- **Logging**: Detailed logging for debugging and monitoring

## 📝 Data Quality

### Validation Features:
- **Required Fields**: Ensures critical fields are present
- **Date Validation**: Logical date consistency checks
- **Employee Counts**: Validates numeric fields
- **Deduplication**: Removes duplicate notices based on unique keys

### Data Cleaning:
- **Text Normalization**: Consistent text formatting
- **Phone Number Formatting**: Standardized phone number format
- **Email Validation**: Basic email format validation
- **Address Standardization**: Consistent address formatting

## 🤝 Contributing

### Adding a New State:

1. **Research**: Analyze the state's WARN data source
2. **Configure**: Add state configuration
3. **Implement**: Create state-specific extractor
4. **Transform**: Add transformation logic
5. **Test**: Validate with test data
6. **Document**: Update README and documentation

### Development Setup:

```bash
# Install development dependencies
pip install -r requirements.txt

# Run tests
python -m pytest tests/

# Format code
black src/
```

## 📊 Monitoring & Maintenance

### Log Analysis:
```bash
# View recent logs
tail -f logs/warn_tracker_$(date +%Y%m%d).log

# Check for errors
grep "ERROR" logs/warn_tracker_*.log
```

### Database Maintenance:
```bash
# Check SQLite database
sqlite3 data/exports/sqlite/warn_notices_ny.db ".schema"

# View recent records
sqlite3 data/exports/sqlite/warn_notices_ny.db "SELECT * FROM warn_notices ORDER BY scraped_at DESC LIMIT 10"
```

## 🔮 Future Enhancements

- **API Integration**: RESTful API for external access
- **Web Dashboard**: Real-time monitoring dashboard
- **Notifications**: Email/Slack alerts for new notices
- **Machine Learning**: Trend analysis and predictions
- **Geographic Analysis**: Mapping and regional insights

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues, questions, or contributions:
- Create an issue in the repository
- Check the logs for detailed error information
- Review the documentation for usage examples

---

**Built with ❤️ using the scraping_hub framework** 