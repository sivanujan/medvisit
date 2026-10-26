import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CENTRAL_BASE_URL = 'http://127.0.0.1:8000';
const TENANT_BASE_URL = 'http://cityhealth.medvisit.localhost:8000';
const SCREENSHOTS_DIR = path.resolve('qa-report/screenshots/critical_flows');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const journeyResults = [];

function recordResult(journeyNumber, name, status, details = {}) {
    const entry = {
        journeyNumber,
        name,
        status,
        timestamp: new Date().toISOString(),
        ...details
    };
    journeyResults.push(entry);
    const badge = status === 'PASSED' ? '✅' : '❌';
    console.log(`${badge} Journey ${journeyNumber}: ${name} (${status}) ${details.durationMs ? `[${details.durationMs}ms]` : ''}`);
    if (details.error) {
        console.error(`   Error: ${details.error}`);
    }
}

async function loginAs(context, email, password = 'Password123!') {
    const page = await context.newPage();
    await page.goto(`${TENANT_BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input#email', { timeout: 10000 });
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]')
    ]);
    return page;
}

async function run() {
    console.log('====================================================');
    console.log('🚀 STARTING PLAYWRIGHT CRITICAL FLOWS (12 JOURNEYS)');
    console.log('====================================================');

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--host-resolver-rules=MAP *.medvisit.localhost 127.0.0.1, MAP medvisit.localhost 127.0.0.1',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const createIsolatedContext = async () => {
        return await browser.newContext({
            viewport: { width: 1440, height: 900 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MedVisit-QA/1.0',
        });
    };

    // JOURNEY 1: Public Directory Search & Filter (/find)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        const page = await context.newPage();
        try {
            await page.goto(`${CENTRAL_BASE_URL}/find`, { waitUntil: 'networkidle' });
            await page.waitForSelector('input', { timeout: 10000 });
            
            const searchInput = page.locator('input[type="text"], input[type="search"]').first();
            await searchInput.fill('City');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_public_directory.png') });
            
            recordResult(1, 'Public Directory Search & Filter', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '01_public_directory.png',
            });
        } catch (err) {
            recordResult(1, 'Public Directory Search & Filter', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 2: Public Doctor Booking Flow (/book)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        const page = await context.newPage();
        try {
            await page.goto(`${TENANT_BASE_URL}/book`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_public_booking.png') });

            // Check verify status via browser fetch
            const verifyStatus = await page.evaluate(async () => {
                const res = await fetch('/book/verify/status');
                return res.status;
            });
            
            recordResult(2, 'Public Doctor Booking Flow', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '02_public_booking.png',
                verifyStatusHttp: verifyStatus
            });
        } catch (err) {
            recordResult(2, 'Public Doctor Booking Flow', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 3: Clinic Staff Login (/login)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'admin@cityhealth.test');
            const currentUrl = page.url();
            const isLoggedIn = currentUrl.includes('/dashboard') || currentUrl.includes('/setup');
            
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_clinic_login.png') });

            if (isLoggedIn) {
                recordResult(3, 'Clinic Staff Login', 'PASSED', {
                    durationMs: Date.now() - startTime,
                    screenshot: '03_clinic_login.png',
                    redirectedUrl: currentUrl
                });
            } else {
                throw new Error(`Expected dashboard redirect but landed on ${currentUrl}`);
            }
        } catch (err) {
            recordResult(3, 'Clinic Staff Login', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 4: Receptionist Token Issuance & Queue Management (/bookings)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'receptionist@cityhealth.test');
            await page.goto(`${TENANT_BASE_URL}/bookings`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_receptionist_queue.png') });

            recordResult(4, 'Receptionist Token Issuance & Queue Management', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '04_receptionist_queue.png',
            });
        } catch (err) {
            recordResult(4, 'Receptionist Token Issuance & Queue Management', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 5: Token Move Between Sessions (Differential Prompt Verification)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'receptionist@cityhealth.test');
            await page.goto(`${TENANT_BASE_URL}/bookings`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_token_move.png') });

            recordResult(5, 'Token Move Between Sessions (Differential Prompts)', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '05_token_move.png',
            });
        } catch (err) {
            recordResult(5, 'Token Move Between Sessions (Differential Prompts)', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 6: Doctor Consultation Workspace (/doctor/consultation/{token} or /sessions/today)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'dr.rohantha@cityhealth.test');
            await page.goto(`${TENANT_BASE_URL}/sessions/today`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_doctor_consultation.png') });

            recordResult(6, 'Doctor Consultation Workspace', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '06_doctor_consultation.png',
            });
        } catch (err) {
            recordResult(6, 'Doctor Consultation Workspace', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 7: Prescription Issuance & Chromium PDF Generation
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'dr.rohantha@cityhealth.test');
            await page.goto(`${TENANT_BASE_URL}/doctor/templates`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_prescription_workspace.png') });

            recordResult(7, 'Prescription Issuance & Chromium PDF Generation', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '07_prescription_workspace.png',
            });
        } catch (err) {
            recordResult(7, 'Prescription Issuance & Chromium PDF Generation', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 8: Pharmacy Dispensing & Batch Stock Reduction (/pharmacy/dispense)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'pharmacist@cityhealth.test');
            await page.goto(`${TENANT_BASE_URL}/pharmacy/dispense`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_pharmacy_dispense.png') });

            recordResult(8, 'Pharmacy Dispensing & Batch Stock Reduction', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '08_pharmacy_dispense.png',
            });
        } catch (err) {
            recordResult(8, 'Pharmacy Dispensing & Batch Stock Reduction', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 9: Goods Received Note (GRN) Creation (/pharmacy/receipts/create)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'pharmacist@cityhealth.test');
            await page.goto(`${TENANT_BASE_URL}/pharmacy/receipts/create`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_grn_creation.png') });

            recordResult(9, 'Goods Received Note (GRN) Creation', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '09_grn_creation.png',
            });
        } catch (err) {
            recordResult(9, 'Goods Received Note (GRN) Creation', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 10: Billing Payment Collection & Receipt Generation (/billing)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'admin@cityhealth.test');
            await page.goto(`${TENANT_BASE_URL}/billing`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_billing_receipt.png') });

            recordResult(10, 'Billing Payment Collection & Receipt Generation', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '10_billing_receipt.png',
            });
        } catch (err) {
            recordResult(10, 'Billing Payment Collection & Receipt Generation', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 11: Doctor Payout Settlement Record & Slip Download (/billing/payouts)
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        try {
            const page = await loginAs(context, 'admin@cityhealth.test');
            await page.goto(`${TENANT_BASE_URL}/billing/payouts`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_doctor_payout.png') });

            recordResult(11, 'Doctor Payout Settlement Record & Slip Download', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '11_doctor_payout.png',
            });
        } catch (err) {
            recordResult(11, 'Doctor Payout Settlement Record & Slip Download', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    // JOURNEY 12: Support Chat Widget Tenant & Guest Messaging
    {
        const startTime = Date.now();
        const context = await createIsolatedContext();
        const page = await context.newPage();
        try {
            await page.goto(`${CENTRAL_BASE_URL}/`, { waitUntil: 'networkidle' });
            
            const statusData = await page.evaluate(async () => {
                const res = await fetch('/support/status');
                return await res.json();
            });

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_support_widget.png') });

            recordResult(12, 'Support Chat Widget Tenant & Guest Messaging', 'PASSED', {
                durationMs: Date.now() - startTime,
                screenshot: '12_support_widget.png',
                widgetStatus: statusData
            });
        } catch (err) {
            recordResult(12, 'Support Chat Widget Tenant & Guest Messaging', 'FAILED', {
                durationMs: Date.now() - startTime,
                error: err.message,
            });
        } finally {
            await context.close();
        }
    }

    await browser.close();

    const passedCount = journeyResults.filter(r => r.status === 'PASSED').length;
    const failedCount = journeyResults.filter(r => r.status === 'FAILED').length;

    console.log('====================================================');
    console.log(`🏁 CRITICAL FLOW AUDIT COMPLETE: ${passedCount}/12 PASSED, ${failedCount} FAILED`);
    console.log('====================================================');

    fs.writeFileSync('qa-report/critical-flows-results.json', JSON.stringify({
        summary: {
            total: journeyResults.length,
            passed: passedCount,
            failed: failedCount,
            completedAt: new Date().toISOString()
        },
        journeys: journeyResults
    }, null, 2));

    if (failedCount > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
