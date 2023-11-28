// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, Dataset, RequestQueue } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import path from "path";
import { Page } from "playwright";

import { ConfigInput, configSchema } from "./config.js";
import {
  crawlerMultiBarLogger,
  updateProgressBar,
  updateTotalProgressBar,
} from "./progressBar.js";
import { ensureDirectoryExistence, toArray } from "./utils.js";

export function getPageHtml(
  page: Page,
  selector = "body",
  excludeSelectors: string | string[] = "",
) {
  // Note: Must be done here because page.evaluate use the page global context and lose the toArray function.
  const arrayExcludeSelectors = toArray(excludeSelectors);

  return page.evaluate(
    ({ selector, excludeSelectors }) => {
      const clonedDocument = cloneDocumentAndRemoveSelectorsContent(
        document,
        excludeSelectors,
      );
      const textContent = getTextContentBySelector(clonedDocument, selector);
      return cleanOutputContent(textContent);

      /**
       * Clones the given document and removes the content of the specified selectors.
       *
       * @param doc - The document to clone.
       * @param excludeSelectors - The selector(s) whose content should be removed.
       * @returns A cloned document with the specified selectors' content removed.
       */
      function cloneDocumentAndRemoveSelectorsContent(
        doc: Document,
        excludeSelectors: string[],
      ): Document {
        const clonedDocument = doc.cloneNode(true) as Document;
        excludeSelectors.forEach((selector) => {
          if (selector) {
            clonedDocument
              .querySelectorAll(selector)
              .forEach((el) => el.remove());
          }
        });
        return clonedDocument;
      }

      /**
       * Retrieves the text content of an element specified by a selector.
       * If the selector is an XPath expression, it evaluates the XPath on the document.
       * Otherwise, it retrieves the inner text of the element.
       *
       * @param doc - The document object to search within.
       * @param selector - The selector or XPath expression to identify the element.
       * @returns The text content of the element.
       */
      function getTextContentBySelector(
        doc: Document,
        selector: string,
      ): string {
        if (isXPath(selector)) {
          return evaluateXPathOnDocument(doc, selector);
        } else {
          return getInnerTextOfElement(doc, selector);
        }
      }

      function isXPath(selector: string): boolean {
        return selector.startsWith("/");
      }

      function evaluateXPathOnDocument(doc: Document, xpath: string): string {
        const result = doc
          .evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null)
          .iterateNext();
        return result ? result.textContent || "" : "";
      }

      function getInnerTextOfElement(doc: Document, selector: string): string {
        const el = doc.querySelector(selector) as HTMLElement | null;
        return el?.innerText || "";
      }

      /**
       * Cleans the output content by removing extra whitespace and newlines.
       */
      function cleanOutputContent(inputString: string) {
        return inputString.replace(/(\s*\n\s*)+/g, "\n ").trim();
      }
    },
    { selector, excludeSelectors: arrayExcludeSelectors },
  );
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

export async function crawl(
  inputConfig: ConfigInput,
  progressBarId: number = 0,
) {
  const config = configSchema.parse(inputConfig);

  let pageCounter = 0;

  const dataset = await Dataset.open(config.name);
  const requestQueue = await RequestQueue.open(config.name);

  if (process.env.NO_CRAWL !== "true") {
    // PlaywrightCrawler crawls the web using a headless
    // browser controlled by the Playwright library.
    const crawler = new PlaywrightCrawler({
      requestQueue,

      // Use the requestHandler to process each of the crawled pages.
      async requestHandler({ request, page, enqueueLinks /*, log*/ }) {
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

        updateTotalProgressBar(
          progressBarId,
          Math.min(requestQueue.getTotalCount(), config.maxPagesToCrawl),
        );

        updateProgressBar(
          progressBarId,
          1,
          config,
          String(request.loadedUrl).replace(config.url, ""),
          requestQueue.getTotalCount(),
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

        const html = await getPageHtml(
          page,
          config.selector,
          config.excludeSelectors,
        );

        // Save results as JSON to ./storage/datasets/default
        await dataset.pushData({ title, url: request.loadedUrl, html });

        if (config.onVisitPage) {
          await config.onVisitPage({ page, pushData: dataset.pushData });
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
      maxConcurrency: config.maxConcurrency,
      log: crawlerMultiBarLogger,

      // Uncomment this option to see the browser window.
      // headless: false,
    });

    // Add first URL to the queue and start the crawl.
    await crawler.run([config.url]);
    updateProgressBar(
      progressBarId,
      0,
      config,
      "Completed",
      requestQueue.getTotalCount(),
    );
  }
}

export async function write(inputConfig: ConfigInput) {
  const config = configSchema.parse(inputConfig);

  const jsonFiles = await glob(`storage/datasets/${config.name}/*.json`, {
    absolute: true,
  });

  const results = [];
  for (const file of jsonFiles) {
    const data = JSON.parse(await readFile(file, "utf-8"));
    results.push(data);
  }

  const outputFileName = path.join("./output/", config.outputFileName);
  await ensureDirectoryExistence(outputFileName);

  await writeFile(outputFileName, JSON.stringify(results, null, "\t"));
}
