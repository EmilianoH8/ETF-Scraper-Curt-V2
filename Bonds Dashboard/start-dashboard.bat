@echo off
echo Starting Bond Dashboard...
echo.

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo PM2 is not installed. Installing PM2...
    npm install -g pm2
)

echo Starting both frontend and backend servers with PM2...
pm2 start ecosystem.config.js

echo.
echo Dashboard started successfully!
echo.
echo Frontend: http://localhost:3000 (or next available port)
echo Backend: http://localhost:3001
echo.
echo To view logs: npm run pm2:logs
echo To stop: npm run pm2:stop
echo To restart: npm run pm2:restart
echo To check status: npm run pm2:status
echo.
pause 