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

function shouldCrawl(url: string): boolean {
  // This function checks if a given URL should be crawled or not.
  // It returns false if the URL contains any of the directories specified in the exclude array of the config object.
  // Otherwise, it returns true.

  // Iterate over each directory in the exclude array of the config object
  for (const dir of config.exclude) {
    // If the URL contains the current directory, return false
    if (url.includes(dir)) {
      return false;
    }
  }

  // If the URL does not contain any excluded directories, return true
  return true;
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

      // Extract all the href attributes from the anchor tags on the current page
      const links = await page.$$eval('a', links => links.map(a => a.href));
      
      // Filter out the links that should not be crawled based on the configuration
      const filteredLinks = links.filter(shouldCrawl);
      
      // Add the filtered links to the crawling queue, only if they match the pattern specified in the configuration
      await enqueueLinks({
        urls: filteredLinks,
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
