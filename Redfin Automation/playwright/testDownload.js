const { chromium } = require('playwright');
const path = require('path');

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
      await page.waitForTimeout(2000);
    } else {
      console.log(`❌ Could not find "Continue with email" button in initial modal`);
      return false;
    }
  }
  
  // Step 2: Check for "Welcome back" modal
  const welcomeBackModal = page.locator('text="Welcome back"');
  if (await welcomeBackModal.isVisible({ timeout: 2000 })) {
    console.log(`👋 Found "Welcome back" modal`);
    
    // Check if it suggests Google login
    const googleSuggestion = page.locator('text="You originally signed up with Google"');
    if (await googleSuggestion.isVisible({ timeout: 1000 })) {
      console.log(`🔍 Account originally signed up with Google, looking for "Sign in with email instead"`);
      
      // Look for "Sign in with email instead" option
      const emailInstead = page.locator('text="Sign in with email instead"');
      if (await emailInstead.isVisible({ timeout: 2000 })) {
        console.log(`📧 Clicking "Sign in with email instead"`);
        await emailInstead.click();
        await page.waitForTimeout(2000);
      } else {
        // Try alternative selectors for email option
        const emailAlternatives = [
          'button:has-text("email")',
          'a:has-text("email")',
          '[data-testid="email-login"]'
        ];
        
        let emailOptionFound = false;
        for (const selector of emailAlternatives) {
          try {
            const element = page.locator(selector);
            if (await element.isVisible({ timeout: 1000 })) {
              console.log(`📧 Found email option with selector: ${selector}`);
              await element.click();
              await page.waitForTimeout(2000);
              emailOptionFound = true;
              break;
            }
          } catch (error) {
            // Continue to next selector
          }
        }
        
        if (!emailOptionFound) {
          console.log(`❌ Could not find "Sign in with email instead" option`);
          return false;
        }
      }
    }
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
      
      // Look for "Sign in with email instead" option
      const emailInsteadSelectors = [
        'text="Sign in with email instead"',
        'a:has-text("Sign in with email instead")',
        'button:has-text("Sign in with email instead")',
        'a:has-text("email instead")',
        'a:has-text("email")',
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
 * Test script with direct URL navigation and login-on-demand
 */
async function testSingleDownload() {
  console.log('🧪 Testing direct URL navigation with login-on-demand...');
  
  // Load credentials from environment variables
  require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
      const email = process.env.RF_USER_EMAIL || 'emiliano@thevestagroupco.com';
    const password = process.env.RF_USER_PASSWORD || 'xarGZmyP7z8z3AU.';
  
  console.log(`📧 Using email: ${email}`);
  console.log(`🔑 Password loaded: ${password.length} characters`);
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security'
    ]
  });
  
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
  
  try {
    // Step 1: Navigate directly to filtered URL (skip login for now)
    console.log(`🌐 Navigating directly to filtered results...`);
    
    // Test with a small lot size range first (0-0.25 acres, $0-9999)
    const testUrl = 'https://www.redfin.com/county/482/FL/Okaloosa-County/filter/property-type=land,include=sold-1yr,lot-size=0-10890-sqft,price=0-9999';
    
    console.log(`🔗 Direct URL: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Check for results
    console.log(`📊 Checking results...`);
    const resultElements = [
      '[data-rf-test-id="search-count"]',
      '.search-count',
      'text=/\\d+ homes/',
      'text=/\\d+ results/',
      'text=/\\d+ properties/',
      'text=/\\d+ sold/',
      'text="No results"',
      'text="0 results"'
    ];
    
    let resultCount = 'Unknown';
    for (const selector of resultElements) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          console.log(`📊 Results text: ${text}`);
          resultCount = text;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    console.log(`📊 Result count: ${resultCount}`);
    
    if (resultCount.includes('0') || resultCount.includes('No results')) {
      console.log(`⚠️ No results found for this filter combination. Trying broader search...`);
      
      // Try broader search - all land sold in last year, no price limit
      const broaderUrl = 'https://www.redfin.com/county/482/FL/Okaloosa-County/filter/property-type=land,include=sold-1yr';
      console.log(`🔗 Trying broader URL: ${broaderUrl}`);
      await page.goto(broaderUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      
      // Check results again
      for (const selector of resultElements) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            const text = await element.textContent();
            console.log(`📊 Broader search results: ${text}`);
            resultCount = text;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }
    
    // Step 2: Look for download button by scrolling
    console.log(`⬇️ Looking for download button...`);
    
    // First scroll down to load more content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(1000);
    
    // Look for download options
    const downloadSelectors = [
      'a:has-text("Download")',
      'button:has-text("Download")',
      'a:has-text("Export")',
      'button:has-text("Export")',
      '[data-rf-test-id="download-button"]',
      '[data-rf-test-id="download-all"]',
      '.download-button',
      '[aria-label*="download" i]',
      '[title*="download" i]'
    ];
    
    let downloadButton = null;
    for (const selector of downloadSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`🎯 Found download element with selector: ${selector}`);
          downloadButton = element;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!downloadButton) {
      // Try scrolling down more to find download option
      console.log(`🔍 Scrolling down to find download option...`);
      
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        await page.waitForTimeout(1000);
        
        // Check again for download button
        for (const selector of downloadSelectors) {
          try {
            const element = await page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 })) {
              console.log(`🎯 Found download element after scrolling: ${selector}`);
              downloadButton = element;
              break;
            }
          } catch (error) {
            // Continue to next selector
          }
        }
        
        if (downloadButton) break;
      }
    }
    
    if (downloadButton) {
      console.log(`✅ Download button found!`);
      
      // Take screenshot before download
      const screenshotPath = path.join(__dirname, '..', 'logs', `before_download_${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved to: ${screenshotPath}`);
      
      console.log(`\n⚠️  Ready to download CSV file.`);
      console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to proceed...`);
      
      await page.waitForTimeout(5000);
      
      console.log(`⬇️  Clicking download...`);
      
      // Scroll to button and click
      await downloadButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await downloadButton.click();
      
      // Wait a moment to see what happens
      await page.waitForTimeout(3000);
      
      // Check if login is required - look for specific modal indicators
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
          const element = await page.locator(selector).first();
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
          
          // Wait a bit longer for page to settle after login
          await page.waitForTimeout(3000);
          
          // Take a screenshot to see the page state after login
          const afterLoginPagePath = path.join(__dirname, '..', 'logs', `page_after_login_${Date.now()}.png`);
          await page.screenshot({ path: afterLoginPagePath, fullPage: true });
          console.log(`📸 Page after login screenshot: ${afterLoginPagePath}`);
          
          // Look for download button again - it might have changed after login
          console.log(`🔍 Looking for download button after login...`);
          const downloadButtonAfterLogin = page.locator('a:has-text("Download")').first();
          
          if (await downloadButtonAfterLogin.isVisible({ timeout: 5000 })) {
            console.log(`✅ Download button still visible after login`);
            await downloadButtonAfterLogin.scrollIntoViewIfNeeded();
            await downloadButtonAfterLogin.click();
            console.log(`⬇️ Clicked download button after login`);
            await page.waitForTimeout(2000);
          } else {
            console.log(`❌ Download button not visible after login - looking for alternatives`);
            
            // Try other download selectors
            const alternativeDownloadSelectors = [
              'button:has-text("Download")',
              'a:has-text("Export")',
              'button:has-text("Export")',
              '[data-rf-test-id="download-button"]',
              '.download-button',
              'a[href*="download"]',
              'button[aria-label*="download" i]'
            ];
            
            let alternativeFound = false;
            for (const selector of alternativeDownloadSelectors) {
              try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                  console.log(`🎯 Found alternative download with selector: ${selector}`);
                  await element.scrollIntoViewIfNeeded();
                  await element.click();
                  console.log(`⬇️ Clicked alternative download button`);
                  alternativeFound = true;
                  break;
                }
              } catch (error) {
                // Continue to next selector
              }
            }
            
            if (!alternativeFound) {
              console.log(`❌ No download button found after login`);
            }
          }
        } else {
          console.log(`❌ Login failed, cannot proceed with download`);
        }
      }
      
      // Now try to handle the actual download
      
      // Now try to handle the actual download
      try {
        console.log(`⏳ Setting up download handler...`);
        
        // Set up download handling with longer timeout
        const downloadPromise = context.waitForEvent('download', { timeout: 60000 });
        
        // Wait for download
        const download = await downloadPromise;
        const downloadPath = await download.path();
        
        if (downloadPath) {
          console.log(`✅ Download successful!`);
          console.log(`📁 File downloaded to: ${downloadPath}`);
          
          // Check file size
          const fs = require('fs');
          const stats = fs.statSync(downloadPath);
          console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
          
          // Move to test location
          const testDir = path.join(__dirname, '..', 'data', 'test');
          if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
          }
          
          const testFilename = `okaloosa_land_test_${Date.now()}.csv`;
          const testPath = path.join(testDir, testFilename);
          fs.renameSync(downloadPath, testPath);
          
          console.log(`📁 Moved to: ${testPath}`);
          
          // Quick peek at file content
          const content = fs.readFileSync(testPath, 'utf8');
          const lines = content.split('\n');
          console.log(`📄 File has ${lines.length} lines`);
          console.log(`📄 First line (headers): ${lines[0]}`);
          if (lines.length > 1) {
            console.log(`📄 Second line (sample): ${lines[1]}`);
          }
          
          // Show first few property addresses for verification
          if (lines.length > 2) {
            console.log(`\n🏠 Sample properties:`);
            for (let i = 1; i < Math.min(4, lines.length); i++) {
              const fields = lines[i].split(',');
              if (fields.length > 2) {
                console.log(`   ${i}. ${fields[1]} - ${fields[2]}`); // Assuming address and price columns
              }
            }
          }
          
        } else {
          console.log(`❌ Download failed - no file path`);
        }
        
      } catch (downloadError) {
        console.log(`❌ Download error: ${downloadError.message}`);
        
        // Take a screenshot to see current state
        const errorScreenshotPath = path.join(__dirname, '..', 'logs', `download_error_${Date.now()}.png`);
        await page.screenshot({ path: errorScreenshotPath, fullPage: true });
        console.log(`📸 Error screenshot saved to: ${errorScreenshotPath}`);
      }
      
    } else {
      console.log(`❌ No download button found`);
      
      // Take a screenshot for debugging
      const screenshotPath = path.join(__dirname, '..', 'logs', `no_download_${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error);
    
    // Take screenshot on error
    try {
      const screenshotPath = path.join(__dirname, '..', 'logs', `error_screenshot_${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Error screenshot saved to: ${screenshotPath}`);
    } catch (screenshotError) {
      console.log(`Could not save screenshot: ${screenshotError.message}`);
    }
  }
  
  console.log(`\n⏸️  Keeping browser open for 30 seconds for manual inspection...`);
  console.log(`   Current URL: ${page.url()}`);
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log(`🏁 Test completed`);
}

// Run the test
if (require.main === module) {
  testSingleDownload().catch(console.error);
}

module.exports = { testSingleDownload }; 