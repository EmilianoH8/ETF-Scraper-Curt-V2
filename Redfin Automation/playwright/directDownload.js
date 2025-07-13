const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { logDownload } = require('./utils');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

/**
 * Direct download using the API URL you discovered
 */
async function directDownload() {
  console.log('🚀 Starting direct API download...');
  
  // The API URL from your browser download
  const apiUrl = 'https://www.redfin.com/stingray/api/gis-csv?al=3&has_att_fiber=false&has_deal=false&has_dishwasher=false&has_laundry_facility=false&has_laundry_hookups=false&has_parking=false&has_pool=false&has_short_term_lease=false&include_pending_homes=false&isRentals=false&is_furnished=false&is_income_restricted=false&is_senior_living=false&market=florida-panhandle&num_homes=350&ord=redfin-recommended-asc&page_number=1&pool=false&region_id=482&region_type=5&sold_within_days=90&status=9&travel_with_traffic=false&travel_within_region=false&uipt=5&utilities_included=false&v=8';
  
  // Get credentials
  const email = process.env.RF_USER_EMAIL;
const password = process.env.RF_USER_PASSWORD;
  
  if (!email || !password) {
    console.error('❌ Missing REDFIN_EMAIL or REDFIN_PASSWORD in config/.env');
    return;
  }
  
  // Create directories if they don't exist
  const rawDataDir = path.join(__dirname, '..', 'data', 'raw');
  const logDir = path.join(__dirname, '..', 'logs');
  
  [rawDataDir, logDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Launch browser to get authenticated session
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to Redfin and login
    console.log('🔐 Logging into Redfin...');
    await page.goto('https://www.redfin.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Click login button
    const loginButton = page.locator('button:has-text("Log in")');
    if (await loginButton.isVisible({ timeout: 5000 })) {
      await loginButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Simple login flow
    console.log('📧 Filling in credentials...');
    await page.fill('input[type="email"]', email);
    await page.waitForTimeout(1000);
    await page.fill('input[type="password"]', password);
    await page.waitForTimeout(1000);
    
    const submitButton = page.locator('button:has-text("Continue with email")');
    if (await submitButton.isVisible({ timeout: 2000 })) {
      await submitButton.click();
      await page.waitForTimeout(5000);
    }
    
    console.log('✅ Login completed, getting cookies...');
    
    // Get cookies for authenticated requests
    const cookies = await context.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    console.log(`🍪 Got ${cookies.length} cookies for authentication`);
    
    // Step 2: Make authenticated request to API
    console.log('📥 Making authenticated API request...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `okaloosa-land-sold-90d-${timestamp}.csv`;
    const targetPath = path.join(rawDataDir, filename);
    
    // Create write stream
    const fileStream = fs.createWriteStream(targetPath);
    
    // Make the request with authentication
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookieString,
        'Referer': 'https://www.redfin.com/county/482/FL/Okaloosa-County',
        'Accept': 'text/csv,application/csv,*/*'
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.get(apiUrl, options, (res) => {
        console.log(`📊 Response status: ${res.statusCode}`);
        console.log(`📋 Content-Type: ${res.headers['content-type']}`);
        console.log(`📏 Content-Length: ${res.headers['content-length']}`);
        
        if (res.statusCode === 200) {
          res.pipe(fileStream);
          
          fileStream.on('finish', () => {
            console.log(`✅ Downloaded and saved: ${filename}`);
            console.log(`📁 File location: ${targetPath}`);
            
            // Check file size
            const stats = fs.statSync(targetPath);
            console.log(`📏 File size: ${stats.size} bytes`);
            
            if (stats.size > 0) {
              // Log successful download
              logDownload(logDir, {
                county: 'Okaloosa',
                filters: 'Land, Sold 90 days',
                status: 'success',
                filename,
                timestamp,
                fileSize: stats.size,
                method: 'direct-api'
              });
              
              console.log('🎉 Direct download completed successfully!');
            } else {
              console.log('⚠️ Downloaded file is empty, might need authentication');
            }
            
            resolve();
          });
          
          fileStream.on('error', (err) => {
            console.error('❌ Error writing file:', err);
            reject(err);
          });
        } else {
          console.log(`❌ API request failed with status: ${res.statusCode}`);
          
          // Read response body for error details
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            console.log('📄 Response body:', body.substring(0, 500));
            reject(new Error(`API request failed: ${res.statusCode}`));
          });
        }
      });
      
      req.on('error', (err) => {
        console.error('❌ Request error:', err);
        reject(err);
      });
      
      req.setTimeout(30000, () => {
        console.log('⏰ Request timeout');
        req.abort();
        reject(new Error('Request timeout'));
      });
    });
    
  } catch (error) {
    console.error('❌ Error during direct download:', error);
  } finally {
    await browser.close();
    console.log('🏁 Direct download completed');
  }
}

// Run the direct download
directDownload().catch(console.error); 