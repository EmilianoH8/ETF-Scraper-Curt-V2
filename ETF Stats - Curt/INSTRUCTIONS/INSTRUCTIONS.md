# ETF Stats - Simple Instructions

## 🎯 What This Does

This tool automatically extracts ETF data from Schwab and saves it to **ONE Excel file**. It gets:
- **SEC Yield (30-Day)**: The standardized yield metric
- **Expense Ratio**: Annual fund expenses  
- **Price**: Current share price
- **Net Assets**: Total fund assets

## 🚀 How to Run (5 Simple Steps)

### Step 1: Open Command Prompt or PowerShell
- **Windows**: Press `Windows Key + R`, type `cmd`, press Enter
- **Or**: Search for "PowerShell" in Start Menu

### Step 2: Navigate to Your Project Folder
Type this command and press Enter (replace with YOUR actual folder path):
```
cd "PATH_TO_YOUR_PROJECT_FOLDER"
```

💡 **Tip**: You can drag and drop the project folder into the command prompt to auto-fill the path!

### Step 3: Install Requirements (ONLY THE FIRST TIME)
```
pip install curl-cffi beautifulsoup4 pandas openpyxl pyyaml
```

💡 **Note**: If you get "'python' is not recognized" error, see troubleshooting section below.

### Step 4: Run the Application
```
python main.py
```

### Step 5: Find Your Data
The Excel file will be saved in the `data/` folder with a name like:
- `etf_data_20240101_143022.xlsx`

## 📁 How to Access Your Data Folder

### Method 1: Using File Explorer (Easiest)
1. Open **File Explorer** (Windows key + E)
2. Navigate to **your project folder** (wherever you saved "ETF Stats - Curt")
3. Double-click the **"data"** folder
4. Your Excel files will be there!

### Method 2: Using Command Prompt
If you still have the command prompt open:
```
cd data
dir
```
This will show you all the Excel files in the data folder.

### Method 3: Quick Access
1. Right-click on your project folder
2. Select "Open in Terminal" or "Open PowerShell window here"
3. Type: `cd data` and press Enter
4. Type: `dir` to see your Excel files

## 📝 Funds Being Tracked

The tool automatically extracts data for these 11 funds:
- **OSTX** - Osterweis Strategic Income Fund
- **RUNFX** - Runyon Core Income Fund 
- **JITZX** - JPMorgan Income Trust
- **JNYIX** - JPMorgan New York Income Fund
- **TXRRX** - T. Rowe Price Tax-Free High Yield Fund
- **USMTX** - United States Monthly Income Fund
- **JMST** - JP Morgan Ultra Short Municipal Income ETF
- **JMUB** - JPMorgan Ultra-Short Municipal Income ETF
- **JMHI** - JPMorgan High Yield Municipal ETF
- **JMSI** - JPMorgan Short Duration Income ETF
- **JPICX** - JPMorgan Income Building ETF

## ➕ **How to Add New Funds**

To add a new fund, edit the `config/fund_urls.yaml` file:

1. **Open the file**: Navigate to `config/fund_urls.yaml`
2. **Add your fund**: Copy this template and modify:
   ```yaml
   - name: "Your Fund Name"
     ticker: "TICKER"
     url: "https://www.schwab.com/research/etfs/quotes/summary/ticker"
     active: true
   ```

💡 **To temporarily disable a fund**: Change `active: true` to `active: false`

## 🔧 If Something Goes Wrong

### "'python' is not recognized" error:
**If you have Anaconda/conda installed:**

**Option 1: Initialize conda (recommended)**
1. Initialize conda: `C:\Users\YourName\anaconda3\Scripts\conda.exe init powershell`
2. Close and reopen command prompt
3. Run: `conda activate base`
4. Then use normal commands: `python --version`, `pip install...`, etc.

**Option 2: Use full paths (works immediately)**
1. Install packages: `C:\Users\YourName\anaconda3\Scripts\pip.exe install curl-cffi beautifulsoup4 pandas openpyxl pyyaml`
2. Run application: `C:\Users\YourName\anaconda3\python.exe main.py`

💡 **Replace "YourName" with your actual Windows username**

**If you don't have Python installed:**
- Install Python from Microsoft Store: Press `Windows Key + R`, type `ms-windows-store://pdp/?ProductId=9NCVDN91XZQP`, press Enter
- Or download from https://www.python.org/downloads/ (check "Add Python to PATH")

### "Module not found" error:
```
pip install curl-cffi beautifulsoup4 pandas openpyxl pyyaml
```

### "No data extracted" error:
- Check your internet connection
- Try running again (sometimes Schwab is slow)

### "Config file not found":
- Make sure you're in the correct folder
- The `config/` folder should contain `fund_urls.yaml` and `settings.yaml`

## 📅 **Daily Automation Options**

Since ETF data updates daily, here are ways to automate the process:

### Option 1: Windows Task Scheduler (Recommended)
1. **Open Task Scheduler**: Search "Task Scheduler" in Start Menu
2. **Create Basic Task**: Click "Create Basic Task" in the right panel
3. **Set Schedule**: Choose "Daily" and set your preferred time
4. **Set Action**: Choose "Start a program"
5. **Program/Script**: `C:\Users\YourName\anaconda3\python.exe` (use your Python path)
6. **Arguments**: `main.py`
7. **Start in**: `C:\Path\To\Your\ETF Stats - Curt` (your project folder)

### Option 2: Simple Batch Script
Create a `run_daily.bat` file in your project folder:
```batch
@echo off
cd /d "C:\Path\To\Your\ETF Stats - Curt"
C:\Users\YourName\anaconda3\python.exe main.py
pause
```
Then schedule this .bat file with Task Scheduler.
