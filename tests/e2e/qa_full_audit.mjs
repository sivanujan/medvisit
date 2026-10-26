import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:8000';
const SCREENSHOTS_DIR = path.resolve('qa-report/screenshots');

const viewports = {
    desktop: { width: 1440, height: 900 },
    tablet: { width: 768, height: 1024 }, // iPad
    mobile: { width: 390, height: 844 },  // iPhone 12
};

const a11yResults = [];
const perfResults = [];
const consoleErrors = [];
const networkErrors = [];

async function run() {
    console.log('--- STARTING PLAYWRIGHT QA PASS ---');
    const browser = await chromium.launch({
        headless: true,
        args: ['--host-resolver-rules=MAP *.medvisit.localhost 127.0.0.1, MAP medvisit.localhost 127.0.0.1']
    });

    // 1. PUBLIC LANDING PAGE
    for (const [vpName, vp] of Object.entries(viewports)) {
        const context = await browser.newContext({
            viewport: vp,
            colorScheme: 'light',
        });
        const page = await context.newPage();

        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push({ page: `Landing (${vpName})`, text: msg.text() });
            }
        });

        page.on('requestfailed', req => {
            networkErrors.push({ page: `Landing (${vpName})`, url: req.url(), error: req.failure()?.errorText });
        });

        const start = Date.now();
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - start;

        perfResults.push({ page: `Landing (${vpName})`, loadTimeMs: loadTime });

        const subDir = vpName === 'desktop' ? 'public' : vpName;
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, subDir, `landing-${vpName}-light.png`), fullPage: false });

        // Dark mode for desktop
        if (vpName === 'desktop') {
            await page.emulateMedia({ colorScheme: 'dark' });
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'public', 'landing-desktop-dark.png'), fullPage: false });

            // Run Axe A11y on landing page
            try {
                const axe = await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa'])
                    .analyze();

                const violations = axe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
                a11yResults.push({
                    page: 'Landing Page',
                    violationsCount: violations.length,
                    violations: violations.map(v => ({
                        id: v.id,
                        impact: v.impact,
                        description: v.description,
                        helpUrl: v.helpUrl,
                        nodes: v.nodes.map(n => n.target.join(' ')),
                    }))
                });
            } catch (err) {
                console.error('Axe error on Landing:', err.message);
            }
        }

        await context.close();
    }

    // 2. PRICING PAGE
    {
        const context = await browser.newContext({ viewport: viewports.desktop });
        const page = await context.newPage();
        const start = Date.now();
        await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' });
        perfResults.push({ page: 'Pricing', loadTimeMs: Date.now() - start });

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'public', 'pricing-desktop-light.png') });
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'public', 'pricing-desktop-dark.png') });

        // Axe check
        try {
            const axe = await new AxeBuilder({ page }).analyze();
            const violations = axe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
            a11yResults.push({
                page: 'Pricing Page',
                violationsCount: violations.length,
                violations: violations.map(v => ({
                    id: v.id,
                    impact: v.impact,
                    description: v.description,
                    nodes: v.nodes.map(n => n.target.join(' ')),
                }))
            });
        } catch (err) {
            console.error('Axe error on Pricing:', err.message);
        }

        await context.close();
    }

    // 3. PUBLIC DIRECTORY (/find)
    {
        const context = await browser.newContext({ viewport: viewports.desktop });
        const page = await context.newPage();
        const start = Date.now();
        await page.goto(`${BASE_URL}/find`, { waitUntil: 'networkidle' });
        perfResults.push({ page: 'Find Directory', loadTimeMs: Date.now() - start });

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'public', 'directory-find-desktop.png') });

        // Axe check
        try {
            const axe = await new AxeBuilder({ page }).analyze();
            const violations = axe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
            a11yResults.push({
                page: 'Directory Search (/find)',
                violationsCount: violations.length,
                violations: violations.map(v => ({
                    id: v.id,
                    impact: v.impact,
                    description: v.description,
                    nodes: v.nodes.map(n => n.target.join(' ')),
                }))
            });
        } catch (err) {
            console.error('Axe error on Find:', err.message);
        }

        await context.close();
    }

    // 4. CLINIC PUBLIC BOOKING (/book on cityhealth tenant subdomain)
    {
        const context = await browser.newContext({
            viewport: viewports.desktop,
        });
        const page = await context.newPage();
        const start = Date.now();
        await page.goto('http://cityhealth.medvisit.localhost:8000/book', { waitUntil: 'networkidle' });
        perfResults.push({ page: 'Clinic Booking (/book)', loadTimeMs: Date.now() - start });

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'public', 'clinic-booking-desktop.png') });

        // Mobile emulation for booking
        await page.setViewportSize(viewports.mobile);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile', 'clinic-booking-mobile.png') });

        // Axe check
        try {
            const axe = await new AxeBuilder({ page }).analyze();
            const violations = axe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
            a11yResults.push({
                page: 'Clinic Booking Page',
                violationsCount: violations.length,
                violations: violations.map(v => ({
                    id: v.id,
                    impact: v.impact,
                    description: v.description,
                    nodes: v.nodes.map(n => n.target.join(' ')),
                }))
            });
        } catch (err) {
            console.error('Axe error on Booking:', err.message);
        }

        await context.close();
    }

    // 5. LEGAL PAGES
    for (const legalPage of ['privacy-policy', 'refund-policy', 'dispute-policy']) {
        const context = await browser.newContext({ viewport: viewports.desktop });
        const page = await context.newPage();
        await page.goto(`${BASE_URL}/${legalPage}`, { waitUntil: 'networkidle' });
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'public', `${legalPage}.png`) });
        await context.close();
    }

    await browser.close();

    // Save report data
    fs.writeFileSync('qa-report/a11y-results.json', JSON.stringify(a11yResults, null, 2));
    fs.writeFileSync('qa-report/performance-results.json', JSON.stringify(perfResults, null, 2));
    fs.writeFileSync('qa-report/console-errors.json', JSON.stringify({ consoleErrors, networkErrors }, null, 2));

    console.log('--- PLAYWRIGHT AUDIT COMPLETE ---');
    console.log(`Captured ${a11yResults.reduce((acc, c) => acc + c.violationsCount, 0)} a11y violations.`);
    console.log(`Captured ${consoleErrors.length} console errors, ${networkErrors.length} network failures.`);
}

run().catch(err => {
    console.error('Runner failed:', err);
    process.exit(1);
});
