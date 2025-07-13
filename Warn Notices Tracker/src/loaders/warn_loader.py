"""
WARN data loader for saving processed WARN notices to various
storage formats and destinations.
"""

from setup_imports import *
from scraping_hub import BaseLoader
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import csv
import sqlite3
from pathlib import Path
from loguru import logger
import pandas as pd

from ..models.warn_models import WarnNotice, WarnSummary


class WarnLoader(BaseLoader):
    """
    Loader for saving WARN data to multiple formats and destinations.
    
    Supports JSON, CSV, SQLite, and Excel outputs with automatic
    file naming and deduplication.
    """
    
    def __init__(self, output_dir: str = "data/exports", **kwargs):
        """
        Initialize WARN loader.
        
        Args:
            output_dir: Base directory for saving files
        """
        super().__init__(**kwargs)
        self.output_dir = Path(output_dir)
        self.setup_storage()
    
    def setup_storage(self) -> None:
        """Setup output directories and storage structure."""
        # Create directory structure
        self.output_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / "json").mkdir(exist_ok=True)
        (self.output_dir / "csv").mkdir(exist_ok=True)
        (self.output_dir / "sqlite").mkdir(exist_ok=True)
        (self.output_dir / "excel").mkdir(exist_ok=True)
        (self.output_dir / "summaries").mkdir(exist_ok=True)
        
        logger.info(f"✓ Storage directories created at: {self.output_dir}")
    
    def load(self, data: List[WarnNotice], destination: str = "all", **kwargs) -> None:
        """
        Load WARN data to specified destination(s).
        
        Args:
            data: List of WarnNotice objects to save
            destination: Where to save ("json", "csv", "sqlite", "excel", "all")
            **kwargs: Additional options (state, date_suffix, etc.)
        """
        if not data:
            logger.warning("No data to load")
            return
        
        state = kwargs.get("state", data[0].state if data else "unknown")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Generate file prefix
        file_prefix = f"warn_notices_{state.lower()}_{timestamp}"
        
        logger.info(f"Loading {len(data)} WARN notices for {state} to {destination}")
        
        # Load to specified destination(s)
        if destination == "all" or destination == "json":
            self._save_to_json(data, file_prefix)
        
        if destination == "all" or destination == "csv":
            self._save_to_csv(data, file_prefix)
        
        if destination == "all" or destination == "sqlite":
            self._save_to_sqlite(data, state)
        
        if destination == "all" or destination == "excel":
            self._save_to_excel(data, file_prefix)
        
        # Generate and save summary
        summary = self._generate_summary(data, state)
        self._save_summary(summary, file_prefix)
        
        logger.info(f"✓ Data successfully loaded to {destination}")
    
    def _save_to_json(self, data: List[WarnNotice], file_prefix: str) -> None:
        """Save data to JSON format."""
        try:
            output_file = self.output_dir / "json" / f"{file_prefix}.json"
            
            # Convert to serializable format
            json_data = {
                "metadata": {
                    "total_notices": len(data),
                    "generated_at": datetime.now().isoformat(),
                    "version": "1.0"
                },
                "notices": [notice.dict() for notice in data]
            }
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"✓ JSON saved: {output_file}")
            
        except Exception as e:
            logger.error(f"Failed to save JSON: {e}")
    
    def _save_to_csv(self, data: List[WarnNotice], file_prefix: str) -> None:
        """Save data to CSV format."""
        try:
            output_file = self.output_dir / "csv" / f"{file_prefix}.csv"
            
            # Convert to DataFrame for easier CSV handling
            df_data = []
            for notice in data:
                notice_dict = notice.dict()
                # Flatten nested dictionaries
                if notice_dict.get('state_specific_data'):
                    notice_dict.pop('state_specific_data')  # Remove complex nested data
                df_data.append(notice_dict)
            
            df = pd.DataFrame(df_data)
            
            # Save to CSV
            df.to_csv(output_file, index=False, encoding='utf-8')
            
            logger.info(f"✓ CSV saved: {output_file}")
            
        except Exception as e:
            logger.error(f"Failed to save CSV: {e}")
    
    def _save_to_sqlite(self, data: List[WarnNotice], state: str) -> None:
        """Save data to SQLite database."""
        try:
            db_file = self.output_dir / "sqlite" / f"warn_notices_{state.lower()}.db"
            
            # Create connection and table
            conn = sqlite3.connect(db_file)
            
            # Create table if not exists
            self._create_sqlite_table(conn)
            
            # Insert data
            for notice in data:
                self._insert_sqlite_record(conn, notice)
            
            conn.commit()
            conn.close()
            
            logger.info(f"✓ SQLite saved: {db_file}")
            
        except Exception as e:
            logger.error(f"Failed to save SQLite: {e}")
    
    def _create_sqlite_table(self, conn: sqlite3.Connection) -> None:
        """Create SQLite table structure."""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS warn_notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            state TEXT NOT NULL,
            notice_id TEXT,
            company_name TEXT NOT NULL,
            company_address TEXT,
            location_city TEXT,
            location_county TEXT,
            wdb_region TEXT,
            warn_date DATE,
            notice_date DATE,
            effective_date DATE,
            received_date DATE,
            employees_affected INTEGER,
            employees_warned INTEGER,
            temporary_layoffs INTEGER,
            permanent_layoffs INTEGER,
            layoff_type TEXT,
            closure_type TEXT,
            reason TEXT,
            industry TEXT,
            naics_code TEXT,
            contact_name TEXT,
            contact_phone TEXT,
            contact_email TEXT,
            status TEXT,
            is_amended BOOLEAN,
            source_url TEXT,
            scraped_at TIMESTAMP,
            last_updated TIMESTAMP,
            data_source TEXT,
            unique_key TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        conn.execute(create_table_sql)
        
        # Create indexes for performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_state ON warn_notices(state);",
            "CREATE INDEX IF NOT EXISTS idx_warn_date ON warn_notices(warn_date);",
            "CREATE INDEX IF NOT EXISTS idx_company_name ON warn_notices(company_name);",
            "CREATE INDEX IF NOT EXISTS idx_unique_key ON warn_notices(unique_key);"
        ]
        
        for index in indexes:
            conn.execute(index)
    
    def _insert_sqlite_record(self, conn: sqlite3.Connection, notice: WarnNotice) -> None:
        """Insert a single WARN notice into SQLite."""
        insert_sql = """
        INSERT OR REPLACE INTO warn_notices (
            state, notice_id, company_name, company_address, location_city,
            location_county, wdb_region, warn_date, notice_date, effective_date,
            received_date, employees_affected, employees_warned, temporary_layoffs,
            permanent_layoffs, layoff_type, closure_type, reason, industry,
            naics_code, contact_name, contact_phone, contact_email, status,
            is_amended, source_url, scraped_at, last_updated, data_source, unique_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        values = (
            notice.state,
            notice.notice_id,
            notice.company_name,
            notice.company_address,
            notice.location_city,
            notice.location_county,
            notice.wdb_region,
            notice.warn_date,
            notice.notice_date,
            notice.effective_date,
            notice.received_date,
            notice.employees_affected,
            notice.employees_warned,
            notice.temporary_layoffs,
            notice.permanent_layoffs,
            notice.layoff_type,
            notice.closure_type,
            notice.reason,
            notice.industry,
            notice.naics_code,
            notice.contact_name,
            notice.contact_phone,
            notice.contact_email,
            notice.status,
            notice.is_amended,
            notice.source_url,
            notice.scraped_at,
            notice.last_updated,
            notice.data_source,
            notice.get_unique_key()
        )
        
        conn.execute(insert_sql, values)
    
    def _save_to_excel(self, data: List[WarnNotice], file_prefix: str) -> None:
        """Save data to Excel format with multiple sheets."""
        try:
            output_file = self.output_dir / "excel" / f"{file_prefix}.xlsx"
            
            # Convert to DataFrame
            df_data = []
            for notice in data:
                notice_dict = notice.dict()
                # Remove complex nested data for Excel
                if notice_dict.get('state_specific_data'):
                    notice_dict.pop('state_specific_data')
                df_data.append(notice_dict)
            
            df = pd.DataFrame(df_data)
            
            # Create Excel writer with multiple sheets
            with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
                # Main data sheet
                df.to_excel(writer, sheet_name='WARN_Notices', index=False)
                
                # Summary sheet
                summary_data = self._create_excel_summary(data)
                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='Summary', index=False)
                
                # Industry breakdown
                industry_breakdown = self._create_industry_breakdown(data)
                industry_df = pd.DataFrame(industry_breakdown)
                industry_df.to_excel(writer, sheet_name='By_Industry', index=False)
            
            logger.info(f"✓ Excel saved: {output_file}")
            
        except Exception as e:
            logger.error(f"Failed to save Excel: {e}")
    
    def _create_excel_summary(self, data: List[WarnNotice]) -> List[Dict]:
        """Create summary data for Excel."""
        total_employees = sum(notice.employees_affected or 0 for notice in data)
        
        return [
            {"Metric": "Total Notices", "Value": len(data)},
            {"Metric": "Total Employees Affected", "Value": total_employees},
            {"Metric": "Date Range Start", "Value": min([n.warn_date for n in data if n.warn_date], default="N/A")},
            {"Metric": "Date Range End", "Value": max([n.warn_date for n in data if n.warn_date], default="N/A")},
            {"Metric": "Generated At", "Value": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        ]
    
    def _create_industry_breakdown(self, data: List[WarnNotice]) -> List[Dict]:
        """Create industry breakdown for Excel."""
        industry_counts = {}
        industry_employees = {}
        
        for notice in data:
            industry = notice.industry or "Unknown"
            industry_counts[industry] = industry_counts.get(industry, 0) + 1
            industry_employees[industry] = industry_employees.get(industry, 0) + (notice.employees_affected or 0)
        
        breakdown = []
        for industry in sorted(industry_counts.keys()):
            breakdown.append({
                "Industry": industry,
                "Number_of_Notices": industry_counts[industry],
                "Total_Employees_Affected": industry_employees[industry]
            })
        
        return breakdown
    
    def _generate_summary(self, data: List[WarnNotice], state: str) -> WarnSummary:
        """Generate summary statistics."""
        if not data:
            return WarnSummary(
                state=state,
                total_notices=0,
                total_employees_affected=0
            )
        
        total_employees = sum(notice.employees_affected or 0 for notice in data)
        dates = [notice.warn_date for notice in data if notice.warn_date]
        
        # Industry breakdown
        industry_counts = {}
        for notice in data:
            industry = notice.industry or "Unknown"
            industry_counts[industry] = industry_counts.get(industry, 0) + 1
        
        top_industries = [
            {"industry": k, "count": v} 
            for k, v in sorted(industry_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        # Company breakdown
        company_employees = {}
        for notice in data:
            company = notice.company_name
            company_employees[company] = company_employees.get(company, 0) + (notice.employees_affected or 0)
        
        top_companies = [
            {"company": k, "employees_affected": v}
            for k, v in sorted(company_employees.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        # Region breakdown
        region_counts = {}
        for notice in data:
            region = notice.wdb_region or "Unknown"
            region_counts[region] = region_counts.get(region, 0) + 1
        
        top_regions = [
            {"region": k, "count": v}
            for k, v in sorted(region_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        return WarnSummary(
            state=state,
            total_notices=len(data),
            total_employees_affected=total_employees,
            date_range_start=min(dates) if dates else None,
            date_range_end=max(dates) if dates else None,
            top_industries=top_industries,
            top_companies=top_companies,
            top_regions=top_regions
        )
    
    def _save_summary(self, summary: WarnSummary, file_prefix: str) -> None:
        """Save summary to JSON file."""
        try:
            output_file = self.output_dir / "summaries" / f"{file_prefix}_summary.json"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(summary.dict(), f, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"✓ Summary saved: {output_file}")
            
        except Exception as e:
            logger.error(f"Failed to save summary: {e}")
    
    def deduplicate(self, data: List[WarnNotice]) -> List[WarnNotice]:
        """
        Remove duplicate notices based on unique keys.
        
        Args:
            data: List of WARN notices
            
        Returns:
            Deduplicated list
        """
        seen_keys = set()
        unique_notices = []
        
        for notice in data:
            key = notice.get_unique_key()
            if key not in seen_keys:
                seen_keys.add(key)
                unique_notices.append(notice)
            else:
                logger.debug(f"Duplicate removed: {notice.company_name}")
        
        removed = len(data) - len(unique_notices)
        if removed > 0:
            logger.info(f"Removed {removed} duplicate notices")
        
        return unique_notices
    
    def load_existing_data(self, state: str) -> List[WarnNotice]:
        """
        Load existing data from SQLite for comparison/deduplication.
        
        Args:
            state: State code to load data for
            
        Returns:
            List of existing WarnNotice objects
        """
        try:
            db_file = self.output_dir / "sqlite" / f"warn_notices_{state.lower()}.db"
            
            if not db_file.exists():
                return []
            
            conn = sqlite3.connect(db_file)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.execute("SELECT * FROM warn_notices WHERE state = ?", (state,))
            rows = cursor.fetchall()
            conn.close()
            
            # Convert to WarnNotice objects (simplified)
            existing_notices = []
            for row in rows:
                # Create basic WarnNotice object - full reconstruction would be more complex
                notice = WarnNotice(
                    state=row['state'],
                    company_name=row['company_name'],
                    notice_id=row['notice_id'],
                    warn_date=row['warn_date'],
                    effective_date=row['effective_date'],
                    employees_affected=row['employees_affected']
                )
                existing_notices.append(notice)
            
            logger.info(f"Loaded {len(existing_notices)} existing notices for {state}")
            return existing_notices
            
        except Exception as e:
            logger.error(f"Failed to load existing data: {e}")
            return [] 