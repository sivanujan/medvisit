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
    console.log('Starting Playwright visual verification & regression test for Suppliers...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Login as Clinic Admin
    console.log('Logging in as clinic admin...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const emailInput = await page.$('input[name="email"], input[type="email"]');
    if (emailInput) {
        await page.fill('input[name="email"], input[type="email"]', 'clinicadmin@medvisit.test');
        await page.fill('input[name="password"], input[type="password"]', 'password');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('Logged in successfully!');
    }

    // 2. Test Sidebar Left >= 0 on all routes and viewports in both expanded and collapsed states
    const failures = [];

    for (const width of VIEWPORTS) {
        await page.setViewportSize({ width, height: 900 });
        console.log(`\n=== Testing Viewport ${width}px ===`);

        // Test Expanded State (width = 256px)
        await page.evaluate(() => localStorage.setItem('medvisit_sidebar_collapsed', 'false'));
        for (const route of ROUTES) {
            await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(200);
            const sidebar = page.locator('aside').first();
            await sidebar.waitFor({ state: 'visible', timeout: 5000 });
            const box = await sidebar.boundingBox();

            if (!box) {
                failures.push(`Sidebar not found on ${route.name} at ${width}px (expanded)`);
                continue;
            }

            console.log(`  [Expanded ${width}px] ${route.name}: sidebar left = ${box.x.toFixed(1)}px, width = ${box.width.toFixed(1)}px`);
            if (box.x < 0) {
                failures.push(`Sidebar clipped on ${route.name} at ${width}px (expanded): left = ${box.x.toFixed(1)}px`);
            }
        }

        // Save expanded sidebar screenshot on Suppliers page
        await page.goto(`${BASE_URL}/pharmacy/suppliers`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `suppliers_sidebar_${width}_expanded.png`) });
        console.log(`Saved suppliers_sidebar_${width}_expanded.png`);

        // Test Collapsed State (width = 72px)
        await page.evaluate(() => localStorage.setItem('medvisit_sidebar_collapsed', 'true'));
        for (const route of ROUTES) {
            await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(200);
            const sidebar = page.locator('aside').first();
            await sidebar.waitFor({ state: 'visible', timeout: 5000 });
            const box = await sidebar.boundingBox();

            if (!box) {
                failures.push(`Sidebar not found on ${route.name} at ${width}px (collapsed)`);
                continue;
            }

            console.log(`  [Collapsed ${width}px] ${route.name}: sidebar left = ${box.x.toFixed(1)}px, width = ${box.width.toFixed(1)}px`);
            if (box.x < 0) {
                failures.push(`Sidebar clipped on ${route.name} at ${width}px (collapsed): left = ${box.x.toFixed(1)}px`);
            }
        }

        // Save collapsed sidebar screenshot on Suppliers page
        await page.goto(`${BASE_URL}/pharmacy/suppliers`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `suppliers_sidebar_${width}_collapsed.png`) });
        console.log(`Saved suppliers_sidebar_${width}_collapsed.png`);
    }

    // 3. Reset sidebar to expanded for feature screenshots
    await page.evaluate(() => localStorage.setItem('medvisit_sidebar_collapsed', 'false'));
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('\n=== Capturing Suppliers Feature Screenshots ===');

    // A. Cards View (Light Mode)
    await page.goto(`${BASE_URL}/pharmacy/suppliers`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_cards_light.png') });
    console.log('Saved suppliers_cards_light.png');

    // B. Cards View (Dark Mode)
    await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_cards_dark.png') });
    console.log('Saved suppliers_cards_dark.png');

    // C. Cards View (Mobile Viewport: 390x844 iPhone 14 style)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_cards_mobile.png') });
    console.log('Saved suppliers_cards_mobile.png');

    // Return to desktop
    await page.setViewportSize({ width: 1440, height: 900 });

    // D. Table View (Light & Dark)
    // Click Table View toggle button
    const tableToggleBtn = page.locator('button[title="Table view"]');
    await tableToggleBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_table_light.png') });
    console.log('Saved suppliers_table_light.png');

    await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_table_dark.png') });
    console.log('Saved suppliers_table_dark.png');

    // Return to light mode and cards view
    await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    });
    const cardsToggleBtn = page.locator('button[title="Cards view"]');
    await cardsToggleBtn.click();
    await page.waitForTimeout(300);

    // E. Detail Drawer: GRNs tab
    // Click "View details" on Astron Limited or first card
    const firstViewBtn = page.locator('button:has-text("View details")').first();
    await firstViewBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_detail_drawer_grns.png') });
    console.log('Saved suppliers_detail_drawer_grns.png');

    // F. Detail Drawer: Medicines supplied tab
    const medTabBtn = page.locator('button:has-text("Medicines supplied")');
    if (await medTabBtn.count() > 0) {
        await medTabBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_detail_drawer_medicines.png') });
        console.log('Saved suppliers_detail_drawer_medicines.png');
    }

    // G. Detail Drawer: Activity log tab
    const activityTabBtn = page.locator('button:has-text("Activity log")');
    if (await activityTabBtn.count() > 0) {
        await activityTabBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_detail_drawer_activity.png') });
        console.log('Saved suppliers_detail_drawer_activity.png');
    }

    // Close drawer via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // H. Add Supplier Modal
    const addSupplierBtn = page.locator('button:has-text("Add supplier")').first();
    await addSupplierBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_add_modal.png') });
    console.log('Saved suppliers_add_modal.png');

    // I. Duplicate Supplier Warning Banner
    // Type name matching existing "Hemas Pharmaceuticals" and submit to trigger duplicate check
    await page.fill('input#supName', 'Hemas Pharmaceuticals');
    await page.fill('input#supPhone', '071 222 3344');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_duplicate_warning.png') });
    console.log('Saved suppliers_duplicate_warning.png');

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // J. Empty States (Search for non-existent supplier)
    await page.fill('input[placeholder*="Search by name"]', 'NonExistentXYZSupplier123');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_empty_state_light.png') });
    console.log('Saved suppliers_empty_state_light.png');

    await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'suppliers_empty_state_dark.png') });
    console.log('Saved suppliers_empty_state_dark.png');

    // Reset back to light
    await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    });

    console.log('\n=======================================');
    if (failures.length === 0) {
        console.log('ALL SIDEBAR VIEWPORT & REGRESSION TESTS PASSED! Left >= 0 on all 10 routes (including /pharmacy/suppliers) and viewports.');
    } else {
        console.error('FAILURES DETECTED:');
        failures.forEach((f) => console.error('  - ' + f));
    }
    console.log('=======================================');

    await browser.close();
}

run().catch((err) => {
    console.error('Error during visual verification:', err);
    process.exit(1);
});
