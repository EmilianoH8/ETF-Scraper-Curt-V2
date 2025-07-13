#!/usr/bin/env python3
"""
Municipal PDF Extractor - A GUI tool for extracting text and tables from municipal bond documents
"""

import os
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
import pdfplumber
import pandas as pd
import re

# Set appearance mode and color theme
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class MuniPDFExtractor(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # Initialize processing state
        self.is_processing = False
        self.cancel_processing = False
        
        # Configure main window
        self.title("Municipal PDF Extractor")
        self.geometry("800x900")
        self.minsize(700, 800)
        
        # Configure grid weights
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(4, weight=1)  # Log section expands
        
        # Initialize variables
        self.pdf_file_var = tk.StringVar()
        self.output_dir_var = tk.StringVar()
        self.chunk_size_var = tk.StringVar(value="100")
        self.extract_text_var = tk.BooleanVar(value=True)
        self.extract_tables_var = tk.BooleanVar(value=True)
        self.clean_format_var = tk.BooleanVar(value=True)
        self.flag_empty_var = tk.BooleanVar(value=True)
        self.all_pages_var = tk.BooleanVar(value=True)
        self.start_page_var = tk.StringVar(value="1")
        self.end_page_var = tk.StringVar(value="")
        
        self.create_widgets()
        
    def create_widgets(self):
        """Create all GUI widgets"""
        
        # File Selection Frame
        file_frame = ctk.CTkFrame(self)
        file_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        file_frame.grid_columnconfigure(1, weight=1)
        
        ctk.CTkLabel(file_frame, text="PDF File:", font=("Arial", 12, "bold")).grid(row=0, column=0, padx=10, pady=5, sticky="w")
        self.pdf_file_entry = ctk.CTkEntry(file_frame, textvariable=self.pdf_file_var, width=400)
        self.pdf_file_entry.grid(row=0, column=1, padx=10, pady=5, sticky="ew")
        ctk.CTkButton(file_frame, text="Browse", command=self.browse_pdf_file, width=100).grid(row=0, column=2, padx=10, pady=5)
        
        ctk.CTkLabel(file_frame, text="Output Directory:", font=("Arial", 12, "bold")).grid(row=1, column=0, padx=10, pady=5, sticky="w")
        self.output_dir_entry = ctk.CTkEntry(file_frame, textvariable=self.output_dir_var, width=400)
        self.output_dir_entry.grid(row=1, column=1, padx=10, pady=5, sticky="ew")
        ctk.CTkButton(file_frame, text="Browse", command=self.browse_output_dir, width=100).grid(row=1, column=2, padx=10, pady=5)
        
        # Settings Frame
        settings_frame = ctk.CTkFrame(self)
        settings_frame.grid(row=1, column=0, padx=10, pady=10, sticky="ew")
        settings_frame.grid_columnconfigure(1, weight=1)
        
        ctk.CTkLabel(settings_frame, text="Chunk Size (pages):", font=("Arial", 12, "bold")).grid(row=0, column=0, padx=10, pady=5, sticky="w")
        self.chunk_size_entry = ctk.CTkEntry(settings_frame, textvariable=self.chunk_size_var, width=100)
        self.chunk_size_entry.grid(row=0, column=1, padx=10, pady=5, sticky="w")
        
        # Page Range Selection
        ctk.CTkLabel(settings_frame, text="Page Range:", font=("Arial", 12, "bold")).grid(row=1, column=0, padx=10, pady=(15, 5), sticky="w")
        
        self.all_pages_cb = ctk.CTkCheckBox(settings_frame, text="All pages", variable=self.all_pages_var, command=self.toggle_page_range)
        self.all_pages_cb.grid(row=2, column=0, columnspan=2, padx=10, pady=2, sticky="w")
        
        # Page range frame
        page_range_frame = ctk.CTkFrame(settings_frame)
        page_range_frame.grid(row=3, column=0, columnspan=2, padx=10, pady=2, sticky="ew")
        
        ctk.CTkLabel(page_range_frame, text="From page:").grid(row=0, column=0, padx=5, pady=5, sticky="w")
        self.start_page_entry = ctk.CTkEntry(page_range_frame, textvariable=self.start_page_var, width=80)
        self.start_page_entry.grid(row=0, column=1, padx=5, pady=5, sticky="w")
        
        ctk.CTkLabel(page_range_frame, text="To page:").grid(row=0, column=2, padx=5, pady=5, sticky="w")
        self.end_page_entry = ctk.CTkEntry(page_range_frame, textvariable=self.end_page_var, width=80)
        self.end_page_entry.grid(row=0, column=3, padx=5, pady=5, sticky="w")
        
        ctk.CTkLabel(page_range_frame, text="(leave 'To page' empty for end of document)", font=("Arial", 10)).grid(row=1, column=0, columnspan=4, padx=5, pady=2, sticky="w")
        
        ctk.CTkLabel(settings_frame, text="Processing Options:", font=("Arial", 14, "bold")).grid(row=4, column=0, columnspan=2, padx=10, pady=(15, 5), sticky="w")
        
        self.extract_text_cb = ctk.CTkCheckBox(settings_frame, text="Extract Text", variable=self.extract_text_var)
        self.extract_text_cb.grid(row=5, column=0, columnspan=2, padx=10, pady=2, sticky="w")
        
        self.extract_tables_cb = ctk.CTkCheckBox(settings_frame, text="Extract Tables", variable=self.extract_tables_var)
        self.extract_tables_cb.grid(row=6, column=0, columnspan=2, padx=10, pady=2, sticky="w")
        
        self.clean_format_cb = ctk.CTkCheckBox(settings_frame, text="Clean Formatting", variable=self.clean_format_var)
        self.clean_format_cb.grid(row=7, column=0, columnspan=2, padx=10, pady=2, sticky="w")
        
        self.flag_empty_cb = ctk.CTkCheckBox(settings_frame, text="Flag Empty Pages", variable=self.flag_empty_var)
        self.flag_empty_cb.grid(row=8, column=0, columnspan=2, padx=10, pady=2, sticky="w")
        
        # Control Buttons Frame
        control_frame = ctk.CTkFrame(self)
        control_frame.grid(row=2, column=0, padx=10, pady=10, sticky="ew")
        
        button_frame = ctk.CTkFrame(control_frame)
        button_frame.pack(pady=10)
        
        self.run_button = ctk.CTkButton(button_frame, text="Run Extraction", command=self.run_extraction, 
                                       fg_color="green", hover_color="darkgreen", width=140)
        self.run_button.pack(side="left", padx=5)
        
        self.cancel_button = ctk.CTkButton(button_frame, text="Cancel", command=self.cancel_extraction, 
                                          fg_color="red", hover_color="darkred", width=140, state="disabled")
        self.cancel_button.pack(side="left", padx=5)
        
        self.clear_log_button = ctk.CTkButton(button_frame, text="Clear Log", command=self.clear_log, width=140)
        self.clear_log_button.pack(side="left", padx=5)
        
        self.exit_button = ctk.CTkButton(button_frame, text="Exit", command=self.quit_app, width=140)
        self.exit_button.pack(side="left", padx=5)
        
        # Progress Frame
        progress_frame = ctk.CTkFrame(self)
        progress_frame.grid(row=3, column=0, padx=10, pady=10, sticky="ew")
        progress_frame.grid_columnconfigure(0, weight=1)
        
        self.status_label = ctk.CTkLabel(progress_frame, text="Status: Ready", font=("Arial", 12))
        self.status_label.grid(row=0, column=0, padx=10, pady=5, sticky="w")
        
        self.progress_bar = ctk.CTkProgressBar(progress_frame, width=400)
        self.progress_bar.grid(row=1, column=0, padx=10, pady=5, sticky="ew")
        self.progress_bar.set(0)
        
        self.progress_text = ctk.CTkLabel(progress_frame, text="Progress: 0%", font=("Arial", 10))
        self.progress_text.grid(row=2, column=0, padx=10, pady=5, sticky="w")
        
        # Log Frame
        log_frame = ctk.CTkFrame(self)
        log_frame.grid(row=4, column=0, padx=10, pady=10, sticky="nsew")
        log_frame.grid_columnconfigure(0, weight=1)
        log_frame.grid_rowconfigure(1, weight=1)
        
        ctk.CTkLabel(log_frame, text="Log Output:", font=("Arial", 14, "bold")).grid(row=0, column=0, padx=10, pady=5, sticky="w")
        
        # Create log text widget using tkinter since customtkinter doesn't have a good text widget
        self.log_text = scrolledtext.ScrolledText(log_frame, wrap=tk.WORD, width=80, height=15,
                                                 bg="#212121", fg="white", font=("Courier", 9),
                                                 insertbackground="white", selectbackground="#404040")
        self.log_text.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")
        self.log_text.config(state=tk.DISABLED)
        
        # Initialize progress bar as hidden
        self.progress_bar.grid_remove()
        self.progress_text.grid_remove()
        
        # Initialize page range state
        self.toggle_page_range()
        
    def toggle_page_range(self):
        """Toggle page range inputs based on 'All pages' checkbox"""
        if self.all_pages_var.get():
            self.start_page_entry.configure(state="disabled")
            self.end_page_entry.configure(state="disabled")
        else:
            self.start_page_entry.configure(state="normal")
            self.end_page_entry.configure(state="normal")
        
    def browse_pdf_file(self):
        """Browse for PDF file"""
        filename = filedialog.askopenfilename(
            title="Select PDF File",
            filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")]
        )
        if filename:
            self.pdf_file_var.set(filename)
    
    def browse_output_dir(self):
        """Browse for output directory"""
        dirname = filedialog.askdirectory(title="Select Output Directory")
        if dirname:
            self.output_dir_var.set(dirname)
    
    def run_extraction(self):
        """Start the extraction process"""
        # Validate inputs
        errors = self.validate_inputs()
        if errors:
            messagebox.showerror("Validation Error", "\n".join(f"• {error}" for error in errors))
            return
        
        # Start processing
        self.log_message("Starting PDF extraction process...")
        self.run_button.configure(state="disabled")
        self.cancel_button.configure(state="normal")
        self.progress_bar.grid()
        self.progress_text.grid()
        
        # Start processing in separate thread
        processing_thread = threading.Thread(target=self.run_processing_thread)
        processing_thread.daemon = True
        processing_thread.start()
    
    def cancel_extraction(self):
        """Cancel the extraction process"""
        if self.is_processing:
            self.cancel_processing = True
            self.log_message("Cancelling processing...")
            self.cancel_button.configure(state="disabled")
    
    def clear_log(self):
        """Clear the log window"""
        self.log_text.config(state=tk.NORMAL)
        self.log_text.delete(1.0, tk.END)
        self.log_text.config(state=tk.DISABLED)
        self.log_message("Log cleared")
    
    def quit_app(self):
        """Exit the application"""
        if self.is_processing:
            if messagebox.askyesno("Confirm Exit", "Processing is still running. Are you sure you want to exit?"):
                self.cancel_processing = True
                self.quit()
        else:
            self.quit()
    
    def log_message(self, message):
        """Add a message to the log window with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        
        # Update log in thread-safe way
        def update_log():
            self.log_text.config(state=tk.NORMAL)
            self.log_text.insert(tk.END, log_entry)
            self.log_text.see(tk.END)
            self.log_text.config(state=tk.DISABLED)
        
        # Schedule update on main thread
        self.after(0, update_log)
    
    def update_progress(self, progress_percent, status_text):
        """Update the progress bar and status text"""
        def update_ui():
            self.progress_bar.set(progress_percent / 100)
            self.progress_text.configure(text=f'Progress: {progress_percent}%')
            self.status_label.configure(text=f'Status: {status_text}')
        
        # Schedule update on main thread
        self.after(0, update_ui)
    
    def validate_inputs(self):
        """Validate user inputs before processing"""
        errors = []
        
        # Check PDF file
        pdf_file = self.pdf_file_var.get()
        if not pdf_file:
            errors.append("Please select a PDF file")
        elif not os.path.exists(pdf_file):
            errors.append("Selected PDF file does not exist")
        elif not pdf_file.lower().endswith('.pdf'):
            errors.append("Selected file is not a PDF")
        
        # Check output directory
        output_dir = self.output_dir_var.get()
        if not output_dir:
            errors.append("Please select an output directory")
        elif not os.path.exists(output_dir):
            errors.append("Selected output directory does not exist")
        
        # Check chunk size
        try:
            chunk_size = int(self.chunk_size_var.get())
            if chunk_size <= 0:
                errors.append("Chunk size must be greater than 0")
        except ValueError:
            errors.append("Chunk size must be a valid number")
        
        # Check if at least one extraction option is selected
        if not any([self.extract_text_var.get(), self.extract_tables_var.get()]):
            errors.append("Please select at least one extraction option (text or tables)")
        
        # Check page range if not all pages
        if not self.all_pages_var.get():
            try:
                start_page = int(self.start_page_var.get())
                if start_page <= 0:
                    errors.append("Start page must be greater than 0")
            except ValueError:
                errors.append("Start page must be a valid number")
            
            end_page_str = self.end_page_var.get().strip()
            if end_page_str:  # If end page is specified
                try:
                    end_page = int(end_page_str)
                    if end_page <= 0:
                        errors.append("End page must be greater than 0")
                    elif 'start_page' in locals() and end_page < start_page:
                        errors.append("End page must be greater than or equal to start page")
                except ValueError:
                    errors.append("End page must be a valid number")
        
        return errors
    
    def clean_text(self, text):
        """Clean and format extracted text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common PDF artifacts
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', text)
        
        # Fix common formatting issues
        text = re.sub(r'\s*-\s*\n\s*', '', text)  # Remove hyphenated line breaks
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Normalize paragraph breaks
        
        return text.strip()
    
    def is_empty_page(self, text, threshold=50):
        """Check if a page is essentially empty"""
        if not text:
            return True
        
        # Remove whitespace and check length
        clean_text = re.sub(r'\s+', '', text)
        return len(clean_text) < threshold
    
    def extract_tables_from_page(self, page):
        """Extract tables from a single page"""
        tables = []
        try:
            # Try to extract tables using pdfplumber
            page_tables = page.extract_tables()
            
            for i, table in enumerate(page_tables):
                if table and len(table) > 1:  # Must have header and at least one row
                    # Convert to DataFrame
                    df = pd.DataFrame(table[1:], columns=table[0])
                    
                    # Clean the DataFrame
                    df = df.dropna(how='all').dropna(axis=1, how='all')
                    
                    # Only keep if it has meaningful content
                    if not df.empty and len(df.columns) > 1:
                        tables.append({
                            'table_number': i + 1,
                            'data': df,
                            'raw_table': table
                        })
        except Exception as e:
            # Log error but don't stop processing
            pass
        
        return tables
    
    def process_pdf(self, pdf_path, output_dir, chunk_size, extract_text, extract_tables, 
                   clean_format, flag_empty, start_page, end_page, progress_callback, log_callback):
        """
        Process PDF file and extract text and tables
        """
        try:
            log_callback(f"Starting PDF processing: {os.path.basename(pdf_path)}")
            log_callback(f"Output directory: {output_dir}")
            log_callback(f"Chunk size: {chunk_size} pages")
            
            # Log page range
            if start_page is None:
                log_callback(f"Page range: All pages")
            else:
                if end_page is None:
                    log_callback(f"Page range: From page {start_page} to end of document")
                else:
                    log_callback(f"Page range: From page {start_page} to page {end_page}")
            
            log_callback(f"Options - Text: {extract_text}, Tables: {extract_tables}, Clean: {clean_format}, Flag Empty: {flag_empty}")
            
            # Create output directory structure
            base_name = Path(pdf_path).stem
            output_path = Path(output_dir) / f"{base_name}_extracted"
            output_path.mkdir(exist_ok=True)
            
            # Create subdirectories
            if extract_text:
                (output_path / "text").mkdir(exist_ok=True)
            if extract_tables:
                (output_path / "tables").mkdir(exist_ok=True)
            (output_path / "logs").mkdir(exist_ok=True)
            
            log_callback(f"Created output directory: {output_path}")
            
            # Open PDF file
            progress_callback(5, "Opening PDF file...")
            log_callback("Opening PDF file...")
            
            with pdfplumber.open(pdf_path) as pdf:
                total_pages = len(pdf.pages)
                log_callback(f"PDF has {total_pages} pages")
                
                # Determine actual page range to process
                if start_page is None:
                    actual_start = 0  # 0-based index
                    actual_end = total_pages
                else:
                    actual_start = start_page - 1  # Convert to 0-based index
                    if end_page is None:
                        actual_end = total_pages
                    else:
                        actual_end = min(end_page, total_pages)  # Don't exceed total pages
                
                # Validate page range
                if actual_start >= total_pages:
                    log_callback(f"Error: Start page {start_page} exceeds total pages ({total_pages})")
                    return False
                
                pages_to_process = actual_end - actual_start
                log_callback(f"Processing {pages_to_process} pages (from page {actual_start + 1} to {actual_end})")
                
                # Initialize tracking variables
                current_chunk = 1
                chunk_text = ""
                chunk_tables = []
                pages_in_chunk = 0
                empty_pages = []
                processing_log = []
                
                # Process pages in the specified range
                for page_num in range(actual_start, actual_end):
                    if self.cancel_processing:
                        log_callback("Processing cancelled by user")
                        return False
                    
                    # Update progress
                    processed_pages = page_num - actual_start + 1
                    progress = int(10 + (processed_pages / pages_to_process) * 85)
                    progress_callback(progress, f"Processing page {page_num + 1} ({processed_pages}/{pages_to_process})")
                    
                    try:
                        page = pdf.pages[page_num]
                        log_callback(f"Processing page {page_num + 1}")
                        
                        # Extract text if requested
                        page_text = ""
                        if extract_text:
                            page_text = page.extract_text() or ""
                            
                            # Clean text if requested
                            if clean_format:
                                page_text = self.clean_text(page_text)
                            
                            # Check if empty and flag if requested
                            if flag_empty and self.is_empty_page(page_text):
                                empty_pages.append(page_num + 1)
                                log_callback(f"Page {page_num + 1} flagged as empty")
                            
                            # Add to chunk
                            chunk_text += f"\n{'='*50}\nPAGE {page_num + 1}\n{'='*50}\n\n"
                            chunk_text += page_text + "\n\n"
                        
                        # Extract tables if requested
                        if extract_tables:
                            page_tables = self.extract_tables_from_page(page)
                            if page_tables:
                                log_callback(f"Found {len(page_tables)} tables on page {page_num + 1}")
                                for table in page_tables:
                                    table['page_number'] = page_num + 1
                                    chunk_tables.append(table)
                        
                        pages_in_chunk += 1
                        
                        # Save chunk if we've reached the chunk size or it's the last page in range
                        if pages_in_chunk >= chunk_size or page_num == actual_end - 1:
                            log_callback(f"Saving chunk {current_chunk} ({pages_in_chunk} pages)")
                            
                            # Save text chunk
                            if extract_text and chunk_text.strip():
                                text_file = output_path / "text" / f"{base_name}_chunk_{current_chunk}.txt"
                                with open(text_file, 'w', encoding='utf-8') as f:
                                    f.write(chunk_text)
                                log_callback(f"Saved text chunk to: {text_file.name}")
                            
                            # Save tables chunk as Excel file with multiple sheets
                            if extract_tables and chunk_tables:
                                excel_file = output_path / "tables" / f"{base_name}_chunk_{current_chunk}_tables.xlsx"
                                
                                # Group tables by page
                                tables_by_page = {}
                                for table in chunk_tables:
                                    page_num = table['page_number']
                                    if page_num not in tables_by_page:
                                        tables_by_page[page_num] = []
                                    tables_by_page[page_num].append(table)
                                
                                # Create Excel file with sheets for each page
                                with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
                                    for page_num in sorted(tables_by_page.keys()):
                                        page_tables = tables_by_page[page_num]
                                        
                                        if len(page_tables) == 1:
                                            # Single table - use page number as sheet name
                                            sheet_name = f"Page_{page_num}"
                                            page_tables[0]['data'].to_excel(writer, sheet_name=sheet_name, index=False)
                                        else:
                                            # Multiple tables - combine with separators
                                            sheet_name = f"Page_{page_num}"
                                            combined_data = []
                                            
                                            for i, table in enumerate(page_tables):
                                                if i > 0:
                                                    # Add separator rows between tables
                                                    separator_row = pd.DataFrame([[''] * len(table['data'].columns)], 
                                                                               columns=table['data'].columns)
                                                    combined_data.append(separator_row)
                                                    combined_data.append(pd.DataFrame([[f"=== TABLE {i+1} ==="] + [''] * (len(table['data'].columns)-1)], 
                                                                                   columns=table['data'].columns))
                                                    combined_data.append(separator_row)
                                                else:
                                                    combined_data.append(pd.DataFrame([[f"=== TABLE {i+1} ==="] + [''] * (len(table['data'].columns)-1)], 
                                                                                   columns=table['data'].columns))
                                                
                                                combined_data.append(table['data'])
                                            
                                            combined_df = pd.concat(combined_data, ignore_index=True)
                                            combined_df.to_excel(writer, sheet_name=sheet_name, index=False)
                                
                                log_callback(f"Saved {len(chunk_tables)} tables from chunk {current_chunk} to: {excel_file.name}")
                                log_callback(f"  - Tables saved across {len(tables_by_page)} pages in Excel sheets")
                            
                            # Reset for next chunk
                            current_chunk += 1
                            chunk_text = ""
                            chunk_tables = []
                            pages_in_chunk = 0
                        
                        # Log progress every 10 pages
                        if processed_pages % 10 == 0:
                            log_callback(f"Processed {processed_pages}/{pages_to_process} pages")
                    
                    except Exception as e:
                        error_msg = f"Error processing page {page_num + 1}: {str(e)}"
                        log_callback(error_msg)
                        processing_log.append(error_msg)
                        continue
                
                # Create processing summary
                progress_callback(95, "Creating processing summary...")
                log_callback("Creating processing summary...")
                
                summary = {
                    'processing_date': datetime.now().isoformat(),
                    'source_file': pdf_path,
                    'total_pages': total_pages,
                    'pages_processed': pages_to_process,
                    'page_range': f"{actual_start + 1}-{actual_end}" if start_page else "all",
                    'chunks_created': current_chunk - 1,
                    'chunk_size': chunk_size,
                    'options': {
                        'extract_text': extract_text,
                        'extract_tables': extract_tables,
                        'clean_format': clean_format,
                        'flag_empty': flag_empty
                    },
                    'empty_pages': empty_pages,
                    'processing_errors': processing_log
                }
                
                # Save processing log
                log_file = output_path / "logs" / f"{base_name}_processing.log"
                with open(log_file, 'w', encoding='utf-8') as f:
                    f.write(f"Municipal PDF Extractor - Processing Log\n")
                    f.write(f"{'='*50}\n\n")
                    f.write(f"Processing Date: {summary['processing_date']}\n")
                    f.write(f"Source File: {summary['source_file']}\n")
                    f.write(f"Total Pages in PDF: {summary['total_pages']}\n")
                    f.write(f"Pages Processed: {summary['pages_processed']}\n")
                    f.write(f"Page Range: {summary['page_range']}\n")
                    f.write(f"Chunks Created: {summary['chunks_created']}\n")
                    f.write(f"Chunk Size: {summary['chunk_size']}\n\n")
                    f.write(f"Processing Options:\n")
                    f.write(f"  - Extract Text: {summary['options']['extract_text']}\n")
                    f.write(f"  - Extract Tables: {summary['options']['extract_tables']}\n")
                    f.write(f"  - Clean Format: {summary['options']['clean_format']}\n")
                    f.write(f"  - Flag Empty: {summary['options']['flag_empty']}\n\n")
                    
                    if empty_pages:
                        f.write(f"Empty Pages Detected: {len(empty_pages)}\n")
                        f.write(f"Page Numbers: {', '.join(map(str, empty_pages))}\n\n")
                    
                    if processing_log:
                        f.write(f"Processing Errors:\n")
                        for error in processing_log:
                            f.write(f"  - {error}\n")
                
                log_callback(f"Processing completed successfully!")
                log_callback(f"Total pages processed: {pages_to_process}")
                if start_page:
                    log_callback(f"Page range: {actual_start + 1}-{actual_end}")
                log_callback(f"Chunks created: {current_chunk - 1}")
                
                # Highlight issues that need manual review
                if empty_pages or processing_log:
                    log_callback("=" * 60)
                    log_callback("⚠️  MANUAL REVIEW REQUIRED - Check these pages:")
                    log_callback("=" * 60)
                    
                    if empty_pages:
                        log_callback(f"📄 EMPTY PAGES ({len(empty_pages)} total): {', '.join(map(str, empty_pages))}")
                        log_callback(f"   → These pages had minimal content (< 50 characters)")
                    
                    if processing_log:
                        log_callback(f"❌ PROCESSING ERRORS ({len(processing_log)} total):")
                        for error in processing_log:
                            log_callback(f"   → {error}")
                    
                    log_callback("=" * 60)
                    log_callback(f"📋 Detailed report saved in: {log_file.name}")
                    log_callback("=" * 60)
                else:
                    log_callback("✅ No issues detected - all pages processed successfully!")
                
                progress_callback(100, "Complete")
                return True
                
        except Exception as e:
            log_callback(f"Error during processing: {str(e)}")
            return False
    
    def run_processing_thread(self):
        """Run PDF processing in a separate thread"""
        self.is_processing = True
        self.cancel_processing = False
        
        def progress_callback(percent, status):
            self.update_progress(percent, status)
        
        def log_callback(message):
            self.log_message(message)
        
        # Determine page range
        if self.all_pages_var.get():
            start_page = None
            end_page = None
        else:
            start_page = int(self.start_page_var.get())
            end_page_str = self.end_page_var.get().strip()
            end_page = int(end_page_str) if end_page_str else None
        
        success = self.process_pdf(
            self.pdf_file_var.get(),
            self.output_dir_var.get(),
            int(self.chunk_size_var.get()),
            self.extract_text_var.get(),
            self.extract_tables_var.get(),
            self.clean_format_var.get(),
            self.flag_empty_var.get(),
            start_page,
            end_page,
            progress_callback,
            log_callback
        )
        
        self.is_processing = False
        
        # Update UI on completion (thread-safe)
        def update_completion():
            self.run_button.configure(state="normal")
            self.cancel_button.configure(state="disabled")
            self.progress_bar.grid_remove()
            self.progress_text.grid_remove()
            
            if success:
                self.status_label.configure(text='Status: Processing completed successfully')
            else:
                self.status_label.configure(text='Status: Processing failed or cancelled')
        
        self.after(0, update_completion)

def main():
    """Main entry point"""
    try:
        app = MuniPDFExtractor()
        app.log_message("Application started")
        app.log_message("Please select a PDF file and output directory to begin")
        app.mainloop()
    except Exception as e:
        messagebox.showerror("Application Error", f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 