import { chromium } from 'playwright';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/Sivanujan_PC/.gemini/antigravity-ide/brain/76b3023b-fd67-46a7-99e0-7d7c8d8b4970/screenshots';
const BASE_URL = 'http://demo.medvisit.test:8000';

async function capture() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Login if needed
    await page.goto(`${BASE_URL}/pharmacy/receipts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    if (page.url().includes('/login')) {
        await page.fill('input#email, input[name="email"]', 'clinicadmin@medvisit.test');
        await page.fill('input#password, input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        await page.goto(`${BASE_URL}/pharmacy/receipts`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
    }

    // 1. Open GRN-000001 (Allowed void)
    const row1 = page.locator('tbody tr:has-text("GRN-000001")').first();
    await row1.click();
    await page.waitForTimeout(800);

    // Click "Void GRN"
    const voidBtn = page.locator('button:has-text("Void GRN")').first();
    await voidBtn.waitFor({ state: 'visible', timeout: 5000 });
    await voidBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'void_modal_allowed.png') });
    console.log('Saved void_modal_allowed.png');

    // Close modal & drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 2. Open GRN-000002 (Blocked void - 40 units consumed)
    const row2 = page.locator('tbody tr:has-text("GRN-000002")').first();
    await row2.click();
    await page.waitForTimeout(800);

    // Check for "Void blocked" indicator in drawer footer
    const blockedIndicator = page.locator('div:has-text("Void blocked")').first();
    await blockedIndicator.waitFor({ state: 'visible', timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'void_modal_blocked.png') });
    console.log('Saved void_modal_blocked.png');

    // 3. Open Print GRN Modal
    const printBtn = page.locator('button:has-text("Print GRN")').first();
    if (await printBtn.count() > 0) {
        await printBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_print_a4.png') });
        console.log('Saved receipts_print_a4.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    }

    // 4. Open Print Barcodes Modal
    const barcodeBtn = page.locator('button:has-text("Print barcodes")').first();
    if (await barcodeBtn.count() > 0) {
        await barcodeBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_print_barcodes.png') });
        console.log('Saved receipts_print_barcodes.png');
        await page.keyboard.press('Escape');
    }

    await browser.close();
    console.log('All modal screenshots captured successfully!');
}

capture().catch((e) => {
    console.error('Error:', e);
    process.exit(1);
});
