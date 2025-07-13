"""
Email notification utility for JP Morgan Asset Management fund scraper.
Handles sending reports, alerts, and daily summaries via email.
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime
from loguru import logger

from ..models.fund_models import DailyReport


class EmailNotifier:
    """Email notification handler for scraping reports."""
    
    def __init__(self, smtp_config: Dict[str, Any]):
        """
        Initialize email notifier with SMTP configuration.
        
        Args:
            smtp_config: Dictionary with SMTP settings
                - server: SMTP server hostname
                - port: SMTP port (587 for TLS, 465 for SSL)
                - username: SMTP username
                - password: SMTP password
                - from_email: Sender email address
                - from_name: Sender display name
                - to_emails: List of recipient email addresses
                - use_tls: Whether to use TLS encryption
        """
        self.smtp_config = smtp_config
        self.validate_config()
        
        logger.info(f"Email notifier initialized for {len(self.smtp_config['to_emails'])} recipients")
    
    def validate_config(self):
        """Validate SMTP configuration."""
        required_fields = ['server', 'port', 'username', 'password', 'from_email', 'to_emails']
        
        for field in required_fields:
            if field not in self.smtp_config:
                raise ValueError(f"Missing required SMTP config field: {field}")
        
        if not isinstance(self.smtp_config['to_emails'], list):
            raise ValueError("to_emails must be a list")
        
        if not self.smtp_config['to_emails']:
            raise ValueError("At least one recipient email must be specified")
    
    def send_daily_report(self, report: DailyReport, comparison_data: Optional[Dict[str, Any]] = None):
        """
        Send daily scraping report via email.
        
        Args:
            report: DailyReport with execution summary
            comparison_data: Optional comparison data from previous run
        """
        try:
            subject = self._generate_report_subject(report)
            body = self._generate_report_body(report, comparison_data)
            
            # Attach report file if available
            attachments = []
            if report.output_file and Path(report.output_file).exists():
                attachments.append(report.output_file)
            
            self._send_email(subject, body, attachments)
            
            logger.info("Daily report email sent successfully")
            
        except Exception as e:
            logger.error(f"Failed to send daily report email: {e}")
    
    def send_error_alert(self, error_message: str, context: Dict[str, Any]):
        """
        Send error alert email.
        
        Args:
            error_message: Main error message
            context: Additional context information
        """
        try:
            subject = f"🚨 JP Morgan Scraper Error Alert - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            
            body = f"""
JP Morgan Asset Management Fund Scraper encountered a critical error:

ERROR: {error_message}

Context:
"""
            
            for key, value in context.items():
                body += f"  {key}: {value}\n"
            
            body += f"""
Timestamp: {datetime.now().isoformat()}
Server: {context.get('server', 'Unknown')}

Please check the logs for more details and investigate the issue.
            """
            
            self._send_email(subject, body)
            
            logger.info("Error alert email sent successfully")
            
        except Exception as e:
            logger.error(f"Failed to send error alert email: {e}")
    
    def send_changes_notification(self, changes: List[Dict[str, Any]], summary: Dict[str, int]):
        """
        Send notification about data changes detected.
        
        Args:
            changes: List of change records
            summary: Summary of changes (new, updated, etc.)
        """
        try:
            subject = f"📊 JP Morgan Fund Data Changes - {summary['updated_funds']} Updates, {summary['new_funds']} New"
            
            body = f"""
JP Morgan Asset Management Fund Data Changes Detected

Summary:
  • New Funds: {summary['new_funds']}
  • Updated Funds: {summary['updated_funds']}
  • Unchanged Funds: {summary['unchanged_funds']}
  • Total Changes: {len(changes)}

"""
            
            if changes:
                body += "Detailed Changes:\n"
                body += "=" * 50 + "\n"
                
                for change in changes[:20]:  # Limit to first 20 changes
                    body += f"• {change['ticker']} - {change['field']}: "
                    body += f"{change['old_value']} → {change['new_value']}\n"
                
                if len(changes) > 20:
                    body += f"\n... and {len(changes) - 20} more changes\n"
            
            body += f"""

Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

See attached Excel file for complete data.
            """
            
            self._send_email(subject, body)
            
            logger.info(f"Changes notification email sent for {len(changes)} changes")
            
        except Exception as e:
            logger.error(f"Failed to send changes notification email: {e}")
    
    def test_email_connection(self) -> bool:
        """
        Test email connection and send a test message.
        
        Returns:
            True if test successful, False otherwise
        """
        try:
            subject = "🧪 JP Morgan Scraper - Email Test"
            body = f"""
This is a test email from the JP Morgan Asset Management Fund Scraper.

If you receive this message, email notifications are configured correctly.

Test performed at: {datetime.now().isoformat()}
            """
            
            self._send_email(subject, body)
            logger.info("Test email sent successfully")
            return True
            
        except Exception as e:
            logger.error(f"Email connection test failed: {e}")
            return False
    
    def _generate_report_subject(self, report: DailyReport) -> str:
        """Generate email subject for daily report."""
        if report.successful_scrapes == 0:
            status = "❌ FAILED"
        elif report.failed_scrapes == 0:
            status = "✅ SUCCESS"
        else:
            status = "⚠️ PARTIAL"
        
        return f"{status} JP Morgan Fund Scraper - {report.date} ({report.successful_scrapes}/{report.total_funds})"
    
    def _generate_report_body(self, report: DailyReport, comparison_data: Optional[Dict[str, Any]]) -> str:
        """Generate email body for daily report."""
        success_rate = (report.successful_scrapes / report.total_funds * 100) if report.total_funds > 0 else 0
        
        body = f"""
JP Morgan Asset Management Fund Scraper - Daily Report
Date: {report.date}

EXECUTION SUMMARY:
{'=' * 50}
• Total Funds Processed: {report.total_funds}
• Successful Scrapes: {report.successful_scrapes}
• Failed Scrapes: {report.failed_scrapes}
• Success Rate: {success_rate:.1f}%
• Execution Time: {report.execution_time:.2f} seconds

"""
        
        # Add data changes summary if available
        if comparison_data:
            body += f"""
DATA CHANGES:
{'=' * 50}
• New Funds: {report.new_funds}
• Updated Funds: {report.updated_funds}
• Unchanged Funds: {report.unchanged_funds}

"""
            
            if comparison_data.get('changes'):
                body += f"Recent Changes ({len(comparison_data['changes'])} total):\n"
                for change in comparison_data['changes'][:10]:  # Show first 10
                    body += f"  • {change['ticker']} {change['field']}: {change['old_value']} → {change['new_value']}\n"
                
                if len(comparison_data['changes']) > 10:
                    body += f"  ... and {len(comparison_data['changes']) - 10} more changes\n"
        
        # Add error summary if there were failures
        if report.errors:
            body += f"""
ERRORS ENCOUNTERED:
{'=' * 50}
"""
            for error_type, count in report.errors.items():
                body += f"• {error_type}: {count} occurrences\n"
        
        body += f"""

FILES GENERATED:
{'=' * 50}
• Data File: {Path(report.output_file).name if report.output_file else 'None'}
• Backup File: {Path(report.backup_file).name if report.backup_file else 'None'}

Timestamp: {datetime.now().isoformat()}

This is an automated message from the JP Morgan Asset Management Fund Scraper.
        """
        
        return body
    
    def _send_email(self, subject: str, body: str, attachments: Optional[List[str]] = None):
        """
        Send email with optional attachments.
        
        Args:
            subject: Email subject
            body: Email body (plain text)
            attachments: List of file paths to attach
        """
        msg = MIMEMultipart()
        msg['From'] = f"{self.smtp_config.get('from_name', 'JP Morgan Scraper')} <{self.smtp_config['from_email']}>"
        msg['To'] = ', '.join(self.smtp_config['to_emails'])
        msg['Subject'] = subject
        
        # Add body
        msg.attach(MIMEText(body, 'plain'))
        
        # Add attachments if provided
        if attachments:
            for file_path in attachments:
                if Path(file_path).exists():
                    self._add_attachment(msg, file_path)
        
        # Send email
        context = ssl.create_default_context()
        
        with smtplib.SMTP(self.smtp_config['server'], self.smtp_config['port']) as server:
            if self.smtp_config.get('use_tls', True):
                server.starttls(context=context)
            
            server.login(self.smtp_config['username'], self.smtp_config['password'])
            
            text = msg.as_string()
            server.sendmail(self.smtp_config['from_email'], self.smtp_config['to_emails'], text)
    
    def _add_attachment(self, msg: MIMEMultipart, file_path: str):
        """Add file attachment to email message."""
        try:
            with open(file_path, "rb") as attachment:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment.read())
            
            encoders.encode_base64(part)
            
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {Path(file_path).name}',
            )
            
            msg.attach(part)
            logger.debug(f"Added attachment: {file_path}")
            
        except Exception as e:
            logger.warning(f"Failed to add attachment {file_path}: {e}")


def load_email_config() -> Optional[Dict[str, Any]]:
    """
    Load email configuration from environment variables or config file.
    
    Returns:
        Email configuration dictionary or None if not configured
    """
    import os
    
    # Try to load from environment variables
    config = {
        'server': os.getenv('SMTP_SERVER'),
        'port': int(os.getenv('SMTP_PORT', 587)),
        'username': os.getenv('SMTP_USERNAME'),
        'password': os.getenv('SMTP_PASSWORD'),
        'from_email': os.getenv('SMTP_FROM_EMAIL'),
        'from_name': os.getenv('SMTP_FROM_NAME', 'JP Morgan Scraper'),
        'to_emails': os.getenv('SMTP_TO_EMAILS', '').split(',') if os.getenv('SMTP_TO_EMAILS') else [],
        'use_tls': os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
    }
    
    # Check if all required fields are present
    required_fields = ['server', 'username', 'password', 'from_email']
    if not all(config.get(field) for field in required_fields):
        logger.warning("Email configuration incomplete. Email notifications disabled.")
        return None
    
    if not config['to_emails'] or not config['to_emails'][0]:
        logger.warning("No recipient emails configured. Email notifications disabled.")
        return None
    
    # Clean up email list
    config['to_emails'] = [email.strip() for email in config['to_emails'] if email.strip()]
    
    logger.info(f"Email configuration loaded for {len(config['to_emails'])} recipients")
    return config


def create_email_notifier() -> Optional[EmailNotifier]:
    """
    Create EmailNotifier instance if configuration is available.
    
    Returns:
        EmailNotifier instance or None if not configured
    """
    config = load_email_config()
    if not config:
        return None
    
    try:
        return EmailNotifier(config)
    except Exception as e:
        logger.error(f"Failed to create email notifier: {e}")
        return None 