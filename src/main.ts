// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { config } from "../config.js";
import { Page } from "playwright";

export function getPageHtml(page: Page) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    return el?.innerText || "";
  }, config.selector);
}

if (process.env.NO_CRAWL !== "true") {
  // PlaywrightCrawler crawls the web using a headless
  // browser controlled by the Playwright library.
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

      await page.waitForSelector(config.selector, {
        timeout: config.waitForSelectorTimeout ?? 1000,
      });

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
  });

  // Add first URL to the queue and start the crawl.
  await crawler.run([config.url]);
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
