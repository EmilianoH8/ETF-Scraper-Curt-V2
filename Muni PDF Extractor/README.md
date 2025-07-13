# Municipal PDF Extractor

A local, GUI-based PDF parsing tool for extracting structured text and financial tables from large municipal bond documents (e.g., POS and OS PDFs).

## Features

- 🖥️ **Modern GUI Interface** - User-friendly interface built with customtkinter
- 📄 **PDF Text Extraction** - Extract unstructured text from PDF documents
- 📊 **Table Extraction** - Extract structured tables and export to Excel
- 🔧 **Configurable Processing** - Customizable chunk sizes and processing options
- 📝 **Live Logging** - Real-time progress updates and detailed logging
- 🛡️ **Fully Offline** - No external API calls or cloud dependencies
- 🚀 **Progress Tracking** - Visual progress bar with detailed status updates
- 🎨 **Dark Theme** - Modern dark theme interface for comfortable use
- 📖 **Page Range Selection** - Process specific page ranges instead of entire documents


## Installation

### Step 1: Check if Python is Installed
1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Type `python --version` and press Enter
3. If you see a version number (like "Python 3.8.5"), you're good to go!
4. If you get an error, download and install Python from https://www.python.org/downloads/

### Step 2: Download the Application
1. Download this repository as a ZIP file (click the green "Code" button, then "Download ZIP")
2. Extract the ZIP file to a folder on your computer (like your Desktop)
3. Remember where you saved it!

### Step 3: Install Required Components
1. Open Command Prompt (Windows)
2. Navigate to the folder where you extracted the files:
   ```bash
   cd "C:\Users\YourName\Desktop\Muni PDF Extractor"
   ```
   (Replace with your actual folder path)

   You can also drag the folder into the Command Prompt, and use the cd command to navigate to it

3. Install the required components:
   ```bash
   pip install -r requirements.txt
   ```
4. Wait for the installation to complete (this may take a few minutes)

## How to Use the Application

### Step 1: Start the Application
1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to the application folder (same as Step 3 above)
3. Type this command and press Enter:
   ```bash
   python muni_pdf_extractor.py
   ```
4. A window with a dark theme should appear - this is your PDF extractor!

### Step 2: Select Your PDF File
1. In the application window, look for the "PDF File:" section at the top
2. Click the "Browse" button next to the empty text field
3. Find and select your PDF file from your computer
4. The file path will appear in the text field

### Step 3: Choose Where to Save Results
1. Look for the "Output Directory:" section
2. Click the "Browse" button 
3. Choose a folder where you want to save the extracted content
4. **Tip**: Create a new folder like "PDF_Results" to keep things organized

### Step 4: Configure Settings

#### Chunk Size
- **What it does**: Breaks large PDFs into smaller pieces for easier handling
- **Default**: 100 pages per chunk
- **For most users**: Leave this as 100

#### Page Range
- **All pages** (recommended for beginners): Check this box to process the entire PDF
- **Custom range**: If you only want specific pages:
  - Uncheck "All pages"
  - Enter the starting page number in "From page"
  - Enter the ending page number in "To page" (or leave blank for end of document)
  - **Example**: To process pages 25-50, enter "25" and "50"

#### Processing Options (What to Extract)
- **Extract Text**: ✅ **Recommended** - Gets all the text from your PDF
- **Extract Tables**: ✅ **Recommended** - Finds and extracts tables into Excel files
- **Clean Formatting**: ✅ **Recommended** - Removes extra spaces and cleans up the text
- **Flag Empty Pages**: ✅ **Recommended** - Identifies pages with little content

### Step 5: Run the Extraction
1. Double-check your settings
2. Click the green "Run Extraction" button
3. **DO NOT CLOSE THE WINDOW** while it's processing
4. Watch the progress bar and log messages

### Step 6: Monitor Progress
- The **log window** (bottom section) shows what's happening in real-time
- The **progress bar** shows how much is complete
- Processing time depends on your PDF size (could be minutes to hours for large files)

### Step 7: Find Your Results
When complete, go to the output folder you selected. You'll find:
```
YourPDFName_extracted/
├── text/                           ← Your extracted text files
│   ├── YourPDFName_chunk_1.txt
│   └── YourPDFName_chunk_2.txt
├── tables/                         ← Your extracted tables
│   ├── YourPDFName_chunk_1_tables.xlsx
│   └── YourPDFName_chunk_2_tables.xlsx
└── logs/                           ← Processing details
    └── YourPDFName_processing.log
```

## Troubleshooting

### "Command not found" or "Python not recognized"
- **Solution**: Python isn't installed or not in your system PATH
- **Fix**: Download Python from https://python.org and make sure to check "Add Python to PATH" during installation

### "Permission denied" errors
- **Solution**: The application doesn't have permission to write to your chosen folder
- **Fix**: Choose a different output folder (like your Desktop or Documents folder)

### Application crashes or won't start
- **Solution**: Missing dependencies or incompatible Python version
- **Fix**: Make sure you ran `pip install -r requirements.txt` and you have Python 3.7+

### PDF won't process or gives errors
- **Solution**: PDF might be corrupted, password-protected, or in an unsupported format
- **Fix**: Try with a different PDF file first to test if the application works


### Error and Manual Review Reporting
- **Live Log Window**: Shows real-time alerts for empty pages and processing errors
- **Processing Log File**: Detailed report saved in the `logs/` directory with:
  - Complete processing statistics
  - List of empty pages that need manual review
  - Any processing errors encountered
  - Processing options and settings used
- **Visual Alerts**: The application highlights issues requiring manual review with clear formatting and icons



## Security & Privacy

This tool is designed to work completely offline with no external dependencies or API calls, making it suitable for sensitive municipal document processing. 