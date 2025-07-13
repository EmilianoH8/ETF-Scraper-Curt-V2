# ETF Stats - Daily Data Extraction (PowerShell)
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ETF Stats - Daily Data Extraction" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Gray
Write-Host "Current time: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Try to find and run Python
try {
    # Method 1: Try python command
    if (Get-Command python -ErrorAction SilentlyContinue) {
        Write-Host "[SUCCESS] Using Python:" -ForegroundColor Green
        python --version
        Write-Host ""
        Write-Host "[RUNNING] Extracting ETF data..." -ForegroundColor Yellow
        python main.py
        $exitCode = $LASTEXITCODE
    }
    # Method 2: Try py command
    elseif (Get-Command py -ErrorAction SilentlyContinue) {
        Write-Host "[SUCCESS] Using Python Launcher:" -ForegroundColor Green
        py --version
        Write-Host ""
        Write-Host "[RUNNING] Extracting ETF data..." -ForegroundColor Yellow
        py main.py
        $exitCode = $LASTEXITCODE
    }
    # Method 3: Try conda
    elseif (Get-Command conda -ErrorAction SilentlyContinue) {
        Write-Host "[SUCCESS] Using Conda:" -ForegroundColor Green
        Write-Host ""
        Write-Host "[RUNNING] Extracting ETF data..." -ForegroundColor Yellow
        conda run python main.py
        $exitCode = $LASTEXITCODE
    }
    else {
        throw "Python not found in PATH"
    }
    
    # Check results
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "[SUCCESS] ETF extraction completed!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ Check the 'data' folder for your Excel file" -ForegroundColor Green
        Write-Host "✅ The file will be named: etf_data_YYYYMMDD_HHMMSS.xlsx" -ForegroundColor Green
    }
    else {
        Write-Host "=========================================" -ForegroundColor Red
        Write-Host "[ERROR] ETF extraction failed!" -ForegroundColor Red
        Write-Host "=========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "❌ Error code: $exitCode" -ForegroundColor Red
        Write-Host "❌ Check the 'logs' folder for error details" -ForegroundColor Red
    }
}
catch {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "[ERROR] Python not found!" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure Python is installed and in your PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Current PATH:" -ForegroundColor Gray
    $env:PATH -split ';' | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host ""
    Write-Host "To fix this:" -ForegroundColor Yellow
    Write-Host "1. Install Python from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "2. Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    Write-Host "3. Restart your computer" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 