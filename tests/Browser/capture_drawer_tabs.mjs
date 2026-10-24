import { chromium } from 'playwright';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/Sivanujan_PC/.gemini/antigravity-ide/brain/76b3023b-fd67-46a7-99e0-7d7c8d8b4970/screenshots';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://demo.medvisit.test:8000/login');
    await page.fill('input[name="email"]', 'clinicadmin@medvisit.test');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto('http://demo.medvisit.test:8000/pharmacy/suppliers');
    await page.waitForTimeout(500);

    const viewBtn = page.locator('button:has-text("View details")').first();
    await viewBtn.click();
    await page.waitForSelector('button:has-text("Medicines supplied")', { timeout: 5000 });

    await page.click('button:has-text("Medicines supplied")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_detail_drawer_medicines.png') });
    console.log('Saved suppliers_detail_drawer_medicines.png');

    await page.click('button:has-text("Activity log")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_detail_drawer_activity.png') });
    console.log('Saved suppliers_detail_drawer_activity.png');

    await browser.close();
}

run().catch(console.error);
