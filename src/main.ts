// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { config } from "../config.js";
import { Page } from "playwright";

export function getPageHtml(page: Page) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    // If the selector is not found, fall back to the body
    const defaultSelector = "body";
    if (!el) {
      console.warn(
        `Selector "${selector}" not found, falling back to "${defaultSelector}"`
      );
    }
    return el?.innerText ?? document.querySelector(defaultSelector)?.innerText;
  }, config.selector);
}

if (process.env.NO_CRAWL !== "true") {
  // PlaywrightCrawler crawls the web using a headless
  // browser controlled by the Playwright library.
  const RESOURCE_EXCLUSTIONS = config.resourceExclusions ?? [];
  const crawler = new PlaywrightCrawler({
    // Use the requestHandler to process each of the crawled pages.
    async requestHandler({ request, page, enqueueLinks, log, pushData }) {

      if (config.cookie) {
        // Set the cookie for the specific URL
        const cookie = {
          name: config.cookie.name,
          value: config.cookie.value,
          url: request.loadedUrl,
        };
        await page.context().addCookies([cookie]);
      }

      const title = await page.title();
      log.info(`Crawling ${request.loadedUrl}...`);

      // Wait for the selector to appear on the page
      async function waitForSelectorOrFallback(page: Page, selector: string, fallbackSelector: string, timeout: number) {
        try {
          await page.waitForSelector(selector, { timeout });
        } catch (e) {
          // If the selector is not found, fall back to the fallbackSelector
          log.warning(`Selector "${selector}" not found, Falling back to "${fallbackSelector}"`);
          await page.waitForSelector(fallbackSelector, { timeout });
        }
      }

      await waitForSelectorOrFallback(page, config.selector, "body", config.waitForSelectorTimeout ?? 1000);

      const html = await getPageHtml(page);

      // Save results as JSON to ./storage/datasets/default
      await pushData({ title, url: request.loadedUrl, html });

      if (config.onVisitPage) {
        await config.onVisitPage({ page, pushData });
      }

      // Extract links from the current page
      // and add them to the crawling queue.
      await enqueueLinks({
        globs: [config.match],
      });
    },
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: config.maxPagesToCrawl,
    // Uncomment this option to see the browser window.
    // headless: false,
    preNavigationHooks: [
      // Abort requests for certain resource types
      async ({ page, log }) => {
        // If there are no resource exclusions, return
        if (RESOURCE_EXCLUSTIONS.length === 0) {
          return;
        }
        await page.route(`**\/*.{${RESOURCE_EXCLUSTIONS.join()}}`, route => route.abort());
        log.info(`Aborting requests for as this is a resource excluded route`);
      }
    ],
  });

  const SITEMAP_SUFFIX = "sitemap.xml";
  const isUrlASitemap = config.url.endsWith(SITEMAP_SUFFIX);

  if (isUrlASitemap) {
    const listOfUrls = await downloadListOfUrls({ url: config.url });

    // Add the initial URL to the crawling queue.
    await crawler.addRequests(listOfUrls);

    // Run the crawler
    await crawler.run();
  } else {
    // Add first URL to the queue and start the crawl.
    await crawler.run([config.url]);
  }
}

const jsonFiles = await glob("storage/datasets/default/*.json", {
  absolute: true,
});

const results = [];
for (const file of jsonFiles) {
  const data = JSON.parse(await readFile(file, "utf-8"));
  results.push(data);
}

await writeFile(config.outputFileName, JSON.stringify(results, null, 2));
