import { chromium } from 'playwright';

async function test() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://demo.medvisit.test:8000/login');
    await page.fill('input#email, input[name="email"]', 'clinicadmin@medvisit.test');
    await page.fill('input#password, input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('Logged in, URL is:', page.url());

    await page.goto('http://demo.medvisit.test:8000/pharmacy/receipts');
    await page.waitForTimeout(1000);
    console.log('Receipts page URL is:', page.url());

    const text = await page.locator('body').innerText();
    console.log('Receipts page body snippet:\n', text.slice(0, 800));

    const rows = await page.locator('tbody tr').allInnerTexts();
    console.log('Found', rows.length, 'rows:');
    rows.slice(0, 5).forEach((r, i) => console.log(`Row ${i}:`, r.replace(/\n+/g, ' ')));

    await browser.close();
}
test();
