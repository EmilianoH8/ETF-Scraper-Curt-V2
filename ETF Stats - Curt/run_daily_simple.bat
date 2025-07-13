@echo off
echo ETF Stats - Daily Data Extraction
echo ===================================
echo.

cd /d "%~dp0"

echo Trying to run Python...
echo.

python main.py

if %errorlevel% == 0 (
    echo.
    echo SUCCESS: ETF extraction completed!
    echo Check the data folder for your Excel file.
) else (
    echo.
    echo ERROR: Failed to run Python script
    echo Error code: %errorlevel%
    echo.
    echo Make sure Python is installed and in your PATH
    echo You can test by opening Command Prompt and typing: python --version
)

echo.
pause 