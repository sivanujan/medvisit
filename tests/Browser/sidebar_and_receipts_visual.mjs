import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/Sivanujan_PC/.gemini/antigravity-ide/brain/76b3023b-fd67-46a7-99e0-7d7c8d8b4970/screenshots';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = 'http://demo.medvisit.test:8000';
const VIEWPORTS = [1280, 1366, 1440, 1920];

const ROUTES = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'SessionsToday', path: '/sessions/today' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Doctors', path: '/doctors' },
    { name: 'Patients', path: '/patients' },
    { name: 'Billing', path: '/billing' },
    { name: 'Medicines', path: '/pharmacy/medicines' },
    { name: 'Receipts', path: '/pharmacy/receipts' },
    { name: 'ReceiptCreate', path: '/pharmacy/receipts/create' },
    { name: 'Suppliers', path: '/pharmacy/suppliers' },
];

async function run() {
    console.log('Starting Playwright visual verification & regression test...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Login
    console.log('Logging in as clinic admin...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"], input[name="email"]', 'clinicadmin@medvisit.test');
    await page.fill('input[type="password"], input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Logged in successfully!');

    // 2. Test Sidebar Left >= 0 on all routes and viewports in both expanded and collapsed states
    const failures = [];

    for (const width of VIEWPORTS) {
        await page.setViewportSize({ width, height: 900 });
        console.log(`\n=== Testing Viewport ${width}px ===`);

        // Test Expanded State
        await page.evaluate(() => localStorage.setItem('medvisit_sidebar_collapsed', 'false'));
        for (const route of ROUTES) {
            await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(300);
            const sidebar = page.locator('aside').first();
            await sidebar.waitFor({ state: 'visible', timeout: 5000 });
            const box = await sidebar.boundingBox();

            if (!box) {
                failures.push(`Sidebar not found on ${route.name} at ${width}px (expanded)`);
                continue;
            }

            console.log(`  [Expanded ${width}px] ${route.name}: sidebar left = ${box.x.toFixed(1)}px, width = ${box.width.toFixed(1)}px`);
            if (box.x < 0) {
                failures.push(`Sidebar clipped on ${route.name} at ${width}px expanded (left=${box.x})`);
            }
        }
        // Save screenshot of Receipts page at this width (expanded)
        await page.goto(`${BASE_URL}/pharmacy/receipts`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `sidebar_${width}_expanded.png`) });
        console.log(`Saved sidebar_${width}_expanded.png`);

        // Test Collapsed State
        await page.evaluate(() => localStorage.setItem('medvisit_sidebar_collapsed', 'true'));
        for (const route of ROUTES) {
            await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(300);
            const sidebar = page.locator('aside').first();
            await sidebar.waitFor({ state: 'visible', timeout: 5000 });
            const box = await sidebar.boundingBox();

            if (!box) {
                failures.push(`Sidebar not found on ${route.name} at ${width}px (collapsed)`);
                continue;
            }

            console.log(`  [Collapsed ${width}px] ${route.name}: sidebar left = ${box.x.toFixed(1)}px, width = ${box.width.toFixed(1)}px`);
            if (box.x < 0) {
                failures.push(`Sidebar clipped on ${route.name} at ${width}px collapsed (left=${box.x})`);
            }
        }
        // Save screenshot of Receipts page at this width (collapsed)
        await page.goto(`${BASE_URL}/pharmacy/receipts`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `sidebar_${width}_collapsed.png`) });
        console.log(`Saved sidebar_${width}_collapsed.png`);
    }

    // Reset expanded sidebar for remaining screenshots
    await page.evaluate(() => localStorage.setItem('medvisit_sidebar_collapsed', 'false'));
    await page.setViewportSize({ width: 1440, height: 900 });

    // 3. Receipts Page Detail Screenshots
    console.log('\n=== Capturing Receipts Page Feature Screenshots ===');

    // 3a. Receipts List View (Light Mode)
    await page.goto(`${BASE_URL}/pharmacy/receipts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_list_light.png'), fullPage: false });
    console.log('Saved receipts_list_light.png');

    // 3b. Receipts List View (Dark Mode)
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_list_dark.png'), fullPage: false });
    console.log('Saved receipts_list_dark.png');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    // 3c. Mobile View (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/pharmacy/receipts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_list_mobile.png'), fullPage: false });
    console.log('Saved receipts_list_mobile.png');

    // Reset desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/pharmacy/receipts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    // 3d. Details Drawer (Click on first row: GRN-000001 which is unconsumed)
    const firstRow = page.locator('tbody tr:has-text("GRN-000001"), tbody tr').first();
    if (await firstRow.count() > 0) {
        await firstRow.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_details_drawer.png') });
        console.log('Saved receipts_details_drawer.png');

        // 3e. Void Modal (Allowed)
        const voidBtn = page.locator('button:has-text("Void GRN")').first();
        if (await voidBtn.count() > 0 && await voidBtn.isEnabled()) {
            await voidBtn.click();
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'void_modal_allowed.png') });
            console.log('Saved void_modal_allowed.png');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
    }

    // 3f. Details Drawer & Void Modal (Blocked: click GRN-000002 where 40 units were dispensed)
    const blockedRow = page.locator('tbody tr:has-text("GRN-000002"), tbody tr:has-text("Partly consumed")').first();
    if (await blockedRow.count() > 0) {
        await blockedRow.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_details_drawer_blocked.png') });
        console.log('Saved receipts_details_drawer_blocked.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
    }

    // 3g. Empty State Screenshot
    await page.goto(`${BASE_URL}/pharmacy/receipts?search=__non_existent_search_query_999999__`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_empty_state_light.png') });
    console.log('Saved receipts_empty_state_light.png');

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'receipts_empty_state_dark.png') });
    console.log('Saved receipts_empty_state_dark.png');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    await browser.close();

    console.log('\n=======================================');
    if (failures.length > 0) {
        console.error('FAILURES DETECTED:');
        failures.forEach(f => console.error('  - ' + f));
        process.exit(1);
    } else {
        console.log('ALL SIDEBAR VIEWPORT & REGRESSION TESTS PASSED! Left >= 0 on all routes and viewports.');
        console.log('=======================================');
    }
}

run().catch((err) => {
    console.error('Error in Playwright test:', err);
    process.exit(1);
});
