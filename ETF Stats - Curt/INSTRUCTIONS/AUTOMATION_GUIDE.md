# ETF Stats - Daily Automation Guide

## 🎯 Overview

This guide shows you how to automatically run ETF data extraction daily, so you get fresh data every day without manual intervention.

## 🚀 Quick Start (5 Minutes)

### Option 1: Double-Click Method (Easiest)
1. **Double-click** `run_daily.bat` in your project folder
2. **Works!** The script will run and save data to the `data/` folder
3. **To automate**: Use Windows Task Scheduler to run this batch file daily

### Option 2: Windows Task Scheduler (Recommended)
1. **Open Task Scheduler**: Search "Task Scheduler" in Start Menu
2. **Create Basic Task**: Click "Create Basic Task" in the right panel
3. **Name**: "ETF Stats Daily"
4. **Schedule**: Choose "Daily" and set time (e.g., 9:00 AM)
5. **Action**: "Start a program"
6. **Program**: Browse to your `run_daily.bat` file
7. **Start in**: Your project folder path
8. **Done!** It will run automatically every day

## 📋 Detailed Setup Instructions

### Step 1: Test Manual Execution
Before automating, test the batch file:
```
1. Navigate to your "ETF Stats - Curt" folder
2. Double-click "run_daily.bat"
3. Verify it runs successfully
4. Check the data/ folder for new Excel file
```

### Step 2: Set Up Windows Task Scheduler

#### Create the Task:
1. **Open Task Scheduler**
   - Press `Windows Key + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create Basic Task**
   - Click "Create Basic Task..." in the right panel
   - Name: `ETF Stats Daily`
   - Description: `Daily ETF data extraction from Schwab`

3. **Set Trigger (When to run)**
   - Select "Daily"
   - Set start date: Today
   - Set time: `9:00 AM` (or your preferred time)
   - Recur every: `1 days`

4. **Set Action (What to run)**
   - Select "Start a program"
   - Program/script: Click "Browse" and select `run_daily.bat`
   - Start in: Your project folder path (e.g., `C:\Users\YourName\Documents\ETF Stats - Curt`)

5. **Finish**
   - Review settings
   - Check "Open the Properties dialog when I click Finish"
   - Click "Finish"

#### Configure Advanced Settings:
In the Properties dialog:
1. **General Tab**:
   - ☑️ "Run whether user is logged on or not" (if you want it to run even when not logged in)
   - ☑️ "Run with highest privileges"

2. **Conditions Tab**:
   - ☑️ "Start the task only if the computer is on AC power" (uncheck if laptop)
   - ☑️ "Wake the computer to run this task"

3. **Settings Tab**:
   - ☑️ "Allow task to be run on demand"
   - ☑️ "If the running task does not end when requested, force it to stop"

## 📁 File Organization

With daily automation, your `data/` folder will look like:
```
data/
├── etf_data_20241201_090015.xlsx
├── etf_data_20241202_090012.xlsx
├── etf_data_20241203_090018.xlsx
└── ...
```

## 🔧 Troubleshooting

### Task Scheduler Issues:
1. **Task runs but no data**: Check the batch file works manually first
2. **Task doesn't run**: Verify trigger time and ensure computer is on
3. **Permission errors**: Run Task Scheduler as administrator

### Python Path Issues:
If the batch file can't find Python:
1. **Edit run_daily.bat**
2. **Replace the Python command** with your specific path:
   ```batch
   C:\Users\YourName\anaconda3\python.exe main.py
   ```

### Missing Data Files:
1. **Check the data/ folder** for new files
2. **Verify fund tickers** in config/fund_urls.yaml
3. **Check internet connection** - Schwab might be slow
