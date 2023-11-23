// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import {Config, configSchema} from "./config.js";
import { Page } from "playwright";
import {
  isWithinTokenLimit,
} from 'gpt-tokenizer'

let pageCounter = 0;

export function getPageHtml(page: Page, selector = "body") {
  return page.evaluate((selector) => {
    // Check if the selector is an XPath
    if (selector.startsWith("/")) {
      const elements = document.evaluate(
        selector,
        document,
        null,
        XPathResult.ANY_TYPE,
        null
      );
      let result = elements.iterateNext();
      return result ? result.textContent || "" : "";
    } else {
      // Handle as a CSS selector
      const el = document.querySelector(selector) as HTMLElement | null;
      return el?.innerText || "";
    }
  }, selector);
}

export async function waitForXPath(page: Page, xpath: string, timeout: number) {
  await page.waitForFunction(
    (xpath) => {
      const elements = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ANY_TYPE,
        null
      );
      return elements.iterateNext() !== null;
    },
    xpath,
    { timeout }
  );
}

export async function crawl(config: Config) {
  configSchema.parse(config);

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
        pageCounter++;
        log.info(
          `Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`
        );

        // Use custom handling for XPath selector
        if (config.selector) {
          if (config.selector.startsWith("/")) {
            await waitForXPath(
              page,
              config.selector,
              config.waitForSelectorTimeout ?? 1000
            );
          } else {
            await page.waitForSelector(config.selector, {
              timeout: config.waitForSelectorTimeout ?? 1000,
            });
          }
        }

        const html = await getPageHtml(page, config.selector);

        // Save results as JSON to ./storage/datasets/default
        await pushData({ title, url: request.loadedUrl, html });

        if (config.onVisitPage) {
          await config.onVisitPage({ page, pushData });
        }

        // Extract links from the current page
        // and add them to the crawling queue.
        await enqueueLinks({
          globs:
            typeof config.match === "string" ? [config.match] : config.match,
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
}

export async function write(config: Config) {
  const jsonFiles = await glob("storage/datasets/default/*.json", {
    absolute: true,
  });

  console.log(`Found ${jsonFiles.length} files to combine...`);

  let currentResults: any[] = [];
  let currentSize = 0;
  let fileCounter = 1;
  const maxBytes = config.maxFileSize ? config.maxFileSize * 1024 * 1024 : null; // Convert maxFileSize from MB to bytes

  // Helper function to get byte size of string
  const getStringByteSize = (str: string) => Buffer.byteLength(str, 'utf-8');

  // Write the accumulated data to a file and reset the current batch
  const writeToFile = async () => {
    const fileName = `${config.outputFileName.replace(/\.json$/, '')}-${fileCounter}.json`;
    await writeFile(fileName, JSON.stringify(currentResults, null, 2));
    console.log(`Wrote ${currentResults.length} items to ${fileName}`);
    fileCounter++;
    currentResults = []; // Start a new batch
    currentSize = 0; // Reset the size counter
  };

  for (const file of jsonFiles) {
    const fileContent = await readFile(file, 'utf-8');
    const data = JSON.parse(fileContent);
    const dataSize = getStringByteSize(fileContent);
    let resultWritten = false;

    // Check if data exceeds file size limit (if present)
    if (maxBytes && currentSize + dataSize > maxBytes) {
      await writeToFile();
      resultWritten = true;
    }

    // Check if data exceeds token limit (if present)
    if (config.maxTokens && !isWithinTokenLimit(JSON.stringify(data), config.maxTokens)) {
      if (!resultWritten) { // Write only if not already written
        await writeToFile();
      }
      continue; // Skip adding this object to the batch
    }

    // Add data to current batch
    currentResults.push(data);
    currentSize += dataSize;

    // Write to file if batch is over size limit (File size check to delegate larger final batch size check)
    if (maxBytes && currentSize > maxBytes) {
      await writeToFile();
    }
  }
  
  // Write any remaining data in the current batch to the final file
  if (currentResults.length > 0) {
    await writeToFile();
  }
}
