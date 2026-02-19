import { chromium, Browser, Page } from 'playwright';
import { createLogger } from '@automaker/utils';

const logger = createLogger('BrowserService');

export class BrowserService {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private consoleLogs: string[] = [];
    private pageErrors: string[] = [];

    async launch(url: string, headless = false) {
        if (this.browser) {
            await this.close();
        }

        try {
            logger.info(`Launching browser for ${url} (headless: ${headless})`);
            this.browser = await chromium.launch({ headless });
            this.page = await this.browser.newPage();

            // Capture logs and errors
            this.page.on('console', msg => {
                const text = msg.text();
                this.consoleLogs.push(`[CONSOLE] ${msg.type()}: ${text}`);
                logger.debug(`[Browser Console] ${text}`);
            });

            this.page.on('pageerror', err => {
                this.pageErrors.push(`[PAGE ERROR] ${err.message}`);
                logger.error(`[Browser Error] ${err.message}`);
            });

            await this.page.goto(url);
            return { success: true, message: `Opened ${url}` };
        } catch (error: any) {
            logger.error('Failed to launch browser:', error);
            return { success: false, error: error.message };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            this.consoleLogs = [];
            this.pageErrors = [];
            logger.info('Browser closed');
        }
    }

    async getScreenshot(): Promise<string | null> {
        if (!this.page) return null;
        const buffer = await this.page.screenshot();
        return buffer.toString('base64');
    }

    async getLogs() {
        return {
            console: this.consoleLogs,
            errors: this.pageErrors
        };
    }

    async click(selector: string) {
        if (!this.page) throw new Error('Browser not initialized');
        await this.page.click(selector);
        return { success: true, message: `Clicked ${selector}` };
    }

    async type(selector: string, text: string) {
        if (!this.page) throw new Error('Browser not initialized');
        await this.page.fill(selector, text);
        return { success: true, message: `Typed into ${selector}` };
    }
}
