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
 * Test script focused on login flow
 */
async function testLoginFlow() {
  console.log('🧪 Testing Redfin login flow specifically...');
  
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
    console.log(`🌐 Navigating to Redfin search page that should trigger login...`);
    
    // Navigate to a page that will definitely require login for download
    const testUrl = 'https://www.redfin.com/county/482/FL/Okaloosa-County/filter/property-type=land,include=sold-1yr';
    
    console.log(`🔗 URL: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Look for download button
    console.log(`⬇️ Looking for download button...`);
    const downloadButton = page.locator('a:has-text("Download")').first();
    
    if (await downloadButton.isVisible({ timeout: 5000 })) {
      console.log(`✅ Download button found!`);
      
      // Take a screenshot before clicking
      const beforeClickPath = path.join(__dirname, '..', 'logs', `before_download_click_${Date.now()}.png`);
      await page.screenshot({ path: beforeClickPath, fullPage: true });
      console.log(`📸 Before click screenshot: ${beforeClickPath}`);
      
      console.log(`⬇️ Clicking download button to trigger login...`);
      await downloadButton.click();
      
      // Wait for login modal to appear
      await page.waitForTimeout(3000);
      
      // Take a screenshot to see what appeared
      const afterClickPath = path.join(__dirname, '..', 'logs', `after_download_click_${Date.now()}.png`);
      await page.screenshot({ path: afterClickPath, fullPage: true });
      console.log(`📸 After click screenshot: ${afterClickPath}`);
      
      // Check if any login modal appeared
      const loginModalIndicators = [
        'text="Unlock the full experience"',
        'text="Welcome back"',
        'text="You originally signed up with Google"',
        'input[type="email"]',
        'input[type="password"]',
        'button:has-text("Continue with email")',
        'button:has-text("Continue with Google")'
      ];
      
      let loginModalFound = false;
      let foundIndicator = '';
      
      for (const selector of loginModalIndicators) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`🔐 Login modal detected with: ${selector}`);
            loginModalFound = true;
            foundIndicator = selector;
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      if (loginModalFound) {
        console.log(`🚀 Testing login flow with detected modal: ${foundIndicator}`);
        const loginSuccess = await handleRedfinLogin(page, email, password);
        
        if (loginSuccess) {
          console.log(`✅ Login test completed successfully!`);
        } else {
          console.log(`❌ Login test failed`);
        }
      } else {
        console.log(`❓ No login modal detected - either already logged in or different flow`);
        
        // Check if download actually started
        await page.waitForTimeout(2000);
        const downloadInProgress = await page.locator('text="Downloading"').isVisible({ timeout: 1000 });
        if (downloadInProgress) {
          console.log(`✅ Download started without login - user already authenticated`);
        } else {
          console.log(`❓ Unclear state - no login modal and no download progress`);
        }
      }
      
    } else {
      console.log(`❌ Could not find download button`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error);
    
    // Take screenshot on error
    try {
      const screenshotPath = path.join(__dirname, '..', 'logs', `login_error_${Date.now()}.png`);
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
  console.log(`🏁 Login test completed`);
}

// Run the test
if (require.main === module) {
  testLoginFlow().catch(console.error);
}

module.exports = { testLoginFlow, handleRedfinLogin }; 