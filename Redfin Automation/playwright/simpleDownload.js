const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { waitForDownloadAndMove, createSafeFilename, logDownload } = require('./utils');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

/**
 * Downloads a file directly from URL using HTTP/HTTPS with cookie support
 */
async function downloadFileFromUrl(url, targetPath, cookies = []) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    console.log(`📥 Downloading from URL: ${url}`);
    console.log(`📁 Target path: ${targetPath}`);
    console.log(`🍪 Using ${cookies.length} cookies for authentication`);
    
    // Build cookie header from cookies array
    const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    
    // Extract CSRF token from cookies if available
    const csrfCookie = cookies.find(cookie => 
      cookie.name.toLowerCase().includes('csrf') || 
      cookie.name.toLowerCase().includes('token') ||
      cookie.name === 'RF_AUTH' ||
      cookie.name === 'JSESSIONID'
    );
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,application/csv,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.redfin.com/county/482/FL/Okaloosa-County',
        'Origin': 'https://www.redfin.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      }
    };
    
    // Add CSRF token if found
    if (csrfCookie) {
      console.log(`🛡️ Adding CSRF token from ${csrfCookie.name}`);
      options.headers['X-CSRF-Token'] = csrfCookie.value;
      // Also try alternative CSRF header names
      options.headers['X-CSRFToken'] = csrfCookie.value;
      options.headers['X-RF-Token'] = csrfCookie.value;
    }
    
    // Add cookies if provided
    if (cookieHeader) {
      options.headers['Cookie'] = cookieHeader;
      console.log(`🍪 Cookie header: ${cookieHeader.substring(0, 100)}...`);
    }
    
    const request = protocol.get(url, options, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(targetPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ File downloaded successfully: ${path.basename(targetPath)}`);
          resolve(targetPath);
        });
        
        fileStream.on('error', (err) => {
          fs.unlink(targetPath, () => {}); // Delete partial file
          reject(err);
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        console.log(`🔄 Redirecting to: ${redirectUrl}`);
        downloadFileFromUrl(redirectUrl, targetPath).then(resolve).catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    });
    
    request.on('error', reject);
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Extracts download URLs from browser's downloads page
 */
async function extractDownloadUrls(page) {
  console.log('🔍 Navigating to chrome://downloads/ to extract download URLs...');
  
  try {
    // Navigate to downloads page
    await page.goto('chrome://downloads/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Successfully navigated to downloads page');
    await page.waitForTimeout(3000);
    
    // Take screenshot of downloads page
    const logDir = path.join(__dirname, '..', 'logs');
    await page.screenshot({ 
      path: path.join(logDir, `downloads_page_${Date.now()}.png`),
      fullPage: true 
    });
    console.log('📸 Downloads page screenshot saved');
    
      // Wait for downloads to load
  console.log('⏳ Waiting for downloads to load...');
  await page.waitForTimeout(5000);
  
  // Log the current page content for debugging
  console.log('🔍 Current page URL:', page.url());
  
  // Check if we can see any download elements
  const pageContent = await page.evaluate(() => {
    const body = document.body;
    return {
      hasDownloadsManager: !!document.querySelector('downloads-manager'),
      hasDownloadItems: !!document.querySelector('downloads-item'),
      bodyInnerText: body ? body.innerText.substring(0, 500) : 'No body found',
      elementCount: document.querySelectorAll('*').length
    };
  });
  
  console.log('📄 Page content analysis:', pageContent); // Increased wait time
    
    // Check if there are any downloads visible
    const hasDownloads = await page.evaluate(() => {
      const downloadsManager = document.querySelector('downloads-manager');
      return downloadsManager !== null;
    });
    
    if (!hasDownloads) {
      console.log('❌ No downloads manager found on the page');
      return [];
    }
    
    console.log('✅ Downloads manager found, attempting to extract URLs...');
  } catch (error) {
    console.error('❌ Failed to navigate to downloads page:', error.message);
    return [];
  }
  
  try {
    // Method 1: Try to interact with download items directly using Playwright methods
    console.log('🔍 Attempting to interact with download items to copy URLs...');
    
    try {
      // First, check if there are any download items in shadow DOM
      const downloadCount = await page.evaluate(() => {
        const manager = document.querySelector('downloads-manager');
        if (!manager || !manager.shadowRoot) return 0;
        
        const downloadsList = manager.shadowRoot.querySelector('iron-list');
        if (!downloadsList) return 0;
        
        const items = downloadsList.querySelectorAll('downloads-item');
        console.log(`Found ${items.length} download items in shadow DOM`);
        return items.length;
      });
      
      console.log(`📋 Found ${downloadCount} download items to process`);
      
      if (downloadCount > 0) {
        // Try to extract URLs directly from shadow DOM first (simpler approach)
        const directUrls = await page.evaluate(() => {
          const urls = [];
          const manager = document.querySelector('downloads-manager');
          
          if (manager && manager.shadowRoot) {
            const downloadsList = manager.shadowRoot.querySelector('iron-list');
            if (downloadsList) {
              const items = downloadsList.querySelectorAll('downloads-item');
              
              items.forEach((item, index) => {
                if (item.shadowRoot) {
                  // Look for direct blob URLs or file links
                  const fileLink = item.shadowRoot.querySelector('#file-link') ||
                                 item.shadowRoot.querySelector('a[href]') ||
                                 item.shadowRoot.querySelector('.file-link');
                  
                  if (fileLink && fileLink.href) {
                    console.log(`Found direct URL in item ${index + 1}:`, fileLink.href);
                    
                    urls.push({
                      url: fileLink.href,
                      filename: fileLink.textContent || fileLink.title || `download_${index}`,
                      method: 'direct_shadow_dom'
                    });
                  }
                  
                  // Also check for any elements with data attributes that might contain URLs
                  const allElements = item.shadowRoot.querySelectorAll('*');
                  allElements.forEach(el => {
                    if (el.href && el.href.startsWith('blob:')) {
                      urls.push({
                        url: el.href,
                        filename: el.textContent || el.title || `blob_${index}`,
                        method: 'blob_element'
                      });
                    }
                    
                    // Check common data attributes for URLs
                    ['data-url', 'data-file-url', 'data-download-url'].forEach(attr => {
                      const attrValue = el.getAttribute(attr);
                      if (attrValue && (attrValue.startsWith('http') || attrValue.startsWith('blob:'))) {
                        urls.push({
                          url: attrValue,
                          filename: el.textContent || `data_${index}`,
                          method: `data_attribute_${attr}`
                        });
                      }
                    });
                  });
                }
              });
            }
          }
          
          console.log(`Found ${urls.length} direct URLs`);
          return urls;
        });
        
        if (directUrls.length > 0) {
          console.log(`✅ Found ${directUrls.length} URLs via direct shadow DOM access:`, directUrls);
          return directUrls;
        }
        
        console.log('🔍 No direct URLs found, attempting clipboard interaction...');
        
        // If no direct URLs found, try clipboard method
        // Use Playwright's context.grantPermissions for clipboard access
        try {
          await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
          console.log('✅ Clipboard permissions granted');
        } catch (permError) {
          console.log('⚠️ Could not grant clipboard permissions:', permError.message);
        }
        
        // Try to trigger right-click and copy URL
        const clipboardUrl = await page.evaluate(() => {
          return new Promise((resolve) => {
            const manager = document.querySelector('downloads-manager');
            if (!manager || !manager.shadowRoot) {
              resolve(null);
              return;
            }
            
            const downloadsList = manager.shadowRoot.querySelector('iron-list');
            if (!downloadsList) {
              resolve(null);
              return;
            }
            
            const items = downloadsList.querySelectorAll('downloads-item');
            if (items.length === 0) {
              resolve(null);
              return;
            }
            
            const firstItem = items[0];
            if (!firstItem.shadowRoot) {
              resolve(null);
              return;
            }
            
            const fileLink = firstItem.shadowRoot.querySelector('#file-link') ||
                           firstItem.shadowRoot.querySelector('a[href]') ||
                           firstItem.shadowRoot.querySelector('.file-link');
            
            if (fileLink) {
              // Right-click on the element
              const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                button: 2
              });
              
              fileLink.dispatchEvent(event);
              
              // Wait and try to access clipboard
              setTimeout(async () => {
                try {
                  if (navigator.clipboard && navigator.clipboard.readText) {
                    const text = await navigator.clipboard.readText();
                    resolve(text);
                  } else {
                    resolve(null);
                  }
                } catch (e) {
                  resolve(null);
                }
              }, 1000);
            } else {
              resolve(null);
            }
          });
        });
        
        if (clipboardUrl && (clipboardUrl.startsWith('http') || clipboardUrl.startsWith('blob:'))) {
          console.log(`✅ Found URL via clipboard interaction: ${clipboardUrl}`);
          return [{
            url: clipboardUrl,
            filename: 'clipboard_download',
            method: 'clipboard_interaction'
          }];
        }
      }
    } catch (interactionError) {
      console.log('❌ Interactive extraction failed:', interactionError.message);
    }
    
    // Method 2: Skip CDP method as it's not supported, move to manual extraction
    
    // Method 3: Manual extraction attempt with different selectors
    console.log('🔍 Attempting manual element extraction...');
    
    const manualUrls = await page.evaluate(() => {
      const urls = [];
      
      // Try different selectors that might contain download information
      const selectors = [
        'a[href*="blob:"]',
        'a[href*="chrome://"]',
        'a[download]',
        '[data-url]',
        '[data-file-url]',
        'cr-url-list-item',
        'downloads-item',
        'downloads-item a',
        '#downloads-list a',
        '.download-controls a',
        'a[href*=".csv"]',
        'a[href*="redfin"]'
      ];
      
      console.log('🔍 Searching for download URLs with', selectors.length, 'selectors...');
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`Selector "${selector}" found ${elements.length} elements`);
          
          elements.forEach((el, index) => {
            if (el.href) {
              const filename = el.textContent || el.getAttribute('download') || el.title || `download_${index}`;
              console.log(`Found URL via ${selector}:`, el.href, 'filename:', filename);
              
              urls.push({
                url: el.href,
                filename: filename,
                selector: selector,
                elementType: el.tagName.toLowerCase()
              });
            }
            
            // Check data attributes
            ['data-url', 'data-file-url', 'data-download-url', 'data-file-path'].forEach(attr => {
              const attrValue = el.getAttribute(attr);
              if (attrValue) {
                const filename = el.textContent || el.title || `data_download_${index}`;
                console.log(`Found URL via ${attr}:`, attrValue, 'filename:', filename);
                
                urls.push({
                  url: attrValue,
                  filename: filename,
                  selector: `${selector}[${attr}]`,
                  elementType: el.tagName.toLowerCase(),
                  source: 'data-attribute'
                });
              }
            });
          });
        } catch (e) {
          console.log('Selector failed:', selector, e.message);
        }
      });
      
      // Also try to find downloads in the downloads manager's shadow DOM
      try {
        const manager = document.querySelector('downloads-manager');
        if (manager && manager.shadowRoot) {
          console.log('🔍 Found downloads-manager with shadow DOM');
          const shadowItems = manager.shadowRoot.querySelectorAll('downloads-item');
          console.log(`Found ${shadowItems.length} downloads in shadow DOM`);
          
          shadowItems.forEach((item, index) => {
            if (item.shadowRoot) {
              const links = item.shadowRoot.querySelectorAll('a');
              links.forEach(link => {
                if (link.href) {
                  urls.push({
                    url: link.href,
                    filename: link.textContent || `shadow_download_${index}`,
                    selector: 'downloads-manager shadow DOM',
                    elementType: 'shadow-link',
                    source: 'shadow-dom'
                  });
                }
              });
            }
          });
        }
      } catch (e) {
        console.log('Shadow DOM extraction failed:', e.message);
      }
      
      console.log(`Total URLs found: ${urls.length}`);
      return urls;
    });
    
    if (manualUrls.length > 0) {
      console.log(`✅ Found ${manualUrls.length} URLs via manual extraction:`, manualUrls);
      return manualUrls;
    }
    
    console.log('❌ No download URLs found with any method');
    return [];
    
  } catch (error) {
    console.error('❌ Error extracting download URLs:', error);
    return [];
  }
}

/**
 * Handles Redfin's multi-step login flow (reusing the working login function)
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
      
      // Look for "Sign in with email instead" option
      const emailInstead = page.locator('text="Sign in with email instead"');
      if (await emailInstead.isVisible({ timeout: 2000 })) {
        console.log(`📧 Found "Sign in with email instead" option`);
        await emailInstead.click();
        await page.waitForTimeout(3000);
      } else {
        console.log(`❌ Could not find "Sign in with email instead" option`);
        return false;
      }
    }
  } else {
    console.log(`ℹ️ No "Welcome back" modal found - continuing to email/password form`);
  }
  
  // Step 3: Handle email and password form
  console.log(`🔍 Looking for email/password form...`);
  
  // Look for email field
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    '#email'
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
  
  // Check if email is already filled
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
      
      // Look for "Sign in with email instead" option
      const emailInsteadAfter = page.locator('text="Sign in with email instead"');
      if (await emailInsteadAfter.isVisible({ timeout: 2000 })) {
        console.log(`📧 Found "Sign in with email instead" option`);
        await emailInsteadAfter.click();
        await page.waitForTimeout(3000);
      }
    }
  }
  
  // Look for password field
  console.log(`🔍 Looking for password field...`);
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
    'input[placeholder*="Password" i]',
    '#password'
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
  console.log(`🔍 Looking for login button...`);
  const loginButtonSelectors = [
    'button:has-text("Continue with email")',
    'button:has-text("Sign in")',
    'button:has-text("Login")',
    'button:has-text("Log in")',
    'button[type="submit"]',
    'input[type="submit"]'
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
  await loginButton.click();
  
  // Wait for login to complete
  console.log(`⏳ Waiting for login to complete...`);
  await page.waitForTimeout(5000);
  
  // Take screenshot after login
  const afterLoginScreenshotPath = path.join(__dirname, '..', 'logs', `after_login_${Date.now()}.png`);
  await page.screenshot({ path: afterLoginScreenshotPath, fullPage: true });
  console.log(`📸 After login screenshot: ${afterLoginScreenshotPath}`);
  
  console.log(`✅ Login process completed successfully`);
  return true;
}

/**
 * Simple download script that manually navigates and applies filters
 */
async function simpleDownload() {
  console.log('🚀 Starting simple Redfin download...');
  
  // Get credentials
  const email = process.env.RF_USER_EMAIL;
  const password = process.env.RF_USER_PASSWORD;
  
  if (!email || !password) {
    console.error('❌ Missing RF_USER_EMAIL or RF_USER_PASSWORD in config/.env');
    return;
  }
  
  console.log(`📧 Using email: ${email}`);
  console.log(`🔑 Password loaded: ${password.length} characters`);
  
  // Launch browser
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
  
  let downloadSuccess = false;
  let interceptedCsvData = null;
  let csvUrl = null;
  let requestHandler = null;
  let responseHandler = null;
  
  try {
    // Step 1: Navigate to Okaloosa County
    console.log('🌐 Navigating to Okaloosa County...');
    await page.goto('https://www.redfin.com/county/482/FL/Okaloosa-County', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded, waiting for content...');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(logDir, `01_initial_page_${Date.now()}.png`),
      fullPage: true 
    });
    
    // Step 2: Apply filters through UI
    console.log('🔧 Applying filters through UI...');
    
    // Look for filters button
    const filterSelectors = [
      'button:has-text("Filters")',
      'button:has-text("All filters")',
      '[data-rf-test-id="filterButton"]',
      '.filter-button'
    ];
    
    let filtersButton = null;
    for (const selector of filterSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          console.log(`🎯 Found filters button: ${selector}`);
          filtersButton = element;
          break;
        }
      } catch (e) {
        console.log(`❌ Filter selector not found: ${selector}`);
      }
    }
    
    if (filtersButton) {
      console.log('🔄 Clicking filters button...');
      await filtersButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Try to find and set Property Type to Land
    console.log('🏞️ Looking for property type filter...');
    const propertyTypeSelectors = [
      'button:has-text("Property Type")',
      'button:has-text("Home Type")',
      'text="Land"',
      'label:has-text("Land")',
      'input[value="land"]'
    ];
    
    for (const selector of propertyTypeSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`🎯 Found property type element: ${selector}`);
          await element.click();
          await page.waitForTimeout(1000);
          
          // If it's a dropdown, look for Land option
          const landOption = page.locator('text="Land"');
          if (await landOption.isVisible({ timeout: 2000 })) {
            console.log('🏞️ Selecting Land option...');
            await landOption.click();
            await page.waitForTimeout(1000);
          }
          break;
        }
      } catch (e) {
        console.log(`❌ Property type selector not working: ${selector}`);
      }
    }
    
    // Try to find and set Status to Sold
    console.log('📅 Looking for sold status filter...');
    const soldSelectors = [
      'button:has-text("Sold")',
      'button:has-text("Status")',
      'text="Sold"',
      'label:has-text("Sold")',
      'input[value="sold"]'
    ];
    
    for (const selector of soldSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`🎯 Found sold filter: ${selector}`);
          await element.click();
          await page.waitForTimeout(1000);
          
          // Look for "Sold in last year" or similar
          const lastYearOption = page.locator('text=/sold.*year/i');
          if (await lastYearOption.isVisible({ timeout: 2000 })) {
            console.log('📅 Selecting sold in last year...');
            await lastYearOption.click();
            await page.waitForTimeout(1000);
          }
          break;
        }
      } catch (e) {
        console.log(`❌ Sold selector not working: ${selector}`);
      }
    }
    
    // Close the filter popup by clicking outside or finding a close button
    console.log('🔄 Closing filter popup...');
    const closeButtonSelectors = [
      'button[aria-label="Close"]',
      'button:has-text("Close")',
      'button:has-text("×")',
      'button:has-text("✕")',
      '[data-rf-test-id="close-button"]',
      '.close-button',
      '[aria-label*="close" i]'
    ];
    
    let closeButton = null;
    for (const selector of closeButtonSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`🎯 Found close button: ${selector}`);
          closeButton = element;
          break;
        }
      } catch (e) {
        console.log(`❌ Close selector not found: ${selector}`);
      }
    }
    
    if (closeButton) {
      try {
        await closeButton.click({ force: true });
        console.log('✅ Clicked close button (forced)');
        await page.waitForTimeout(3000);
      } catch (e) {
        console.log('❌ Force click failed, trying alternatives...');
        console.log('🔄 Trying Escape key to close popup...');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('🔄 No close button found, trying Escape key...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2000);
    }
    
    // Wait a bit more for any animations to complete
    console.log('⏳ Waiting for popup closing animations...');
    await page.waitForTimeout(2000);
    
    // Take screenshot after applying filters and closing popup
    await page.screenshot({ 
      path: path.join(logDir, `02_after_filters_${Date.now()}.png`),
      fullPage: true 
    });
    
    // Step 3: Scroll down to look for download button
    console.log('📜 Scrolling down to find download button...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);
    
    // Scroll to middle as well
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(2000);
    
    // Step 4: Look for download button
    console.log('⬇️ Looking for download button...');
    const downloadSelectors = [
      'button:has-text("Download")',
      'a:has-text("Download")',
      'button:has-text("Export")',
      'a:has-text("Export")',
      '[data-rf-test-id="download-button"]',
      '[data-rf-test-id="download-all"]',
      '.download-button',
      '[aria-label*="download" i]',
      '[title*="download" i]',
      'text=/download/i'
    ];
    
    let downloadButton = null;
    for (const selector of downloadSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          console.log(`🎯 Found download button: ${selector}`);
          downloadButton = element;
          break;
        }
      } catch (e) {
        console.log(`❌ Download selector not found: ${selector}`);
      }
    }
    
    if (!downloadButton) {
      console.log('❌ No download button found. Taking screenshot for debugging...');
      await page.screenshot({ 
        path: path.join(logDir, `03_no_download_button_${Date.now()}.png`),
        fullPage: true 
      });
      return;
    }
    
    // Take screenshot before clicking download
    await page.screenshot({ 
      path: path.join(logDir, `04_before_download_click_${Date.now()}.png`),
      fullPage: true 
    });
    
    // Step 5: Set up request interception to capture the actual CSV request
    console.log('⬇️ Setting up network interception and clicking download button...');
    
    // Set up request/response interception
    requestHandler = (request) => {
      const url = request.url();
      if (url.includes('/api/gis-csv')) {
        csvUrl = url;
        console.log('🎯 Intercepted CSV API request:', url);
      }
    };
    
    responseHandler = async (response) => {
      const url = response.url();
      if (url.includes('/api/gis-csv') && response.status() === 200) {
        console.log('✅ Intercepted successful CSV response');
        try {
          // Capture response data immediately
          interceptedCsvData = await response.text();
          console.log(`📊 CSV data intercepted: ${interceptedCsvData.length} characters`);
          
          // Quick validation that we got CSV data
          if (interceptedCsvData.includes('SOLD DATE') || interceptedCsvData.includes('ADDRESS') || interceptedCsvData.includes(',')) {
            console.log('🎯 Confirmed: CSV data contains expected content');
          } else {
            console.log('⚠️ Warning: Response may not be CSV data');
            console.log('First 200 chars:', interceptedCsvData.substring(0, 200));
          }
        } catch (error) {
          console.log('❌ Failed to capture CSV data:', error.message);
          // Try alternative approach
          try {
            interceptedCsvData = await response.buffer();
            console.log(`📊 CSV buffer intercepted: ${interceptedCsvData.length} bytes`);
          } catch (bufferError) {
            console.log('❌ Buffer capture also failed:', bufferError.message);
          }
        }
      }
    };
    
    // Attach intercept handlers
    page.on('request', requestHandler);
    page.on('response', responseHandler);
    
    // Set up download handling with shorter timeout to quickly move to URL extraction
    const downloadPromise = context.waitForEvent('download', { timeout: 5000 }).catch(err => {
      console.log('⚠️ Download event timeout (expected) - moving to URL extraction method...');
      return null;
    });
    
    await downloadButton.scrollIntoViewIfNeeded();
    await downloadButton.click();
    
    // Wait for potential network requests and check for intercepted data
    await page.waitForTimeout(5000);
    
    // Check if we intercepted CSV data from the initial click
    if (interceptedCsvData) {
      console.log('🎉 Successfully intercepted CSV data from initial request!');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `okaloosa-land-sold-1yr-intercepted-${timestamp}.csv`;
      const targetPath = path.join(rawDataDir, filename);
      
      fs.writeFileSync(targetPath, interceptedCsvData);
      console.log(`✅ CSV saved via interception: ${filename}`);
      
      // Log successful download
      logDownload(logDir, {
        county: 'Okaloosa',
        filters: 'Land, Sold 1 year',
        status: 'success',
        filename,
        timestamp,
        method: 'network_interception',
        originalUrl: csvUrl
      });
      
      downloadSuccess = true;
      
      // Clean up event handlers
      page.off('request', requestHandler);
      page.off('response', responseHandler);
      
      // Skip the rest of the download logic since we already have the data
      return;
    }
    
    // Take screenshot after clicking download
    await page.screenshot({ 
      path: path.join(logDir, `05_after_download_click_${Date.now()}.png`),
      fullPage: true 
    });
    
    // Step 6: Check if login is required
    console.log('🔍 Checking if login is required...');
    const loginModalSelectors = [
      'text="Unlock the full experience"',
      'text="Welcome back"',
      'input[type="email"]',
      'input[name="email"]',
      'button:has-text("Continue with email")'
    ];
    
    let loginRequired = false;
    for (const selector of loginModalSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          console.log(`🔐 Login required - found: ${selector}`);
          loginRequired = true;
          break;
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    if (loginRequired) {
      console.log('🔐 Handling login...');
      const loginSuccess = await handleRedfinLogin(page, email, password);
      
      if (loginSuccess) {
        console.log('✅ Login completed, ensuring all dialogs are closed...');
        
        // More aggressive dialog closing after login
        try {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
          
          // Force click outside any modal areas
          await page.click('body', { position: { x: 50, y: 50 } });
          await page.waitForTimeout(1000);
          
          // Try to wait for dialogs to disappear
          await page.waitForSelector('.DialogWrapper', { state: 'hidden', timeout: 5000 }).catch(() => {
            console.log('⚠️ Dialog may still be present');
          });
        } catch (e) {
          console.log('⚠️ Dialog dismissal:', e.message);
        }
        
        console.log('⬇️ Finding download button after login...');
        await page.waitForTimeout(3000);
        
        // Find and click download button again with more robust checking
          let downloadButtonAfterLogin = null;
          for (const selector of downloadSelectors) {
            try {
              const element = page.locator(selector).first();
              if (await element.isVisible({ timeout: 2000 })) {
              // Check if element is actually clickable (not behind a dialog)
              const box = await element.boundingBox();
              if (box) {
                downloadButtonAfterLogin = element;
                console.log(`✅ Found clickable download button with: ${selector}`);
                break;
              }
              }
            } catch (e) {
              // Continue
            }
          }
          
          if (downloadButtonAfterLogin) {
          try {
            await downloadButtonAfterLogin.scrollIntoViewIfNeeded();
            await downloadButtonAfterLogin.click({ force: true });
            console.log('⬇️ Clicked download button after login');
            
            // Wait for potential network requests to complete
            await page.waitForTimeout(5000);
            
            // Check if we intercepted any CSV data
            if (interceptedCsvData) {
              console.log('🎉 Successfully intercepted CSV data from browser request!');
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `okaloosa-land-sold-1yr-intercepted-${timestamp}.csv`;
              const targetPath = path.join(rawDataDir, filename);
              
              fs.writeFileSync(targetPath, interceptedCsvData);
              console.log(`✅ CSV saved via interception: ${filename}`);
              
              // Log successful download
              logDownload(logDir, {
                county: 'Okaloosa',
                filters: 'Land, Sold 1 year',
                status: 'success', 
                filename,
                timestamp,
                method: 'network_interception',
                originalUrl: csvUrl
              });
              
              downloadSuccess = true;
            }
            
          } catch (clickError) {
            console.log('❌ Failed to click download button after login:', clickError.message);
          }
        } else {
          console.log('❌ Could not find download button after login');
        }
      } else {
        console.log('❌ Login failed');
      }
    }
    
    // Try to wait for traditional download first
    console.log('⏳ Waiting for traditional download...');
    try {
      const download = await downloadPromise;
          
          if (download) {
            console.log('✅ Download event captured successfully');
            const downloadPath = await download.path();
            
            if (downloadPath) {
              // Create filename and move file
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `okaloosa-land-sold-1yr-${timestamp}.csv`;
              const targetPath = path.join(rawDataDir, filename);
              
              // Move the downloaded file
              fs.renameSync(downloadPath, targetPath);
              
              console.log(`✅ Downloaded and saved: ${filename}`);
              console.log(`📁 File location: ${targetPath}`);
              
              // Log successful download
              logDownload(logDir, {
                county: 'Okaloosa',
                filters: 'Land, Sold 1 year',
                status: 'success',
                filename,
            timestamp,
            method: 'traditional'
              });
              
          downloadSuccess = true;
        }
      }
    } catch (error) {
      console.log(`❌ Traditional download failed: ${error.message}`);
            }
    
    // If traditional download failed, try URL extraction method
    if (!downloadSuccess) {
      console.log('🔄 Traditional download failed, attempting URL extraction method...');
      console.log('⏳ Please keep the browser open while extracting download URLs...');
            
      // Wait briefly for downloads to register in browser
      console.log('⏳ Waiting 3 seconds for downloads to register in browser...');
      try {
        await page.waitForTimeout(3000);
      } catch (error) {
        console.log('❌ Browser closed during wait period:', error.message);
        return;
      }
      
      try {
        // Check if browser is still available
        if (page.isClosed()) {
          console.log('❌ Browser page was closed. Cannot extract download URLs.');
          return;
        }
        
        const downloadUrls = await extractDownloadUrls(page);
        
        if (downloadUrls.length > 0) {
          console.log(`🎯 Found ${downloadUrls.length} download URLs, proceeding with direct download...`);
                    
          // Extract cookies from browser context for authenticated requests
          console.log('🍪 Extracting browser cookies for authentication...');
          const cookies = await page.context().cookies();
          console.log(`✅ Extracted ${cookies.length} cookies from browser session`);
          
          // Debug cookie information
          const importantCookies = cookies.filter(cookie => 
            cookie.name.toLowerCase().includes('session') ||
            cookie.name.toLowerCase().includes('auth') ||
            cookie.name.toLowerCase().includes('token') ||
            cookie.name.toLowerCase().includes('csrf') ||
            cookie.name.toLowerCase().includes('rf_') ||
            cookie.name.toLowerCase().includes('redfin')
          );
          
          console.log(`🔍 Important cookies found: ${importantCookies.length}`);
          importantCookies.forEach(cookie => {
            console.log(`   🍪 ${cookie.name}: ${cookie.value.substring(0, 20)}... (domain: ${cookie.domain})`);
                    });
                    
          if (importantCookies.length === 0) {
            console.log('⚠️ No authentication cookies found - this might cause 403 errors');
          }
          
          for (let i = 0; i < downloadUrls.length; i++) {
            const downloadInfo = downloadUrls[i];
            console.log(`📥 Processing download ${i + 1}/${downloadUrls.length}: ${downloadInfo.url}`);
            
            // Skip non-CSV URLs (like the main page URLs)  
            if (downloadInfo.url.includes('redfin.com') && 
                !downloadInfo.url.includes('/api/gis-csv') && 
                !downloadInfo.url.includes('.csv') &&
                !downloadInfo.url.startsWith('blob:')) {
              console.log(`⏭️ Skipping non-data URL: ${downloadInfo.url}`);
              continue;
            }
            
            try {
              // Create filename for this download
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const fileExtension = downloadInfo.url.includes('/api/gis-csv') || downloadInfo.url.includes('.csv') ? 'csv' : 
                                  downloadInfo.filename.includes('.') ? downloadInfo.filename.split('.').pop() : 'csv';
              const filename = `okaloosa-land-sold-1yr-${timestamp}-${i + 1}.${fileExtension}`;
              const targetPath = path.join(rawDataDir, filename);
              
              // Download the file directly with cookies
              await downloadFileFromUrl(downloadInfo.url, targetPath, cookies);
                
              console.log(`✅ Successfully downloaded: ${filename}`);
                
                // Log successful download
                logDownload(logDir, {
                  county: 'Okaloosa',
                  filters: 'Land, Sold 1 year',
                  status: 'success',
                  filename,
                  timestamp,
                method: 'direct_url',
                originalUrl: downloadInfo.url
              });
              
              downloadSuccess = true;
              
            } catch (downloadError) {
              console.error(`❌ Failed to download ${downloadInfo.url}:`, downloadError.message);
              
              // If HTTP download failed and this is a CSV API URL, try browser download method
              if (downloadError.message.includes('403') && downloadInfo.url.includes('/api/gis-csv')) {
                console.log('🔄 HTTP download failed with 403, trying browser download method...');
                
                try {
                  // Use browser to navigate to the CSV URL directly
                  console.log('🌐 Navigating browser to CSV URL...');
                  await page.goto(downloadInfo.url, { waitUntil: 'networkidle' });
                  
                  // Wait for potential download
                  console.log('⏳ Waiting for browser download...');
                  await page.waitForTimeout(5000);
                  
                  // Check if content is visible (CSV data)
                  const pageContent = await page.content();
                  if (pageContent.includes('property_type') || pageContent.includes('address') || pageContent.includes(',')) {
                    console.log('✅ CSV content detected, saving...');
                    
                    // Save the page content as CSV
                    const csvContent = await page.evaluate(() => {
                      // Get the page content, excluding HTML tags
                      const preElement = document.querySelector('pre');
                      if (preElement) {
                        return preElement.textContent;
                      }
                      return document.body.textContent;
                    });
                    
                    if (csvContent && csvContent.trim().length > 0) {
                      fs.writeFileSync(targetPath, csvContent);
                      console.log(`✅ Successfully saved CSV via browser: ${filename}`);
            
            // Log successful download
            logDownload(logDir, {
              county: 'Okaloosa',
              filters: 'Land, Sold 1 year',
              status: 'success',
              filename,
                        timestamp,
                        method: 'browser_direct',
                        originalUrl: downloadInfo.url
            });
            
                      downloadSuccess = true;
          } else {
                      console.log('❌ No CSV content found in browser');
          }
        } else {
                    console.log('❌ Browser navigation did not return CSV content');
                  }
                  
                } catch (browserDownloadError) {
                  console.error(`❌ Browser download also failed:`, browserDownloadError.message);
                }
              }
              
              // Log failed download (if browser method didn't work)
              if (!downloadSuccess) {
                logDownload(logDir, {
                  county: 'Okaloosa',
                  filters: 'Land, Sold 1 year',
                  status: 'failed',
                  error: downloadError.message,
                  timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
                  method: 'direct_url',
                  originalUrl: downloadInfo.url
                });
              }
            }
          }
        } else {
          console.log('❌ No download URLs found in browser downloads');
          console.log('💡 This might be because:');
          console.log('   - Download is still in progress');
          console.log('   - Download was blocked by browser settings');
          console.log('   - Login was incomplete');
          
          // Try to take a screenshot of the downloads page for debugging
          try {
            if (!page.isClosed()) {
              await page.screenshot({ 
                path: path.join(logDir, `no_downloads_found_${Date.now()}.png`),
                fullPage: true 
              });
              console.log('📸 Screenshot saved for debugging');
        }
          } catch (screenshotError) {
            console.log('❌ Could not take debugging screenshot:', screenshotError.message);
          }
        }
      } catch (extractError) {
        if (extractError.message.includes('Target page, context or browser has been closed')) {
          console.error('❌ Browser was closed during URL extraction. Please keep the browser open until the process completes.');
          console.log('💡 Next time, please wait for the "🏁 Simple download completed" message before closing the browser.');
        } else {
          console.error('❌ Failed to extract download URLs:', extractError.message);
        }
      }
    }
    
    // Take final screenshot only if browser is still open
    try {
      if (!page.isClosed()) {
    await page.screenshot({ 
      path: path.join(logDir, `06_final_state_${Date.now()}.png`),
      fullPage: true 
    });
    
        console.log('⏸️ Keeping browser open for 5 seconds for final inspection...');
        console.log('💡 You can review the downloads page and see if files appeared in browser downloads');
        console.log('🔍 Check chrome://downloads/ to see if files are there');
        await page.waitForTimeout(5000);
      }
    } catch (finalError) {
      console.log('❌ Browser closed during final steps:', finalError.message);
    }
    
  } catch (error) {
    console.error('❌ Error during simple download:', error);
    
    // Take error screenshot
    await page.screenshot({ 
      path: path.join(logDir, `error_${Date.now()}.png`),
      fullPage: true 
    });
  } finally {
    // Clean up event handlers
    if (requestHandler && responseHandler) {
      try {
        page.off('request', requestHandler);
        page.off('response', responseHandler);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    await browser.close();
    console.log('🏁 Simple download completed');
    
    if (downloadSuccess) {
      console.log('🎉 Download successful!');
    } else {
      console.log('❌ Download failed with all methods');
    }
  }
}

// Run the simple download
simpleDownload().catch(console.error); 