# Bond Market Dashboard - JPM Asset Management Municipal Research

A professional real-time bond market dashboard built for municipal research and fixed income analysis. Features live FRED API integration, yield curve visualization, market signals, and interpretive guidance.

## Features

### 📊 Key Metrics Display
- **Treasury Yields**: 2Y, 10Y, 30Y with daily changes in basis points
- **Yield Spreads**: 2s/10s and 30Y-10Y spreads with inversion alerts
- **Policy Rates**: Fed Funds and SOFR with change indicators
- **Market Context**: S&P 500, VIX, Dollar Index
- **Credit Spreads**: Investment Grade and High Yield corporate spreads

### 📈 Interactive Charts
- **Yield Curve**: Real-time US Treasury curve from 3M to 30Y
- **Historical Trends**: 7-day charts for 10Y yield and 2s/10s spread
- **Credit Analysis**: Investment Grade vs High Yield spread comparison

### 🚨 Market Signals
- **Traffic Light System**: Bullish/Bearish/Neutral indicators
- **Recession Alerts**: Yield curve inversion warnings
- **Correlation Tracking**: Stock-bond and dollar relationships
- **Municipal Context**: Tax-equivalent yield insights

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom financial themes
- **Charts**: Recharts with professional financial styling  
- **Icons**: Lucide React
- **Data**: FRED API (Federal Reserve Economic Data)
- **Build**: Vite for fast development

## Quick Start

### Prerequisites
- Node.js 18+ 
- FRED API Key (free from https://fred.stlouisfed.org/docs/api/api_key.html)

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Install backend server dependencies**:
```bash
cd server
npm install
```

3. **Set up FRED API Key**:
   - Get a free API key from https://fred.stlouisfed.org/docs/api/api_key.html
   - Create `.env.local` file in the `server/` directory:
```bash
# server/.env.local
FRED_API_KEY=your_fred_api_key_here
PORT=3001
```

4. **Start both servers**:

   **Terminal 1 - Backend Server (Required for live data)**:
   ```bash
   cd server
   npm start
   ```
   
   **Terminal 2 - Frontend Server**:
   ```bash
   npm run dev
   ```

5. **Open browser**: Navigate to `http://localhost:3000`

### Live Data Requirements
**⚠️ IMPORTANT**: For live FRED data to work, you MUST:
- ✅ Have both frontend (port 3000) AND backend (port 3001) servers running
- ✅ FRED API key configured in `server/.env.local` 
- ✅ Backend server started from the `server/` directory

### Mock Data Mode
If the backend server is not running or no FRED API key is provided, the dashboard automatically falls back to realistic mock data for development and demonstration purposes.

## FRED API Data Series

The dashboard uses these Federal Reserve economic data series:

| Series ID | Description | Usage |
|-----------|-------------|-------|
| DGS2, DGS10, DGS30 | Treasury Yields | Main yield display |
| T10Y2Y | 2s/10s Spread | Recession indicator |
| FEDFUNDS, SOFR | Policy Rates | Fed policy tracking |
| SP500, VIXCLS | Market Indicators | Risk sentiment |
| DTWEXBGS | Dollar Index | Currency impact |
| BAMLC0A0CM, BAMLH0A0HYM2 | Credit Spreads | Corporate bond risk |

## Project Structure

```
src/
├── components/           # React components
│   ├── MetricsGrid.tsx      # Key metrics display
│   ├── ChartsSection.tsx    # Yield curve & trend charts
│   ├── InterpretationPanel.tsx # Market signals & analysis
│   └── LoadingSpinner.tsx   # Loading states
├── services/            # API and data services
│   └── fredApi.ts          # FRED API integration
├── types/               # TypeScript interfaces
│   └── bonds.ts            # Data type definitions
├── App.tsx              # Main application component
├── main.tsx            # React entry point
└── index.css           # Tailwind & custom styles
```

## Customization

### Adding New Metrics
1. Add new FRED series ID to `fredApi.ts`
2. Update TypeScript interfaces in `types/bonds.ts`
3. Extend `MetricsGrid.tsx` for display

### Styling
- Modify `tailwind.config.js` for custom colors
- Update `index.css` for component styles
- Financial color scheme: Bull Green, Bear Red, Neutral Blue

### Market Signals
- Extend `InterpretationPanel.tsx` signal logic
- Add new thresholds and conditions
- Customize municipal bond insights

## Data Update Schedule

- **Real-time**: Every 15 minutes during market hours (9 AM - 4 PM ET)
- **Manual Refresh**: Click refresh button anytime
- **Error Handling**: Graceful fallback to cached/mock data

## Troubleshooting Live Data Issues

### Problem: Dashboard shows mock data instead of live FRED data

**Checklist**:
1. ✅ Is the backend server running? Check Terminal 1 should show:
   ```
   🚀 Bond Dashboard API Server running on http://localhost:3001
   📊 FRED API Key configured: Yes
   ```

2. ✅ Is the FRED API key configured?
   - File location: `server/.env.local`
   - Content: `FRED_API_KEY=your_actual_api_key`

3. ✅ Are both servers running simultaneously?
   - Frontend: `http://localhost:3000` (Terminal 2: `npm run dev`)
   - Backend: `http://localhost:3001` (Terminal 1: `cd server && npm start`)

**Quick Fix Steps**:
1. Stop all running processes
2. Open Terminal 1: `cd server && npm start`
3. Open Terminal 2: `npm run dev`
4. Refresh browser at `http://localhost:3000`

### Problem: PowerShell syntax errors
- Use `cd server` then `npm start` (not `cd server && npm start`)
- PowerShell doesn't support `&&` syntax

## Performance Considerations

- **Efficient API Calls**: Batch FRED requests
- **Responsive Design**: Optimized for tablets and desktops
- **Loading States**: Smooth user experience during data fetching
- **Error Boundaries**: Robust error handling

## Municipal Research Features

### Tax-Equivalent Yield Calculator
- Automatic tax-equivalent yield calculations
- High tax bracket optimization insights

### Duration Risk Analysis
- Interest rate sensitivity indicators
- Long-term municipal bond considerations

### Credit Quality Monitoring
- State and local fiscal health context
- Municipal vs Treasury spread analysis

## Contributing

### Development Workflow
1. Create feature branch
2. Add TypeScript types for new data
3. Build components with accessibility
4. Test with both live and mock data
5. Update documentation

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Tailwind CSS classes only
- Descriptive component/function names
- Accessibility features (ARIA labels, keyboard navigation)

## Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables for Production
- Set `VITE_FRED_API_KEY` in production environment
- Configure API rate limiting if needed
- Set up monitoring for API quota usage

## License

Built for JPM Asset Management Municipal Research team.

## Support

For questions about:
- **FRED API**: https://fred.stlouisfed.org/docs/api/
- **Municipal Bonds**: Internal JPM research resources
- **Technical Issues**: Internal development team

---

*Dashboard designed for professional fixed income analysis and municipal research workflows.* 