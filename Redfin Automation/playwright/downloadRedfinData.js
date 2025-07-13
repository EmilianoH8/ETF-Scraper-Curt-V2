const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { waitForDownloadAndMove, checkResultCount, createSafeFilename, logDownload, isAlreadyDownloaded } = require('./utils');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

/**
 * Handles Redfin's multi-step login flow
 */
async function handleRedfinLogin(page, email, password) {
  console.log(`🔐 Starting Redfin login process...`);
  
  // Take a screenshot to see the login dialog
  const loginScreenshotPath = path.join(__dirname, '..', 'logs', `login_dialog_${Date.now()}.png`);
  await page.screenshot({ path: loginScreenshotPath, fullPage: true });
  console.log(`📸 Login dialog screenshot: ${loginScreenshotPath}`);
  
  // Wait a moment for dialog to fully load
  await page.waitForTimeout(2000);
  
  // Step 1: Check for initial "Unlock the full experience" modal
  const unlockModal = page.locator('text="Unlock the full experience"');
  if (await unlockModal.isVisible({ timeout: 2000 })) {
    console.log(`🔓 Found "Unlock the full experience" modal`);
    
    // Look for "Continue with email" button in the initial modal
    const emailButton = page.locator('button:has-text("Continue with email")');
    if (await emailButton.isVisible({ timeout: 2000 })) {
      console.log(`📧 Clicking "Continue with email" button`);
      await emailButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log(`❌ Could not find "Continue with email" button in initial modal`);
      return false;
    }
  }
  
  // Step 2: Check for "Welcome back" modal (this often appears after clicking continue with email)
  console.log(`🔍 Checking for "Welcome back" modal...`);
  const welcomeBackModal = page.locator('text="Welcome back"');
  if (await welcomeBackModal.isVisible({ timeout: 3000 })) {
    console.log(`👋 Found "Welcome back" modal`);
    
    // Check if it suggests Google login
    const googleSuggestion = page.locator('text="You originally signed up with Google"');
    if (await googleSuggestion.isVisible({ timeout: 1000 })) {
      console.log(`🔍 Account originally signed up with Google, looking for "Sign in with email instead"`);
      
      // Look for "Sign in with email instead" option with multiple selectors
      const emailInsteadSelectors = [
        'text="Sign in with email instead"',
        'a:has-text("Sign in with email instead")',
        'button:has-text("Sign in with email instead")',
        'a:has-text("email instead")',
        '[href*="email"]'
      ];
      
      let emailInsteadFound = false;
      for (const selector of emailInsteadSelectors) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`📧 Found "Sign in with email instead" with selector: ${selector}`);
            await element.click();
            await page.waitForTimeout(3000);
            emailInsteadFound = true;
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      if (!emailInsteadFound) {
        console.log(`❌ Could not find "Sign in with email instead" option`);
        // Take a debug screenshot
        const debugPath = path.join(__dirname, '..', 'logs', `welcome_back_debug_${Date.now()}.png`);
        await page.screenshot({ path: debugPath, fullPage: true });
        console.log(`📸 Debug screenshot: ${debugPath}`);
        return false;
      }
    }
  } else {
    console.log(`ℹ️ No "Welcome back" modal found - continuing to email/password form`);
  }
  
  // Step 3: Handle email and password form
  console.log(`🔍 Looking for email/password form...`);
  
  // Look for email field with comprehensive selectors
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    '#email',
    '[data-rf-test-id="email"]',
    '[data-testid="email"]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]'
  ];
  
  let emailInput = null;
  for (const selector of emailSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`🎯 Found email input with selector: ${selector}`);
        emailInput = element;
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!emailInput) {
    console.log(`❌ Could not find email input field`);
    return false;
  }
  
  // Fill email field
  console.log(`📧 Filling email field...`);
  await emailInput.scrollIntoViewIfNeeded();
  await emailInput.click();
  await page.waitForTimeout(500);
  
  // Check if email is already filled (as shown in screenshot 3)
  const currentEmail = await emailInput.inputValue();
  if (currentEmail && currentEmail.length > 0) {
    console.log(`📧 Email already filled: ${currentEmail}`);
  } else {
    await emailInput.clear();
    await emailInput.fill(email);
    console.log(`📧 Email filled: ${email}`);
  }
  
  // After filling email, look for "Continue with email" button first
  console.log(`🔍 Looking for "Continue with email" button after filling email...`);
  const continueEmailButton = page.locator('button:has-text("Continue with email")');
  if (await continueEmailButton.isVisible({ timeout: 2000 })) {
    console.log(`📧 Clicking "Continue with email" button after filling email`);
    await continueEmailButton.click();
    await page.waitForTimeout(3000);
    
    // NOW check for "Welcome back" modal after clicking continue
    console.log(`🔍 Checking for "Welcome back" modal after continue...`);
    const welcomeBackModalAfter = page.locator('text="Welcome back"');
    if (await welcomeBackModalAfter.isVisible({ timeout: 3000 })) {
      console.log(`👋 Found "Welcome back" modal after continue!`);
      
      // Take a screenshot of the welcome back modal first
      const welcomeBackScreenshotPath = path.join(__dirname, '..', 'logs', `welcome_back_modal_${Date.now()}.png`);
      await page.screenshot({ path: welcomeBackScreenshotPath, fullPage: true });
      console.log(`📸 Welcome back modal screenshot: ${welcomeBackScreenshotPath}`);
      
      // Check if it suggests Google login
      const googleSuggestionAfter = page.locator('text="You originally signed up with Google"');
      if (await googleSuggestionAfter.isVisible({ timeout: 1000 })) {
        console.log(`🔍 Account originally signed up with Google, clicking "Sign in with email instead"`);
      } else {
        console.log(`ℹ️ No Google suggestion found, looking for email option anyway`);
      }
      
      // Look for "Sign in with email instead" option - try all selectors regardless
      const emailInsteadSelectors = [
        'text="Sign in with email instead"',
        'a:has-text("Sign in with email instead")',
        'button:has-text("Sign in with email instead")',
        'a:has-text("email instead")',
        'a:has-text("email")',
        '[href*="email"]',
        '*:has-text("email")'
      ];
      
      let emailInsteadFound = false;
      for (const selector of emailInsteadSelectors) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`📧 Found "Sign in with email instead" with selector: ${selector}`);
            await element.click();
            await page.waitForTimeout(3000);
            emailInsteadFound = true;
            break;
          } else {
            console.log(`   ❌ Selector not visible: ${selector}`);
          }
        } catch (error) {
          console.log(`   ❌ Selector error: ${selector} - ${error.message}`);
          // Continue to next selector
        }
      }
      
      if (!emailInsteadFound) {
        console.log(`❌ Could not find "Sign in with email instead" option with any selector`);
        // Take a debug screenshot
        const debugPath = path.join(__dirname, '..', 'logs', `welcome_back_debug_${Date.now()}.png`);
        await page.screenshot({ path: debugPath, fullPage: true });
        console.log(`📸 Debug screenshot: ${debugPath}`);
        return false;
      }
    } else {
      console.log(`ℹ️ No "Welcome back" modal found after continue - proceeding to password field`);
    }
  } else {
    console.log(`ℹ️ No "Continue with email" button found - proceeding to password field`);
  }
  
  // Look for password field
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
    'input[placeholder*="Password" i]',
    '#password',
    '[data-rf-test-id="password"]',
    '[data-testid="password"]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="password"]'
  ];
  
  let passwordInput = null;
  for (const selector of passwordSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`🎯 Found password input with selector: ${selector}`);
        passwordInput = element;
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!passwordInput) {
    console.log(`❌ Could not find password input field`);
    return false;
  }
  
  // Fill password field
  console.log(`🔑 Filling password field...`);
  await passwordInput.scrollIntoViewIfNeeded();
  await passwordInput.click();
  await page.waitForTimeout(500);
  await passwordInput.clear();
  await passwordInput.fill(password);
  console.log(`🔑 Password filled (${password.length} characters)`);
  
  // Look for login button
  const loginButtonSelectors = [
    'button:has-text("Continue with email")',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Continue")',
    'button[type="submit"]',
    'input[type="submit"]',
    '[data-rf-test-id="login-button"]',
    '[data-testid="login-button"]',
    '.login-button'
  ];
  
  let loginButton = null;
  for (const selector of loginButtonSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        const buttonText = await element.textContent();
        console.log(`🎯 Found login button with selector: ${selector} (text: "${buttonText}")`);
        loginButton = element;
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!loginButton) {
    console.log(`❌ Could not find login button`);
    return false;
  }
  
  // Click login button
  console.log(`🔐 Clicking login button...`);
  await loginButton.scrollIntoViewIfNeeded();
  await loginButton.click();
  
  // Wait for login to complete
  console.log(`⏳ Waiting for login to complete...`);
  await page.waitForTimeout(5000);
  
  // Take screenshot after login attempt
  const afterLoginScreenshotPath = path.join(__dirname, '..', 'logs', `after_login_${Date.now()}.png`);
  await page.screenshot({ path: afterLoginScreenshotPath, fullPage: true });
  console.log(`📸 After login screenshot: ${afterLoginScreenshotPath}`);
  
  // Check if we're still on a login page (login failed)
  const stillOnLogin = await page.locator('input[type="password"]').isVisible({ timeout: 2000 });
  if (stillOnLogin) {
    console.log(`❌ Login appears to have failed - still seeing password field`);
    return false;
  }
  
  console.log(`✅ Login process completed successfully`);
  return true;
}

/**
 * Automates Redfin's download feature for sold land listings in Okaloosa County by size range and price batches.
 * Uses price ranges to stay under Redfin's ~300 listing download limit.
 * Filters: Property Type: Land, Sold Date: Last 12 months, Lot Size: variable, Price: batched ranges
 * Downloads CSVs to data/raw/
 */
async function downloadRedfinData(config) {
  console.log('🚀 Starting downloadRedfinData function...');
  const { county, state, sizeRanges, priceRanges } = config;
  console.log(`📊 Config loaded - County: ${county}, State: ${state}, ${sizeRanges.length} size ranges, ${priceRanges.length} price ranges`);
  
  // Load credentials from environment variables
  const email = process.env.RF_USER_EMAIL || 'emiliano@thevestagroupco.com';
  const password = process.env.RF_USER_PASSWORD || 'xarGZmyP7z8z3AU.';
  
  console.log(`📧 Using email: ${email}`);
  console.log(`🔑 Password loaded: ${password.length} characters`);
  
  // Set up browser with download directory
  const downloadDir = process.env.DOWNLOAD_DIR || path.join(require('os').homedir(), 'Downloads');
  console.log(`📁 Download directory: ${downloadDir}`);
  console.log(`🌐 Launching browser...`);
  const browser = await chromium.launch({ 
    headless: false,
    downloadsPath: downloadDir,
    slowMo: 300,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security'
    ]
  });
  console.log(`✅ Browser launched successfully`);
  
  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 }
  });
  
  const page = await context.newPage();
  
  // Add script to remove webdriver property
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  // Create directories if they don't exist
  const rawDataDir = path.join(__dirname, '..', 'data', 'raw');
  const logDir = path.join(__dirname, '..', 'logs');
  
  [rawDataDir, logDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  let totalDownloads = 0;
  let successfulDownloads = 0;
  let skippedDownloads = 0;

  console.log(`🔄 Starting processing loop for size ranges...`);
  for (const sizeRange of sizeRanges) {
    console.log(`📏 Processing size range: ${sizeRange.label}`);
    // Determine which price ranges to use for this size range
    const applicablePriceRanges = getPriceRangesForSize(sizeRange, priceRanges);
    
    for (const priceRange of applicablePriceRanges) {
      // Build Redfin search URL with all filters - define outside try block so it's accessible in catch
      let searchUrl = buildRedfinUrl({
        county,
        state,
        sizeRange,
        priceRange,
        propertyType: 'Land',
        soldDateRange: '12mo'
      });
      
      try {
        // Check if already downloaded
        if (isAlreadyDownloaded(logDir, county, sizeRange, priceRange)) {
          console.log(`⏭️  Skipping ${county}-${sizeRange.label}-${priceRange.label} (already downloaded)`);
          skippedDownloads++;
          continue;
        }

        console.log(`🔍 Processing County: ${county}, Size: ${sizeRange.label}, Price: ${priceRange.label}`);
        
        console.log(`🌐 Navigating to: ${searchUrl}`);
        
        // Navigate to Redfin with retry logic
        let navigationSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!navigationSuccess && attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 Navigation attempt ${attempts}/${maxAttempts}...`);
          
          try {
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            console.log(`✅ Page loaded, waiting for content...`);
            await page.waitForTimeout(2000);
            
            // Try to wait for network idle, but don't fail if it times out
            try {
              await page.waitForLoadState('networkidle', { timeout: 8000 });
              console.log(`✅ Page fully loaded`);
            } catch (idleError) {
              console.log(`⚠️  Network idle timeout, but continuing...`);
            }
            
            navigationSuccess = true;
            
          } catch (error) {
            console.log(`❌ Navigation attempt ${attempts} failed: ${error.message}`);
            
            if (attempts < maxAttempts) {
              console.log(`⏳ Waiting 5 seconds before retry...`);
              await page.waitForTimeout(5000);
            } else {
              throw new Error(`Failed to navigate after ${maxAttempts} attempts: ${error.message}`);
            }
          }
        }
        
        // Check result count
        const resultInfo = await checkResultCount(page, 300);
        console.log(`📊 Found ${resultInfo.count} results`);
        
        if (resultInfo.count === 0) {
          console.log(`⚠️  No results found for ${sizeRange.label} acres, ${priceRange.label} price range`);
          logDownload(logDir, {
            county,
            sizeRange: sizeRange.label,
            priceRange: priceRange.label,
            resultCount: 0,
            status: 'no_results',
            url: searchUrl
          });
          continue;
        }
        
        if (resultInfo.exceedsLimit) {
          console.log(`⚠️  Results exceed limit (${resultInfo.count}). Consider splitting price range further.`);
          // For now, we'll still download but log the warning
        }
        
        // Look for download button
        const downloadButton = await findDownloadButton(page);
        
        if (!downloadButton) {
          console.log(`❌ No download button found for ${sizeRange.label}-${priceRange.label}`);
          logDownload(logDir, {
            county,
            sizeRange: sizeRange.label,
            priceRange: priceRange.label,
            resultCount: resultInfo.count,
            status: 'no_download_button',
            url: searchUrl
          });
          continue;
        }
        
        console.log(`⬇️  Initiating download...`);
        
        // Set up download promise
        const downloadPromise = context.waitForEvent('download', { timeout: 60000 });
        
        // Click download button
        await downloadButton.click();
        await page.waitForTimeout(3000);
        
        // Check if login is required
        const loginModalSelectors = [
          'text="Unlock the full experience"',
          'text="Welcome back"',
          'text="You originally signed up with Google"',
          'input[type="email"]',
          'input[name="email"]',
          'input[placeholder*="email" i]',
          'button:has-text("Continue with email")',
          'button:has-text("Continue with Google")',
          'button:has-text("Continue with Apple")'
        ];
        
        let loginRequired = false;
        let foundLoginIndicator = '';
        for (const selector of loginModalSelectors) {
          try {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              console.log(`🔐 Login required - found: ${selector}`);
              loginRequired = true;
              foundLoginIndicator = selector;
              break;
            }
          } catch (e) {
            // Continue checking
          }
        }
        
        if (loginRequired) {
          console.log(`🔐 Handling login prompt (detected: ${foundLoginIndicator})...`);
          const loginSuccess = await handleRedfinLogin(page, email, password);
          
          if (loginSuccess) {
            console.log(`✅ Login completed, trying download again...`);
            
            // Wait for page to settle after login
            await page.waitForTimeout(3000);
            
            // Look for download button again after login
            const downloadButtonAfterLogin = await findDownloadButton(page);
            if (downloadButtonAfterLogin) {
              console.log(`🔄 Setting up new download promise after login...`);
              // Set up a NEW download promise since the old one may have timed out
              const newDownloadPromise = context.waitForEvent('download', { timeout: 60000 });
              
              console.log(`🔄 Clicking download button again after login`);
              await downloadButtonAfterLogin.click();
              await page.waitForTimeout(2000);
              
              // Wait for the NEW download to complete
              console.log(`⏳ Waiting for download to start...`);
              const download = await newDownloadPromise;
              const downloadPath = await download.path();
              
              if (downloadPath) {
                // Create safe filename and move file
                const filename = createSafeFilename(county, sizeRange, priceRange);
                const targetPath = path.join(rawDataDir, filename);
                
                // Move the downloaded file
                fs.renameSync(downloadPath, targetPath);
                
                console.log(`✅ Downloaded and saved: ${filename}`);
                
                // Log successful download
                logDownload(logDir, {
                  county,
                  sizeRange: sizeRange.label,
                  priceRange: priceRange.label,
                  resultCount: resultInfo.count,
                  status: 'success',
                  filename,
                  url: searchUrl
                });
                
                successfulDownloads++;
                totalDownloads++;
                
                // Add delay between downloads to be respectful
                await page.waitForTimeout(5000);
                
                // Skip the original download logic since we handled it here
                continue;
              } else {
                throw new Error('Download failed after login - no file path');
              }
            } else {
              console.log(`❌ Download button not found after login`);
              throw new Error('Download button not found after login');
            }
          } else {
            console.log(`❌ Login failed, cannot proceed with download`);
            throw new Error('Login failed');
          }
        }
        
        // Wait for download to complete
        const download = await downloadPromise;
        const downloadPath = await download.path();
        
        if (downloadPath) {
          // Create safe filename and move file
          const filename = createSafeFilename(county, sizeRange, priceRange);
          const targetPath = path.join(rawDataDir, filename);
          
          // Move the downloaded file
          fs.renameSync(downloadPath, targetPath);
          
          console.log(`✅ Downloaded and saved: ${filename}`);
          
          // Log successful download
          logDownload(logDir, {
            county,
            sizeRange: sizeRange.label,
            priceRange: priceRange.label,
            resultCount: resultInfo.count,
            status: 'success',
            filename,
            url: searchUrl
          });
          
          successfulDownloads++;
        } else {
          throw new Error('Download failed - no file path');
        }
        
        totalDownloads++;
        
        // Add delay between downloads to be respectful
        await page.waitForTimeout(15000);
        
      } catch (error) {
        console.error(`❌ Error processing ${county}-${sizeRange.label}-${priceRange.label}:`, error.message);
        
        // Log failed download
        logDownload(logDir, {
          county,
          sizeRange: sizeRange.label,
          priceRange: priceRange.label,
          status: 'error',
          error: error.message,
          url: searchUrl
        });
        
        totalDownloads++;
        
        // Add longer delay after errors to avoid rate limiting
        await page.waitForTimeout(10000);
        
        // Continue with next iteration
        continue;
      }
    }
  }

  await browser.close();
  
  // Print summary
  console.log(`\n📈 Download Summary:`);
  console.log(`   Total attempts: ${totalDownloads}`);
  console.log(`   Successful: ${successfulDownloads}`);
  console.log(`   Skipped: ${skippedDownloads}`);
  console.log(`   Failed: ${totalDownloads - successfulDownloads}`);
}

/**
 * Finds the download button on the Redfin page
 * Tries multiple selectors as Redfin may use different button styles
 */
async function findDownloadButton(page) {
  const downloadSelectors = [
    'button[data-rf-test-id="download-button"]',
    'button:has-text("Download")',
    'a:has-text("Download")',
    '[data-rf-test-id="download-all"]',
    'button:has-text("Export")',
    '.download-button',
    '[aria-label*="download" i]',
    '[title*="download" i]'
  ];
  
  for (const selector of downloadSelectors) {
    try {
      const button = await page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        console.log(`🎯 Found download button with selector: ${selector}`);
        return button;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  // If no button found, try to look for any clickable element with download text
  try {
    const downloadText = await page.locator('text=/download/i').first();
    if (await downloadText.isVisible({ timeout: 2000 })) {
      console.log(`🎯 Found download element with text`);
      return downloadText;
    }
  } catch (error) {
    // No download button found
  }
  
  return null;
}

/**
 * Determines which price ranges to use for a given size range
 * For lots under 1 acre, use price ranges up to $190k to exclude mislabeled houses
 * For larger lots, use all price ranges
 */
function getPriceRangesForSize(sizeRange, priceRanges) {
  if (sizeRange.maxPrice) {
    // For smaller lots with price caps, filter price ranges
    return priceRanges.filter(price => 
      price.max === null || price.max <= sizeRange.maxPrice
    );
  } else {
    // For larger lots, use all price ranges
    return priceRanges;
  }
}

/**
 * Builds Redfin search URL with all specified filters for Okaloosa County
 * Based on actual Redfin URL structure: /county/482/FL/Okaloosa-County/filter/...
 */
function buildRedfinUrl({ county, state, sizeRange, priceRange, propertyType, soldDateRange }) {
  // Okaloosa County ID is 482 based on the provided example
  const countyId = '482';
  const countyName = 'Okaloosa-County';
  
  // Base URL with correct structure
  const baseUrl = `https://www.redfin.com/county/${countyId}/${state}/${countyName}/filter`;
  
  // Build filter parameters
  const filters = [];
  
  // Property type filter (Land = property-type=land)
  if (propertyType === 'Land') {
    filters.push('property-type=land');
  }
  
  // Sold date filter (12mo = include=sold-1yr)
  if (soldDateRange === '12mo') {
    filters.push('include=sold-1yr');
  }
  
  // Lot size filter (convert acres to sqft for Redfin)
  const minSqft = Math.floor(sizeRange.min * 43560);
  const maxSqft = sizeRange.max === 1000 ? '' : Math.floor(sizeRange.max * 43560); // 1000 means no upper limit
  
  if (maxSqft) {
    filters.push(`lot-size=${minSqft}-${maxSqft}-sqft`);
  } else {
    filters.push(`lot-size=${minSqft}+-sqft`);
  }
  
  // Price filter
  const maxPrice = priceRange.max || '';
  filters.push(`price=${priceRange.min}-${maxPrice}`);
  
  // Combine all filters
  const filterString = filters.join(',');
  
  // Build final URL
  const finalUrl = `${baseUrl}/${filterString}`;
  
  return finalUrl;
}

// Load config and run
async function main() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'filters.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    await downloadRedfinData(config);
  } catch (error) {
    console.error('Error running download automation:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { downloadRedfinData, handleRedfinLogin, getPriceRangesForSize, buildRedfinUrl }; 