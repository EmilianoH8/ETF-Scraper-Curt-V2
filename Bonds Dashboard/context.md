# Bond Market Dashboard - JPM Asset Management Municipal Research

## Project Overview
Building a real-time bond market dashboard for municipal research team internship. Dashboard displays key fixed income indicators with interpretive guidance for market analysis.

## Technical Stack
- **Frontend**: React with TypeScript, Tailwind CSS
- **Charts**: Recharts or Chart.js
- **Data Source**: FRED API (Federal Reserve Economic Data)
- **Icons**: Lucide React
- **Deployment**: Vercel/Netlify

## Key FRED API Data Series
```
TREASURY YIELDS:
- 10Y Treasury: DGS10
- 2Y Treasury: DGS2  
- 30Y Treasury: DGS30
- 2s/10s Spread: T10Y2Y
- Fed Funds Rate: FEDFUNDS
- SOFR: SOFR

MARKET INDICATORS:
- S&P 500: SP500
- VIX: VIXCLS
- Dollar Index: DTWEXBGS

CREDIT SPREADS:
- High Yield Spreads: BAMLH0A0HYM2
- Investment Grade Spreads: BAMLC0A0CM

ECONOMIC DATA:
- CPI: CPIAUCSL
- Unemployment: UNRATE
- GDP: GDP
```

## Dashboard Requirements

### Core Metrics Display
1. **Treasury Yields Section**
   - 2Y, 10Y, 30Y current levels with daily changes
   - Color coding: Red for rising yields, Green for falling yields
   - Trend arrows and basis point changes

2. **Yield Curve Visualization**
   - Interactive curve chart (3M to 30Y)
   - Historical overlay capability
   - Inversion highlighting

3. **Key Spreads**
   - 2s/10s spread with recession indicator
   - 10s/30s spread
   - Credit spreads (IG and HY)

4. **Policy Indicators**
   - Fed Funds Rate
   - SOFR
   - Fed Funds Futures (if available)

5. **Market Context**
   - S&P 500 level and change
   - VIX level
   - Dollar Index

### Interpretive Features
- **Signal Indicators**: Traffic light system for key relationships
- **Correlation Alerts**: When unusual correlations occur (e.g., stocks down, bonds up)
- **Recession Indicators**: 2s/10s inversion alerts
- **Municipal Context**: Muni/Treasury ratio calculations

### Data Management
- **FRED API Integration**: Fetch data every 15 minutes during market hours
- **Error Handling**: Graceful fallbacks for API failures
- **Rate Limiting**: Respect FRED API limits
- **Caching**: Store recent data locally

## Design Principles
- **Clean, Professional**: Financial industry standard
- **Mobile Responsive**: Tablet and desktop optimized
- **Real-time Updates**: Live data during market hours
- **Quick Interpretation**: Clear visual signals for busy analysts
