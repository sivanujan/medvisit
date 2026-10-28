import { chromium } from 'playwright';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/Sivanujan_PC/.gemini/antigravity-ide/brain/76b3023b-fd67-46a7-99e0-7d7c8d8b4970/screenshots';
const BASE_URL = 'http://demo.medvisit.test:8000';

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    console.log('Navigating to login...');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', 'clinicadmin@medvisit.test');
    await page.fill('input[name="password"], input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    console.log('Current URL after login:', page.url());

    await page.goto(`${BASE_URL}/pharmacy/receipts`);
    await page.waitForTimeout(1500);
    console.log('Receipts page URL:', page.url());

    // 1. Capture allowed void modal:
    // Click on GRN-000001 (unconsumed)
    const row1 = page.locator('tbody tr:has-text("GRN-000001")').first();
    console.log('Clicking GRN-000001 row...');
    await row1.click();
    await page.waitForTimeout(1000);

    // Click "Void GRN" button in drawer footer
    const voidBtn = page.locator('button:has-text("Void GRN")').first();
    if (await voidBtn.count() > 0) {
        console.log('Clicking Void GRN button...');
        await voidBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'void_modal_allowed.png') });
        console.log('Captured void_modal_allowed.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
    }

    // Capture Print GRN A4 modal
    const printBtn = page.locator('button[title="Print GRN document"]').first();
    if (await printBtn.count() > 0) {
        await printBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_print_a4.png') });
        console.log('Captured receipts_print_a4.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
    }

    // Capture Barcode modal
    const barcodeBtn = page.locator('button:has-text("Print barcodes")').first();
    if (await barcodeBtn.count() > 0) {
        await barcodeBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_print_barcodes.png') });
        console.log('Captured receipts_print_barcodes.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
    }

    // Close drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 2. Capture blocked void modal:
    // Click on GRN-000002 (40 units dispensed)
    const row2 = page.locator('tbody tr:has-text("GRN-000002")').first();
    console.log('Clicking GRN-000002 row...');
    await row2.click();
    await page.waitForTimeout(1000);

    // Screenshot of blocked drawer state with disabled indicator
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'void_modal_blocked.png') });
    console.log('Captured void_modal_blocked.png');

    await browser.close();
    console.log('Done capturing all requested modal screenshots!');
}

main().catch(err => {
    console.error('Error in capture_all_modals:', err);
    process.exit(1);
});
