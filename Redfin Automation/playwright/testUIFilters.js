const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

async function testUIFilters() {
  console.log('🧪 Testing Redfin UI filter application...');
  
  const email = process.env.RF_USER_EMAIL;
const password = process.env.RF_USER_PASSWORD;
  
  if (!email || !password) {
    console.error('❌ Missing REDFIN_EMAIL or REDFIN_PASSWORD in config/.env');
    return;
  }
  
  console.log(`📧 Using email: ${email}`);
  console.log(`🔑 Password loaded: ${password ? password.length : 0} characters`);
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for easier observation
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Start with basic Okaloosa County search
    console.log('🌐 Navigating to Redfin Okaloosa County...');
    await page.goto('https://www.redfin.com/county/482/FL/Okaloosa-County', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded, waiting for content...');
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what we're working with
    await page.screenshot({ 
      path: path.join(__dirname, '..', 'logs', `okaloosa_initial_${Date.now()}.png`),
      fullPage: true 
    });
    
    // Look for filters button or sidebar
    console.log('🔍 Looking for filters...');
    
    // Common filter selectors on Redfin
    const filterSelectors = [
      'button:has-text("Filters")',
      'button:has-text("All filters")',
      '[data-rf-test-id="filterButton"]',
      '.filter-button',
      'button[aria-label*="filter" i]',
      '.filters-container button'
    ];
    
    let filtersButton = null;
    for (const selector of filterSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
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
      
      // Take screenshot after clicking filters
      await page.screenshot({ 
        path: path.join(__dirname, '..', 'logs', `filters_opened_${Date.now()}.png`),
        fullPage: true 
      });
    } else {
      console.log('⚠️  No filters button found, looking for property type selector...');
    }
    
    // Look for property type filter (Land)
    console.log('🏞️ Looking for property type filter...');
    const propertyTypeSelectors = [
      'button:has-text("Property Type")',
      'button:has-text("Home Type")',
      '[data-rf-test-id="property-type"]',
      'text="Land"',
      'input[value="land"]',
      'label:has-text("Land")'
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
        console.log(`❌ Property type selector not found: ${selector}`);
      }
    }
    
    // Look for sold filter
    console.log('📅 Looking for sold date filter...');
    const soldSelectors = [
      'button:has-text("Sold")',
      'button:has-text("Status")',
      'input[value="sold"]',
      'label:has-text("Sold")',
      'text="Sold in last year"'
    ];
    
    for (const selector of soldSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`🎯 Found sold filter: ${selector}`);
          await element.click();
          await page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        console.log(`❌ Sold selector not found: ${selector}`);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: path.join(__dirname, '..', 'logs', `after_filters_${Date.now()}.png`),
      fullPage: true 
    });
    
    console.log('⏸️  Keeping browser open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error during UI filter test:', error);
    
    // Take error screenshot
    await page.screenshot({ 
      path: path.join(__dirname, '..', 'logs', `error_${Date.now()}.png`),
      fullPage: true 
    });
  } finally {
    await browser.close();
    console.log('🏁 UI filter test completed');
  }
}

// Run the test
testUIFilters().catch(console.error); 