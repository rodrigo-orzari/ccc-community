import { chromium, Browser, Page, BrowserContext } from '@playwright/test';

export abstract class BaseScraper<T> {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;

  async init() {
    console.log(`[Scraper] Initializing headless browser for ${this.constructor.name}...`);
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });
    this.page = await this.context.newPage();
    
    // Attempt basic stealth evasion
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  async close() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    console.log(`[Scraper] Browser closed for ${this.constructor.name}.`);
  }

  /**
   * Wait for real content to appear before parsing.
   *
   * WHY THIS EXISTS: the previous pattern was `goto(..., 'domcontentloaded')`
   * followed by a fixed `waitForTimeout(2000)`. On a JavaScript-rendered
   * catalogue that races the page: domcontentloaded fires when the HTML shell
   * arrives, long before the table is populated. If the fetch is slower than
   * the guess, the scraper reads an empty DOM, returns zero rows, and the
   * pipeline quietly falls back to a handful of hardcoded entries — which is
   * exactly how DigitalOcean's ~70-model catalogue was being represented by 6
   * static rows, with a green checkmark in the ingest log.
   *
   * Waiting on the selector removes the guess: fast pages proceed immediately,
   * slow pages get up to `timeoutMs`, and a genuine markup change now throws a
   * clear error instead of silently returning nothing.
   *
   * @param selector CSS selector that must match at least `minCount` elements.
   * @param minCount Minimum matches required before parsing (default 1).
   * @param timeoutMs How long to wait before giving up (default 30s).
   */
  protected async waitForContent(selector: string, minCount = 1, timeoutMs = 30000): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      await this.page.waitForFunction(
        ({ sel, min }: { sel: string; min: number }) => document.querySelectorAll(sel).length >= min,
        { sel: selector, min: minCount },
        { timeout: timeoutMs }
      );
    } catch {
      // Surface what WAS on the page — a redirect, consent wall or bot check
      // looks identical to "slow render" without this.
      const title = await this.page.title().catch(() => '(unknown)');
      const url = this.page.url();
      throw new Error(
        `[${this.constructor.name}] Timed out after ${timeoutMs}ms waiting for "${selector}" ` +
        `(needed ${minCount}+ matches). Page title: "${title}", URL: ${url}. ` +
        `The site's markup may have changed, or the request may have been blocked.`
      );
    }
  }

  /**
   * The core scraping logic. Must return an array of strongly-typed items.
   */
  abstract scrape(): Promise<T[]>;

  /**
   * Run the scraper lifecycle securely.
   */
  async run(): Promise<T[]> {
    try {
      await this.init();
      return await this.scrape();
    } catch (err) {
      console.error(`[Scraper] ❌ Error in ${this.constructor.name}:`, err);
      throw err;
    } finally {
      await this.close();
    }
  }
}
