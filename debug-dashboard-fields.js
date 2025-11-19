// Debug script to navigate to ASU dashboard and inspect form fields
const { chromium } = require('playwright');

async function inspectDashboardFields() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('1. Navigating to ASU application site...');
        await page.goto('https://apply-qa.apps.asu.edu/', { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        
        console.log('2. Selecting Online MOL...');
        await page.getByRole('radio', { name: /Online/ }).click();
        await page.waitForTimeout(2000);
        
        console.log('3. Selecting degree option...');
        await page.getByRole('radio', { name: /Yes, I want to pursue/ }).click();
        await page.waitForTimeout(2000);
        
        console.log('4. Creating test account...');
        const testEmail = `test.user.${Date.now()}@test.asu.edu`;
        const testPassword = 'Testing10!';
        
        await page.getByRole('textbox', { name: 'Enter your email' }).fill(testEmail);
        await page.getByRole('textbox', { name: 'Confirm your email' }).fill(testEmail);
        await page.getByRole('textbox', { name: 'Create a password' }).fill(testPassword);
        await page.getByRole('textbox', { name: 'Confirm your password' }).fill(testPassword);
        
        await page.getByRole('button', { name: 'Create account' }).click();
        await page.waitForURL('**/user/verify-email', { timeout: 30000 });
        
        console.log('5. Clicking Log in button on verify email page...');
        await page.getByRole('button', { name: 'Log in' }).click();
        await page.waitForURL('**/user/login', { timeout: 30000 });
        
        console.log('6. Logging in...');
        await page.getByRole('textbox', { name: 'Email' }).fill(testEmail);
        await page.getByRole('textbox', { name: 'Password' }).fill(testPassword);
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
        
        // Wait for login to complete
        await page.waitForTimeout(5000);
        
        console.log('7. Navigating to dashboard...');
        await page.goto('https://apply-qa.apps.asu.edu/dashboard', { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        
        console.log('8. Current URL:', page.url());
        
        // Take a screenshot
        await page.screenshot({ path: 'dashboard-screenshot.png', fullPage: true });
        
        console.log('9. Looking for Start Application buttons...');
        const buttons = await page.locator('button, a[role="button"], input[type="button"], input[type="submit"]').all();
        
        console.log('\n=== ALL BUTTONS ON DASHBOARD ===');
        for (let i = 0; i < buttons.length; i++) {
            try {
                const text = await buttons[i].textContent();
                const isVisible = await buttons[i].isVisible();
                const tagName = await buttons[i].evaluate(el => el.tagName);
                const className = await buttons[i].evaluate(el => el.className);
                console.log(`Button ${i + 1}: "${text?.trim()}" (${tagName}, visible: ${isVisible}, class: "${className}")`);
            } catch (error) {
                console.log(`Button ${i + 1}: Error getting info`);
            }
        }
        
        // Look for Start Application button and click it
        console.log('\n10. Looking for Start Application button...');
        const startButtons = [
            'button:has-text("Start New Application")',
            'button:has-text("Start Application")', 
            'button:has-text("Begin Application")',
            'button:has-text("Start")',
            'a:has-text("Start")',
            '[role="button"]:has-text("Start")'
        ];
        
        let buttonClicked = false;
        for (const selector of startButtons) {
            try {
                const button = page.locator(selector);
                if (await button.count() > 0 && await button.isVisible()) {
                    console.log(`Found Start button with selector: ${selector}`);
                    await button.first().click();
                    buttonClicked = true;
                    break;
                }
            } catch (error) {
                continue;
            }
        }
        
        if (buttonClicked) {
            await page.waitForTimeout(3000);
            console.log('11. After clicking Start button, URL:', page.url());
            
            // Take another screenshot
            await page.screenshot({ path: 'form-screenshot.png', fullPage: true });
            
            console.log('\n=== FORM FIELDS INSPECTION ===');
            
            // Look for all input fields
            const inputs = await page.locator('input, select, textarea').all();
            console.log(`\nFound ${inputs.length} form fields:`);
            
            for (let i = 0; i < inputs.length; i++) {
                try {
                    const element = inputs[i];
                    const tagName = await element.evaluate(el => el.tagName);
                    const type = await element.evaluate(el => el.type || 'N/A');
                    const name = await element.evaluate(el => el.name || 'N/A');
                    const id = await element.evaluate(el => el.id || 'N/A');
                    const placeholder = await element.evaluate(el => el.placeholder || 'N/A');
                    const ariaLabel = await element.evaluate(el => el.getAttribute('aria-label') || 'N/A');
                    const className = await element.evaluate(el => el.className || 'N/A');
                    const isVisible = await element.isVisible();
                    
                    // Get associated label
                    let labelText = 'N/A';
                    try {
                        const label = await page.locator(`label[for="${id}"]`).textContent();
                        if (label) labelText = label.trim();
                    } catch (e) {
                        // Try to find label by proximity
                        try {
                            const nearbyLabel = await element.locator('xpath=preceding-sibling::label[1] | following-sibling::label[1] | ../label | ../../label').first().textContent();
                            if (nearbyLabel) labelText = nearbyLabel.trim();
                        } catch (e2) {
                            // No label found
                        }
                    }
                    
                    console.log(`Field ${i + 1}:`);
                    console.log(`  Tag: ${tagName}, Type: ${type}`);
                    console.log(`  Name: ${name}, ID: ${id}`);
                    console.log(`  Placeholder: ${placeholder}`);
                    console.log(`  Aria-label: ${ariaLabel}`);
                    console.log(`  Label: ${labelText}`);
                    console.log(`  Class: ${className}`);
                    console.log(`  Visible: ${isVisible}`);
                    console.log('---');
                    
                } catch (error) {
                    console.log(`Field ${i + 1}: Error getting info - ${error.message}`);
                }
            }
        } else {
            console.log('No Start Application button found');
        }
        
        console.log('\n12. Keeping browser open for manual inspection...');
        console.log('Press Ctrl+C to close when done inspecting');
        
        // Keep browser open for manual inspection
        await page.waitForTimeout(300000); // 5 minutes
        
    } catch (error) {
        console.error('Error:', error.message);
        await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

inspectDashboardFields();
