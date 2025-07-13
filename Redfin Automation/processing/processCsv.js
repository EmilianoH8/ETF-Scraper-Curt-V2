const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

/**
 * Processes downloaded Redfin CSV files to calculate $/acre values
 * and generate market value matrices by ZIP code and size range
 */

/**
 * Processes a single CSV file and calculates price per acre
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} Array of processed records
 */
async function processCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true
    });

    parser.on('readable', function() {
      let record;
      while (record = parser.read()) {
        const processed = processRecord(record);
        if (processed) {
          records.push(processed);
        }
      }
    });

    parser.on('error', function(err) {
      reject(err);
    });

    parser.on('end', function() {
      resolve(records);
    });

    fs.createReadStream(filePath).pipe(parser);
  });
}

/**
 * Processes a single record from the CSV
 * @param {Object} record - Raw CSV record
 * @returns {Object|null} Processed record or null if invalid
 */
function processRecord(record) {
  try {
    // Extract key fields (adjust field names based on actual Redfin CSV structure)
    const price = parseFloat(record['PRICE'] || record['Sale Price'] || 0);
    const lotSizeSqft = parseFloat(record['LOT SIZE'] || record['Lot Size'] || 0);
    const zipCode = record['ZIP OR POSTAL CODE'] || record['Zip Code'] || '';
    const address = record['ADDRESS'] || record['Address'] || '';
    const saleDate = record['SOLD DATE'] || record['Sale Date'] || '';
    
    // Skip invalid records
    if (!price || !lotSizeSqft || !zipCode) {
      return null;
    }
    
    // Calculate acres and price per acre
    const acres = lotSizeSqft / 43560; // Convert sq ft to acres
    const pricePerAcre = price / acres;
    
    // Categorize by size range
    const sizeCategory = categorizeLotSize(acres);
    
    return {
      address,
      zipCode,
      price,
      lotSizeSqft,
      acres: parseFloat(acres.toFixed(4)),
      pricePerAcre: parseFloat(pricePerAcre.toFixed(2)),
      sizeCategory,
      saleDate,
      originalRecord: record
    };
  } catch (error) {
    console.warn('Error processing record:', error);
    return null;
  }
}

/**
 * Categorizes lot size into predefined ranges
 * @param {number} acres - Lot size in acres
 * @returns {string} Size category label
 */
function categorizeLotSize(acres) {
  if (acres <= 0.25) return '0-0.25';
  if (acres <= 0.5) return '0.25-0.5';
  if (acres <= 1) return '0.5-1';
  if (acres <= 3) return '1-3';
  if (acres <= 5) return '3-5';
  return '5+';
}

/**
 * Processes all CSV files in the raw data directory
 * @param {string} rawDataDir - Directory containing raw CSV files
 * @returns {Promise<Array>} Array of all processed records
 */
async function processAllCsvFiles(rawDataDir) {
  const files = fs.readdirSync(rawDataDir).filter(file => file.endsWith('.csv'));
  const allRecords = [];
  
  for (const file of files) {
    try {
      console.log(`Processing ${file}...`);
      const filePath = path.join(rawDataDir, file);
      const records = await processCsvFile(filePath);
      allRecords.push(...records);
      console.log(`Processed ${records.length} records from ${file}`);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  return allRecords;
}

/**
 * Generates market value matrix by ZIP code and size category
 * @param {Array} records - Processed records
 * @returns {Object} Market value matrix
 */
function generateMarketMatrix(records) {
  const matrix = {};
  
  // Group records by ZIP and size category
  records.forEach(record => {
    const { zipCode, sizeCategory, pricePerAcre } = record;
    
    if (!matrix[zipCode]) {
      matrix[zipCode] = {};
    }
    
    if (!matrix[zipCode][sizeCategory]) {
      matrix[zipCode][sizeCategory] = [];
    }
    
    matrix[zipCode][sizeCategory].push(pricePerAcre);
  });
  
  // Calculate statistics for each ZIP/size combination
  const marketMatrix = {};
  
  Object.keys(matrix).forEach(zipCode => {
    marketMatrix[zipCode] = {};
    
    Object.keys(matrix[zipCode]).forEach(sizeCategory => {
      const prices = matrix[zipCode][sizeCategory].sort((a, b) => a - b);
      const count = prices.length;
      
      if (count > 0) {
        marketMatrix[zipCode][sizeCategory] = {
          count,
          median: calculateMedian(prices),
          mean: parseFloat((prices.reduce((a, b) => a + b, 0) / count).toFixed(2)),
          min: prices[0],
          max: prices[count - 1],
          q1: calculatePercentile(prices, 25),
          q3: calculatePercentile(prices, 75)
        };
      }
    });
  });
  
  return marketMatrix;
}

/**
 * Calculates median value from sorted array
 * @param {Array} sortedArray - Sorted array of numbers
 * @returns {number} Median value
 */
function calculateMedian(sortedArray) {
  const mid = Math.floor(sortedArray.length / 2);
  return sortedArray.length % 2 !== 0 
    ? sortedArray[mid] 
    : (sortedArray[mid - 1] + sortedArray[mid]) / 2;
}

/**
 * Calculates percentile value from sorted array
 * @param {Array} sortedArray - Sorted array of numbers
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Percentile value
 */
function calculatePercentile(sortedArray, percentile) {
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedArray[lower];
  }
  
  return sortedArray[lower] + (sortedArray[upper] - sortedArray[lower]) * (index - lower);
}

/**
 * Saves processed data and market matrix to files
 * @param {Array} records - Processed records
 * @param {Object} marketMatrix - Market value matrix
 * @param {string} outputDir - Output directory
 */
async function saveProcessedData(records, marketMatrix, outputDir) {
  // Save all processed records
  const recordsFile = path.join(outputDir, 'processed_records.csv');
  const recordsData = records.map(record => ({
    address: record.address,
    zipCode: record.zipCode,
    price: record.price,
    acres: record.acres,
    pricePerAcre: record.pricePerAcre,
    sizeCategory: record.sizeCategory,
    saleDate: record.saleDate
  }));
  
  await saveToCsv(recordsData, recordsFile);
  
  // Save market matrix as JSON
  const matrixFile = path.join(outputDir, 'market_matrix.json');
  fs.writeFileSync(matrixFile, JSON.stringify(marketMatrix, null, 2));
  
  // Save market matrix as CSV for easy viewing
  const matrixCsvFile = path.join(outputDir, 'market_matrix.csv');
  const matrixCsvData = [];
  
  Object.keys(marketMatrix).forEach(zipCode => {
    Object.keys(marketMatrix[zipCode]).forEach(sizeCategory => {
      const stats = marketMatrix[zipCode][sizeCategory];
      matrixCsvData.push({
        zipCode,
        sizeCategory,
        count: stats.count,
        median: stats.median,
        mean: stats.mean,
        min: stats.min,
        max: stats.max,
        q1: stats.q1,
        q3: stats.q3
      });
    });
  });
  
  await saveToCsv(matrixCsvData, matrixCsvFile);
  
  console.log(`Saved processed data to ${outputDir}`);
}

/**
 * Saves data to CSV file
 * @param {Array} data - Data to save
 * @param {string} filePath - Output file path
 */
async function saveToCsv(data, filePath) {
  return new Promise((resolve, reject) => {
    stringify(data, { header: true }, (err, output) => {
      if (err) {
        reject(err);
      } else {
        fs.writeFileSync(filePath, output);
        resolve();
      }
    });
  });
}

// Main processing function
async function main() {
  try {
    const rawDataDir = path.join(__dirname, '..', 'data', 'raw');
    const processedDataDir = path.join(__dirname, '..', 'data', 'processed');
    
    // Create processed data directory if it doesn't exist
    if (!fs.existsSync(processedDataDir)) {
      fs.mkdirSync(processedDataDir, { recursive: true });
    }
    
    console.log('Processing CSV files...');
    const records = await processAllCsvFiles(rawDataDir);
    
    console.log(`Processed ${records.length} total records`);
    
    console.log('Generating market matrix...');
    const marketMatrix = generateMarketMatrix(records);
    
    console.log('Saving processed data...');
    await saveProcessedData(records, marketMatrix, processedDataDir);
    
    console.log('Processing complete!');
    
    // Print summary
    console.log('\nMarket Matrix Summary:');
    Object.keys(marketMatrix).forEach(zipCode => {
      console.log(`\nZIP ${zipCode}:`);
      Object.keys(marketMatrix[zipCode]).forEach(sizeCategory => {
        const stats = marketMatrix[zipCode][sizeCategory];
        console.log(`  ${sizeCategory} acres: ${stats.count} sales, $${stats.median}/acre median`);
      });
    });
    
  } catch (error) {
    console.error('Error processing data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  processCsvFile,
  processAllCsvFiles,
  generateMarketMatrix,
  saveProcessedData,
  categorizeLotSize
}; 