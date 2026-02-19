
import { chromium } from 'playwright';

const url = process.argv[2];

if (!url) {
    console.error('Usage: tsx browser-check.ts <url>');
    process.exit(1);
}

(async () => {
    let browser;
    try {
        console.log(`Starting browser check for: ${url}`);
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        const consoleLogs = [];
        const pageErrors = [];
        const requestFailures = [];

        // Capture logs
        page.on('console', msg => consoleLogs.push(`[CONSOLE ${msg.type()}] ${msg.text()}`));
        page.on('pageerror', err => pageErrors.push(`[PAGE ERROR] ${err.message}`));
        page.on('requestfailed', request => {
            requestFailures.push(`[NETWORK ERROR] ${request.url()} - ${request.failure()?.errorText || 'Failed'}`);
        });

        // Navigate with timeout
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait a bit for async errors
            await page.waitForTimeout(2000);

            console.log('\n--- SCAN RESULTS ---');
            console.log(`URL: ${url}`);
            console.log(`Title: ${await page.title()}`);

            if (pageErrors.length > 0) {
                console.log('\n--- PAGE ERRORS (Fix These!) ---');
                console.log(pageErrors.join('\n'));
            } else {
                console.log('\nNo page errors detected.');
            }

            if (requestFailures.length > 0) {
                console.log('\n--- NETWORK FAILURES ---');
                console.log(requestFailures.join('\n'));
            }

            if (consoleLogs.length > 0) {
                console.log('\n--- CONSOLE LOGS ---');
                // Filter out boring logs
                const importantLogs = consoleLogs.filter(l =>
                    l.includes('[CONSOLE error]') ||
                    l.includes('[CONSOLE warning]') ||
                    l.includes('React') ||
                    l.includes('hydration')
                );
                if (importantLogs.length > 0) {
                    console.log(importantLogs.join('\n'));
                } else {
                    console.log('(Only info/debug logs found, hidden for brevity)');
                }
            }

            // Check for common React errors in body
            const bodyText = await page.innerText('body');
            if (bodyText.includes('Minified React error') || bodyText.includes('Runtime Error') || bodyText.includes('Something went wrong')) {
                console.log('\n!!! CRITICAL REACT ERROR DETECTED IN BODY !!!');
                console.log(bodyText.substring(0, 500));
            }

        } catch (navError) {
            console.error(`\nNavigation failed: ${navError.message}`);
            console.log('Check if the server is running on the correct port.');
        }

    } catch (error) {
        console.error(`Fatal error: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
})();
