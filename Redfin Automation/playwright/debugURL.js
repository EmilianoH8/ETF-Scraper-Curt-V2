const { chromium } = require('playwright');
const path = require('path');

async function debugURL() {
  console.log('🔍 Debug: Testing Redfin URL navigation...');
  
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
  
  const testUrls = [
    'https://www.redfin.com',
    'https://www.redfin.com/county/482/FL/Okaloosa-County',
    'https://www.redfin.com/county/482/FL/Okaloosa-County/filter/property-type=land',
    'https://www.redfin.com/county/482/FL/Okaloosa-County/filter/property-type=land,include=sold-1yr',
    'https://www.redfin.com/county/482/FL/Okaloosa-County/filter/property-type=land,include=sold-1yr,lot-size=0-10890-sqft,price=0-9999'
  ];
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`\n🌐 Test ${i + 1}: ${url}`);
    
    try {
      console.log('⏳ Navigating...');
      const startTime = Date.now();
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Success! Loaded in ${loadTime}ms`);
      
      // Wait a bit more
      await page.waitForTimeout(2000);
      
      // Check if page loaded properly
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
      
      // Check current URL (might redirect)
      const currentUrl = page.url();
      if (currentUrl !== url) {
        console.log(`🔄 Redirected to: ${currentUrl}`);
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: path.join(__dirname, '..', 'logs', `debug_test_${i + 1}_${Date.now()}.png`),
        fullPage: false 
      });
      
      // Check for any obvious errors or blocks
      const errorElements = await page.locator('text=/error/i, text=/blocked/i, text=/access denied/i').count();
      if (errorElements > 0) {
        console.log('⚠️  Possible error/block detected on page');
      }
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      
      // Take screenshot of failure
      try {
        await page.screenshot({ 
          path: path.join(__dirname, '..', 'logs', `debug_fail_${i + 1}_${Date.now()}.png`),
          fullPage: false 
        });
      } catch (e) {
        console.log('Could not take failure screenshot');
      }
    }
    
    console.log('⏸️  Waiting 3 seconds before next test...');
    await page.waitForTimeout(3000);
  }
  
  console.log('\n⏸️  Keeping browser open for 10 seconds for inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('🏁 URL debug test completed');
}

debugURL().catch(console.error); 