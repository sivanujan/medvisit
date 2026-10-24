import { chromium } from 'playwright';

async function check() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://demo.medvisit.test:8000/login');
    await page.fill('input[name="email"]', 'clinicadmin@medvisit.test');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    for (const width of [1280, 1366, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('http://demo.medvisit.test:8000/pharmacy/import');
        await page.waitForTimeout(500);
        const aside = page.locator('aside').first();
        const box = await aside.boundingBox();
        console.log(`Viewport ${width}px: aside left=${box ? box.x : 'null'}, width=${box ? box.width : 'null'}`);
    }
    await browser.close();
}

check().catch(console.error);
