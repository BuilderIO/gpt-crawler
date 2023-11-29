// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { Config, configSchema } from "./config.js";
import { Page } from "playwright";
import { isWithinTokenLimit } from "gpt-tokenizer";

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
        null,
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
        null,
      );
      return elements.iterateNext() !== null;
    },
    xpath,
    { timeout },
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
          `Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`,
        );

        // Use custom handling for XPath selector
        if (config.selector) {
          if (config.selector.startsWith("/")) {
            await waitForXPath(
              page,
              config.selector,
              config.waitForSelectorTimeout ?? 1000,
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
      preNavigationHooks: [
        // Abort requests for certain resource types
        async ({ page, log }) => {
          // If there are no resource exclusions, return
          const RESOURCE_EXCLUSTIONS = config.resourceExclusions ?? [];
          if (RESOURCE_EXCLUSTIONS.length === 0) {
            return;
          }
          await page.route(`**\/*.{${RESOURCE_EXCLUSTIONS.join()}}`, (route) =>
            route.abort("aborted"),
          );
          log.info(
            `Aborting requests for as this is a resource excluded route`,
          );
        },
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
}

export async function write(config: Config) {
  const jsonFiles = await glob("storage/datasets/default/*.json", {
    absolute: true,
  });

  console.log(`Found ${jsonFiles.length} files to combine...`);

  let currentResults: Record<string, any>[] = [];
  let currentSize: number = 0;
  let fileCounter: number = 1;
  const maxBytes: number = config.maxFileSize
    ? config.maxFileSize * 1024 * 1024
    : Infinity;

  const getStringByteSize = (str: string): number =>
    Buffer.byteLength(str, "utf-8");

  const nextFileName = (): string =>
    `${config.outputFileName.replace(/\.json$/, "")}-${fileCounter}.json`;

  const writeBatchToFile = async (): Promise<void> => {
    await writeFile(nextFileName(), JSON.stringify(currentResults, null, 2));
    console.log(`Wrote ${currentResults.length} items to ${nextFileName()}`);
    currentResults = [];
    currentSize = 0;
    fileCounter++;
  };

  let estimatedTokens: number = 0;

  const addContentOrSplit = async (
    data: Record<string, any>,
  ): Promise<void> => {
    const contentString: string = JSON.stringify(data);
    const tokenCount: number | false = isWithinTokenLimit(
      contentString,
      config.maxTokens || Infinity,
    );

    if (typeof tokenCount === "number") {
      if (estimatedTokens + tokenCount > config.maxTokens!) {
        // Only write the batch if it's not empty (something to write)
        if (currentResults.length > 0) {
          await writeBatchToFile();
        }
        // Since the addition of a single item exceeded the token limit, halve it.
        estimatedTokens = Math.floor(tokenCount / 2);
        currentResults.push(data);
      } else {
        currentResults.push(data);
        estimatedTokens += tokenCount;
      }
    }

    currentSize += getStringByteSize(contentString);
    if (currentSize > maxBytes) {
      await writeBatchToFile();
    }
  };

  // Iterate over each JSON file and process its contents.
  for (const file of jsonFiles) {
    const fileContent = await readFile(file, "utf-8");
    const data: Record<string, any> = JSON.parse(fileContent);
    await addContentOrSplit(data);
  }

  // Check if any remaining data needs to be written to a file.
  if (currentResults.length > 0) {
    await writeBatchToFile();
  }
}
