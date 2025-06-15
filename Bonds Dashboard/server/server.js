import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;
const FRED_API_KEY = process.env.VITE_FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bond Dashboard API Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 FRED API Key configured: ${FRED_API_KEY ? 'Yes' : 'No'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (!FRED_API_KEY) {
    console.log('⚠️  Warning: VITE_FRED_API_KEY not found in .env.local');
    console.log('💡 Add your FRED API key to .env.local to enable live data');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
}); 