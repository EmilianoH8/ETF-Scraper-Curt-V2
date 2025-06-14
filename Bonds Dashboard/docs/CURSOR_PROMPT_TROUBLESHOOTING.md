# CURSOR TROUBLESHOOTING PROMPT - Bond Market Dashboard

## Context for AI Assistant

I have a **Bond Market Dashboard** with a React frontend and Express.js backend that fetches live FRED API data. When the dashboard shows **mock data instead of live FRED data**, use this context to troubleshoot:

### Project Structure
- **Frontend**: React app running on `http://localhost:3000` (port 3000)
- **Backend**: Express server in `server/` directory running on `http://localhost:3001` (port 3001)
- **FRED API Key**: Already configured in `server/.env.local` file

### Current Setup (WORKING CONFIGURATION)
- ✅ FRED API key is already in `server/.env.local` 
- ✅ Frontend code expects backend at `http://localhost:3001/api`
- ✅ Backend server file is `server/server.js`
- ✅ Project uses PowerShell on Windows

### The Problem
Dashboard shows mock data instead of live FRED data when the backend server is not running or can't connect to FRED API.

### Required Fix
The solution is always to ensure **BOTH servers are running simultaneously**:

1. **Backend Server** (Terminal 1):
   ```powershell
   cd server
   npm start
   ```
   Should show: `🚀 Bond Dashboard API Server running on http://localhost:3001`

2. **Frontend Server** (Terminal 2): 
   ```powershell
   npm run dev
   ```
   Should show: `Local: http://localhost:3000/`

### Key Technical Details
- Frontend service file: `src/services/fredApi.ts`
- Backend health check: `http://localhost:3001/api/health`
- FRED data endpoint: `http://localhost:3001/api/fred/batch`
- Environment file location: `server/.env.local` (NOT root directory)
- PowerShell syntax: Use separate commands, not `&&`

### Verification Steps
1. Check backend server console for FRED API fetching logs
2. Refresh frontend browser at `http://localhost:3000`
3. Look for "Last updated" timestamp changes
4. Verify actual market values (not static mock values)

### Common Mistakes to Avoid
- ❌ Running only frontend server
- ❌ Using `&&` syntax in PowerShell
- ❌ Looking for .env in root directory instead of `server/`
- ❌ Forgetting to cd into server directory first

**Remember**: The FRED API key is already configured. The issue is always about running both servers correctly. 