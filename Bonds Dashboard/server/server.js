import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import net from 'net';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3004;
const FRED_API_KEY = process.env.VITE_FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

// Function to check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
};

// Function to find an available port
const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (port < startPort + 100) { // Try up to 100 ports
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error(`No available port found starting from ${startPort}`);
};

// Enable CORS for frontend - Updated for cloud deployment
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:3002',
  'http://localhost:3003',
  process.env.FRONTEND_URL, // For production deployment
  process.env.RAILWAY_STATIC_URL, // Railway specific
  process.env.RENDER_EXTERNAL_URL, // Render specific
  /^https:\/\/.*\.railway\.app$/, // Allow all Railway domains
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Check if origin matches Railway domain pattern
      const isRailwayDomain = /^https:\/\/.*\.railway\.app$/.test(origin);
      if (isRailwayDomain) {
        callback(null, true);
      } else {
        // For development, be more permissive
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    }
  },
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    fredApiKeyConfigured: !!FRED_API_KEY 
  });
});

// FRED API proxy endpoint
app.get('/api/fred/series/:seriesId', async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { limit = 2 } = req.query;

    if (!FRED_API_KEY) {
      return res.status(400).json({ 
        error: 'FRED_API_KEY not configured',
        message: 'Please set VITE_FRED_API_KEY in .env.local file'
      });
    }

    console.log(`Fetching FRED series: ${seriesId}`);

    const response = await axios.get(`${FRED_BASE_URL}/series/observations`, {
      params: {
        series_id: seriesId,
        api_key: FRED_API_KEY,
        file_type: 'json',
        limit: parseInt(limit),
        sort_order: 'desc'
      },
      timeout: 10000 // 10 second timeout
    });

    // Filter out missing data points (marked with '.')
    const validObservations = response.data.observations.filter(obs => obs.value !== '.');
    
    if (validObservations.length === 0) {
      return res.status(404).json({
        error: 'No valid data found',
        seriesId,
        message: `No recent data available for series ${seriesId}`
      });
    }

    // Calculate change if we have multiple data points
    const latest = validObservations[0];
    const previous = validObservations[1];
    const change = previous ? parseFloat(latest.value) - parseFloat(previous.value) : 0;

    const result = {
      seriesId,
      title: seriesId, // Could be enhanced with series metadata
      value: parseFloat(latest.value),
      date: latest.date,
      change,
      observations: validObservations.slice(0, 2) // Return latest 2 points
    };

    res.json(result);

  } catch (error) {
    console.error(`Error fetching FRED series ${req.params.seriesId}:`, error.message);
    
    if (error.code === 'ECONNABORTED') {
      res.status(408).json({ 
        error: 'Request timeout',
        message: 'FRED API request timed out'
      });
    } else if (error.response) {
      res.status(error.response.status).json({
        error: 'FRED API error',
        message: error.response.data?.error_message || error.message,
        status: error.response.status
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// Batch endpoint for multiple series
app.post('/api/fred/batch', async (req, res) => {
  try {
    const { seriesIds } = req.body;
    
    if (!Array.isArray(seriesIds) || seriesIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'seriesIds must be a non-empty array'
      });
    }

    if (seriesIds.length > 20) {
      return res.status(400).json({
        error: 'Too many series requested',
        message: 'Maximum 20 series allowed per batch request'
      });
    }

    console.log(`Fetching ${seriesIds.length} FRED series in batch`);

    // Create base URL for current deployment
    const baseUrl = req.protocol + '://' + req.get('host');

    // Fetch all series with some delay to respect rate limits
    const promises = seriesIds.map((seriesId, index) => 
      new Promise(resolve => {
        setTimeout(async () => {
          try {
            const response = await axios.get(`${baseUrl}/api/fred/series/${seriesId}`);
            resolve({ success: true, data: response.data });
          } catch (error) {
            console.error(`Error in batch for ${seriesId}:`, error.message);
            resolve({ 
              success: false, 
              seriesId, 
              error: error.response?.data || { message: error.message } 
            });
          }
        }, index * 100); // 100ms delay between requests
      })
    );

    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success).map(r => r.data);
    const failed = results.filter(r => !r.success);

    res.json({
      successful,
      failed,
      summary: {
        total: seriesIds.length,
        successful: successful.length,
        failed: failed.length
      }
    });

  } catch (error) {
    console.error('Batch request error:', error.message);
    res.status(500).json({
      error: 'Batch request failed',
      message: error.message
    });
  }
});

// Historical data endpoints for charts
app.get('/api/fred/historical/yield-curve', async (req, res) => {
  try {
    const { days = 180 } = req.query;
    
    if (!FRED_API_KEY) {
      return res.status(400).json({ 
        error: 'FRED_API_KEY not configured',
        message: 'Please set VITE_FRED_API_KEY in .env.local file'
      });
    }

    console.log(`Fetching historical yield curve data for ${days} days`);

    // Yield curve maturities
    const maturities = [
      { series: 'DGS3MO', label: '3M', months: 3 },
      { series: 'DGS6MO', label: '6M', months: 6 },
      { series: 'DGS1', label: '1Y', months: 12 },
      { series: 'DGS2', label: '2Y', months: 24 },
      { series: 'DGS5', label: '5Y', months: 60 },
      { series: 'DGS7', label: '7Y', months: 84 },
      { series: 'DGS10', label: '10Y', months: 120 },
      { series: 'DGS20', label: '20Y', months: 240 },
      { series: 'DGS30', label: '30Y', months: 360 }
    ];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get current values
    const currentPromises = maturities.map(async (maturity) => {
      try {
        console.log(`Fetching current ${maturity.series}`);
        const response = await axios.get(`${FRED_BASE_URL}/series/observations`, {
          params: {
            series_id: maturity.series,
            api_key: FRED_API_KEY,
            file_type: 'json',
            limit: 1,
            sort_order: 'desc'
          },
          timeout: 10000
        });

        const validObs = response.data.observations.filter(obs => obs.value !== '.');
        if (validObs.length === 0) throw new Error(`No data for ${maturity.series}`);

        return {
          ...maturity,
          current: parseFloat(validObs[0].value),
          date: validObs[0].date
        };
      } catch (error) {
        console.error(`Error fetching current ${maturity.series}:`, error.message);
        return null;
      }
    });

    // Get historical values (1 month ago and 1 year ago)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const historicalPromises = maturities.map(async (maturity) => {
      try {
        console.log(`Fetching historical ${maturity.series}`);
        const response = await axios.get(`${FRED_BASE_URL}/series/observations`, {
          params: {
            series_id: maturity.series,
            api_key: FRED_API_KEY,
            file_type: 'json',
            start_date: oneYearAgo.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            sort_order: 'desc'
          },
          timeout: 15000
        });

        const validObs = response.data.observations.filter(obs => obs.value !== '.');
        
        // Find closest dates to 1 month ago and 1 year ago
        const oneMonthValue = validObs.find(obs => 
          new Date(obs.date) <= oneMonthAgo
        );
        const oneYearValue = validObs.find(obs => 
          new Date(obs.date) <= oneYearAgo
        );

        return {
          series: maturity.series,
          oneMonthAgo: oneMonthValue ? parseFloat(oneMonthValue.value) : null,
          oneYearAgo: oneYearValue ? parseFloat(oneYearValue.value) : null
        };
      } catch (error) {
        console.error(`Error fetching historical ${maturity.series}:`, error.message);
        return { series: maturity.series, oneMonthAgo: null, oneYearAgo: null };
      }
    });

    const [currentResults, historicalResults] = await Promise.all([
      Promise.all(currentPromises),
      Promise.all(historicalPromises)
    ]);

    // Combine current and historical data
    const yieldCurveData = currentResults
      .filter(result => result !== null)
      .map(current => {
        const historical = historicalResults.find(h => h.series === current.series);
        return {
          maturity: current.label,
          months: current.months,
          current: current.current,
          oneMonthAgo: historical?.oneMonthAgo || current.current,
          oneYearAgo: historical?.oneYearAgo || current.current,
          date: current.date
        };
      })
      .sort((a, b) => a.months - b.months);

    res.json({
      data: yieldCurveData,
      dates: {
        current: endDate.toISOString().split('T')[0],
        oneMonthAgo: oneMonthAgo.toISOString().split('T')[0],
        oneYearAgo: oneYearAgo.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Historical yield curve error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch historical yield curve',
      message: error.message
    });
  }
});

app.get('/api/fred/historical/spread', async (req, res) => {
  try {
    const { days = 180 } = req.query;
    
    if (!FRED_API_KEY) {
      return res.status(400).json({ 
        error: 'FRED_API_KEY not configured'
      });
    }

    console.log(`Fetching historical 2s/10s spread data for ${days} days`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`FRED API spread request: start_date=${startDateStr}, end_date=${endDateStr}`);

    // Fetch 2Y and 10Y data
    const [dgs2Response, dgs10Response] = await Promise.all([
      axios.get(`${FRED_BASE_URL}/series/observations`, {
        params: {
          series_id: 'DGS2',
          api_key: FRED_API_KEY,
          file_type: 'json',
          start_date: startDateStr,
          end_date: endDateStr,
          sort_order: 'asc'
        },
        timeout: 15000
      }),
      axios.get(`${FRED_BASE_URL}/series/observations`, {
        params: {
          series_id: 'DGS10',
          api_key: FRED_API_KEY,
          file_type: 'json',
          start_date: startDateStr,
          end_date: endDateStr,
          sort_order: 'asc'
        },
        timeout: 15000
      })
    ]);

    console.log(`FRED API returned ${dgs2Response.data.observations?.length || 0} DGS2 observations`);
    console.log(`FRED API returned ${dgs10Response.data.observations?.length || 0} DGS10 observations`);

    const dgs2Data = dgs2Response.data.observations.filter(obs => obs.value !== '.');
    const dgs10Data = dgs10Response.data.observations.filter(obs => obs.value !== '.');

    // Calculate spread for each date
    const spreadData = [];
    const dateMap = new Map();

    // Create date map from 2Y data
    dgs2Data.forEach(obs => {
      dateMap.set(obs.date, { date: obs.date, dgs2: parseFloat(obs.value) });
    });

    // Add 10Y data and calculate spread
    dgs10Data.forEach(obs => {
      const existing = dateMap.get(obs.date);
      if (existing) {
        existing.dgs10 = parseFloat(obs.value);
        existing.spread = existing.dgs10 - existing.dgs2;
        existing.isInverted = existing.spread < 0;
        existing.displayDate = new Date(obs.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        spreadData.push(existing);
      }
    });

    res.json({
      data: spreadData.sort((a, b) => new Date(a.date) - new Date(b.date)),
      summary: {
        totalPoints: spreadData.length,
        inversionDays: spreadData.filter(d => d.isInverted).length,
        currentSpread: spreadData.length > 0 ? spreadData[spreadData.length - 1].spread : null
      }
    });

  } catch (error) {
    console.error('Historical spread error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch historical spread data',
      message: error.message
    });
  }
});

app.get('/api/fred/historical/10y-treasury', async (req, res) => {
  try {
    const { days = 180 } = req.query;
    
    if (!FRED_API_KEY) {
      return res.status(400).json({ 
        error: 'FRED_API_KEY not configured'
      });
    }

    console.log(`Fetching historical 10Y Treasury data for ${days} days`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`FRED API request: start_date=${startDateStr}, end_date=${endDateStr}`);

    const response = await axios.get(`${FRED_BASE_URL}/series/observations`, {
      params: {
        series_id: 'DGS10',
        api_key: FRED_API_KEY,
        file_type: 'json',
        start_date: startDateStr,
        end_date: endDateStr,
        sort_order: 'asc'
      },
      timeout: 15000
    });

    console.log(`FRED API returned ${response.data.observations?.length || 0} observations`);

    const validObs = response.data.observations.filter(obs => obs.value !== '.');
    
         const tenYearData = validObs.map((obs, index) => {
       const date = new Date(obs.date);
       const yieldValue = parseFloat(obs.value);
       
       // Calculate 20-day moving average
       const start = Math.max(0, index - 19);
       const slice = validObs.slice(start, index + 1);
       const ma20 = slice.reduce((sum, d) => sum + parseFloat(d.value), 0) / slice.length;
       
       // Mock Fed meeting dates (typically 8 per year, roughly every 6-7 weeks)
       const fedMeetingDates = [
         '2024-07-31', '2024-09-18', '2024-11-07', '2024-12-18',
         '2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18'
       ];
       
       const isFedMeeting = fedMeetingDates.includes(obs.date);
       
       return {
         date: obs.date,
         yield: yieldValue,
         ma20: parseFloat(ma20.toFixed(3)),
         displayDate: date.toLocaleDateString('en-US', { 
           month: 'short', 
           day: 'numeric' 
         }),
         isFedMeeting,
         fedDecision: isFedMeeting ? (Math.random() > 0.5 ? "+25bps" : "Hold") : null
       };
     });

     // Calculate percentiles
     const yields = tenYearData.map(d => d.yield);
    const sortedYields = [...yields].sort((a, b) => a - b);
    const percentiles = {
      p5: sortedYields[Math.floor(sortedYields.length * 0.05)],
      p25: sortedYields[Math.floor(sortedYields.length * 0.25)],
      p50: sortedYields[Math.floor(sortedYields.length * 0.50)],
      p75: sortedYields[Math.floor(sortedYields.length * 0.75)],
      p95: sortedYields[Math.floor(sortedYields.length * 0.95)]
    };

    res.json({
      data: tenYearData,
      percentiles,
      summary: {
        totalPoints: tenYearData.length,
        current: tenYearData.length > 0 ? tenYearData[tenYearData.length - 1].yield : null,
        min: Math.min(...yields),
        max: Math.max(...yields),
        average: yields.reduce((a, b) => a + b, 0) / yields.length
      }
    });

  } catch (error) {
    console.error('Historical 10Y Treasury error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch historical 10Y Treasury data',
      message: error.message
    });
  }
});

// Add rate limiting to prevent FRED API overuse
const rateLimit = (() => {
  let lastRequest = 0;
  const minInterval = 3000; // 3 seconds between requests
  
  return async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    lastRequest = Date.now();
  };
})();

// Wrapper for FRED API calls with rate limiting
const fredApiCall = async (url, params) => {
  await rateLimit();
  return axios.get(url, { params, timeout: 15000 });
};

// Check for fallback mode
const shouldUseFallback = () => {
  return !FRED_API_KEY || process.env.USE_FALLBACK === 'true';
};

// Fallback data generators
const generateFallbackYieldCurve = () => {
  const maturities = [
    { label: '3M', months: 3, yield: 5.32 },
    { label: '6M', months: 6, yield: 5.11 },
    { label: '1Y', months: 12, yield: 4.87 },
    { label: '2Y', months: 24, yield: 4.28 },
    { label: '5Y', months: 60, yield: 4.12 },
    { label: '7Y', months: 84, yield: 4.15 },
    { label: '10Y', months: 120, yield: 4.19 },
    { label: '20Y', months: 240, yield: 4.35 },
    { label: '30Y', months: 360, yield: 4.41 }
  ];

  return maturities.map(m => ({
    ...m,
    current: m.yield,
    oneMonthAgo: m.yield + (Math.random() - 0.5) * 0.2,
    oneYearAgo: m.yield + (Math.random() - 0.5) * 0.8,
    date: new Date().toISOString().split('T')[0]
  }));
};

const generateFallbackSpread = (days) => {
  const data = [];
  const currentSpread = -0.09; // Current inverted state
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    
    const variation = Math.sin(i * 0.1) * 0.15 + Math.cos(i * 0.05) * 0.1;
    const spread = currentSpread + variation;
    
    data.push({
      date: date.toISOString().split('T')[0],
      dgs2: 4.28,
      dgs10: 4.19,
      spread: parseFloat(spread.toFixed(3)),
      isInverted: spread < 0,
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }
  
  return data;
};

const generateFallback10Y = (days) => {
  const data = [];
  const current10Y = 4.19;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    
    const variation = Math.sin(i * 0.08) * 0.15 + Math.cos(i * 0.12) * 0.1;
    const yieldValue = current10Y + variation;
    
    data.push({
      date: date.toISOString().split('T')[0],
      yield: parseFloat(yieldValue.toFixed(3)),
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isFedMeeting: [15, 45, 75, 105, 135, 165].includes(i),
      fedDecision: [15, 45, 75, 105, 135, 165].includes(i) ? (i % 2 === 0 ? "+25bps" : "Hold") : null
    });
  }
  
  // Add moving averages
  return data.map((item, index) => {
    const start = Math.max(0, index - 19);
    const slice = data.slice(start, index + 1);
    const ma20 = slice.reduce((sum, d) => sum + d.yield, 0) / slice.length;
    
    return {
      ...item,
      ma20: parseFloat(ma20.toFixed(3))
    };
  });
};

// Historical endpoints that prioritize fallback data to avoid API rate limiting
app.get('/api/fred/historical/yield-curve', async (req, res) => {
  try {
    console.log('Historical yield curve request - returning fallback data');
    const data = generateFallbackYieldCurve();
    res.json({
      data,
      dates: {
        current: new Date().toISOString().split('T')[0],
        oneMonthAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        oneYearAgo: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      fallback: true
    });
  } catch (error) {
    console.error('Historical yield curve error:', error.message);
    res.status(500).json({
      error: 'Failed to generate yield curve data',
      message: error.message
    });
  }
});

app.get('/api/fred/historical/spread', async (req, res) => {
  try {
    const { days = 180 } = req.query;
    console.log('Historical spread request - returning fallback data');
    const data = generateFallbackSpread(parseInt(days));
    res.json({
      data,
      summary: {
        totalPoints: data.length,
        inversionDays: data.filter(d => d.isInverted).length,
        currentSpread: data[data.length - 1].spread
      },
      fallback: true
    });
  } catch (error) {
    console.error('Historical spread error:', error.message);
    res.status(500).json({
      error: 'Failed to generate spread data',
      message: error.message
    });
  }
});

app.get('/api/fred/historical/10y-treasury', async (req, res) => {
  try {
    const { days = 180 } = req.query;
    console.log('Historical 10Y Treasury request - returning fallback data');
    const data = generateFallback10Y(parseInt(days));
    const yields = data.map(d => d.yield);
    const sortedYields = [...yields].sort((a, b) => a - b);
    
    res.json({
      data,
      percentiles: {
        p5: sortedYields[Math.floor(sortedYields.length * 0.05)],
        p25: sortedYields[Math.floor(sortedYields.length * 0.25)],
        p50: sortedYields[Math.floor(sortedYields.length * 0.50)],
        p75: sortedYields[Math.floor(sortedYields.length * 0.75)],
        p95: sortedYields[Math.floor(sortedYields.length * 0.95)]
      },
      summary: {
        totalPoints: data.length,
        current: data[data.length - 1].yield,
        min: Math.min(...yields),
        max: Math.max(...yields),
        average: yields.reduce((a, b) => a + b, 0) / yields.length
      },
      fallback: true
    });
  } catch (error) {
    console.error('Historical 10Y Treasury error:', error.message);
    res.status(500).json({
      error: 'Failed to generate 10Y Treasury data',
      message: error.message
    });
  }
});

// Start server with port availability check
const startServer = async () => {
  try {
    const availablePort = await findAvailablePort(PORT);
    
    app.listen(availablePort, '0.0.0.0', () => {
      console.log(`🚀 Bond Dashboard API Server running on http://0.0.0.0:${availablePort}`);
      console.log(`📊 FRED API Key configured: ${FRED_API_KEY ? 'Yes' : 'No'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (availablePort !== PORT) {
        console.log(`⚠️  Note: Requested port ${PORT} was unavailable, using port ${availablePort}`);
        console.log(`💡 Update your frontend proxy to target http://localhost:${availablePort}`);
      }
      
      if (!FRED_API_KEY) {
        console.log('⚠️  Warning: VITE_FRED_API_KEY not found in .env.local');
        console.log('💡 Add your FRED API key to .env.local to enable live data');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
}); 