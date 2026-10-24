import { chromium } from 'playwright';

async function check() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://demo.medvisit.test:8000/login');
    console.log('Opened login page:', page.url());

    await page.fill('input[name="email"], input[type="email"]', 'clinicadmin@medvisit.test');
    await page.fill('input[name="password"], input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    console.log('After submit URL:', page.url());
    const bodyText = await page.locator('body').innerText();
    console.log('Page text snippet:', bodyText.slice(0, 300));
    await browser.close();
}
check();
