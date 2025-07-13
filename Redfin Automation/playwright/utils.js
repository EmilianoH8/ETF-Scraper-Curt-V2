const fs = require('fs');
const path = require('path');

/**
 * Utility functions for Redfin automation
 */

/**
 * Waits for a file to be downloaded and moves it to the target directory
 * @param {string} downloadDir - Browser's download directory
 * @param {string} targetDir - Target directory for the file
 * @param {string} newFilename - New filename for the downloaded file
 * @param {number} timeoutMs - Timeout in milliseconds
 */
async function waitForDownloadAndMove(downloadDir, targetDir, newFilename, timeoutMs = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const files = fs.readdirSync(downloadDir);
    const csvFiles = files.filter(file => file.endsWith('.csv') && !file.endsWith('.crdownload'));
    
    if (csvFiles.length > 0) {
      const downloadedFile = path.join(downloadDir, csvFiles[0]);
      const targetFile = path.join(targetDir, newFilename);
      
      // Move the file
      fs.renameSync(downloadedFile, targetFile);
      console.log(`Downloaded and moved: ${newFilename}`);
      return targetFile;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Download timeout after ${timeoutMs}ms`);
}

/**
 * Checks if the search results exceed the limit (typically 300 for Redfin)
 * @param {Page} page - Playwright page object
 * @param {number} limit - Maximum number of results allowed
 * @returns {Promise<{count: number, exceedsLimit: boolean}>}
 */
async function checkResultCount(page, limit = 300) {
  try {
    // Wait for results to load
    await page.waitForSelector('[data-rf-test-id="search-count"]', { timeout: 10000 });
    
    // Extract result count from Redfin's search count element
    const countText = await page.textContent('[data-rf-test-id="search-count"]');
    const match = countText.match(/(\d+)/);
    const count = match ? parseInt(match[1]) : 0;
    
    return {
      count,
      exceedsLimit: count > limit
    };
  } catch (error) {
    console.warn('Could not determine result count:', error.message);
    return { count: 0, exceedsLimit: false };
  }
}

/**
 * Splits a price range into smaller ranges if needed
 * @param {Object} priceRange - Original price range
 * @param {number} splits - Number of splits to create
 * @returns {Array} Array of smaller price ranges
 */
function splitPriceRange(priceRange, splits = 2) {
  if (!priceRange.max) {
    // Can't split open-ended ranges easily
    return [priceRange];
  }
  
  const rangeSize = (priceRange.max - priceRange.min) / splits;
  const splitRanges = [];
  
  for (let i = 0; i < splits; i++) {
    const min = Math.floor(priceRange.min + (rangeSize * i));
    const max = i === splits - 1 ? priceRange.max : Math.floor(priceRange.min + (rangeSize * (i + 1)) - 1);
    
    splitRanges.push({
      label: `${min}-${max}`,
      min,
      max
    });
  }
  
  return splitRanges;
}

/**
 * Creates a safe filename from search parameters
 * @param {string} zip - ZIP code
 * @param {Object} sizeRange - Size range object
 * @param {Object} priceRange - Price range object
 * @param {string} timestamp - Optional timestamp
 * @returns {string} Safe filename
 */
function createSafeFilename(zip, sizeRange, priceRange, timestamp = null) {
  const ts = timestamp || Date.now();
  const safeSizeLabel = sizeRange.label.replace(/[^a-zA-Z0-9.-]/g, '_');
  const safePriceLabel = priceRange.label.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${zip}_${safeSizeLabel}_${safePriceLabel}_${ts}.csv`;
}

/**
 * Logs download progress to a file
 * @param {string} logDir - Directory for log files
 * @param {Object} downloadInfo - Information about the download
 */
function logDownload(logDir, downloadInfo) {
  const logFile = path.join(logDir, 'downloads.log');
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...downloadInfo
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logFile, logLine);
}

/**
 * Checks if a download has already been completed
 * @param {string} logDir - Directory for log files
 * @param {string} zip - ZIP code
 * @param {Object} sizeRange - Size range object
 * @param {Object} priceRange - Price range object
 * @returns {boolean} True if already downloaded
 */
function isAlreadyDownloaded(logDir, zip, sizeRange, priceRange) {
  const logFile = path.join(logDir, 'downloads.log');
  
  if (!fs.existsSync(logFile)) {
    return false;
  }
  
  const logContent = fs.readFileSync(logFile, 'utf8');
  const searchKey = `${zip}_${sizeRange.label}_${priceRange.label}`;
  
  return logContent.includes(searchKey);
}

module.exports = {
  waitForDownloadAndMove,
  checkResultCount,
  splitPriceRange,
  createSafeFilename,
  logDownload,
  isAlreadyDownloaded
}; 