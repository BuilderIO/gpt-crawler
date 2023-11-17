// For more information, see https://crawlee.dev/
import { PlaywrightCrawler } from "crawlee";

import { glob } from "glob";
import { config } from "../config.js";
import { Page } from "playwright";
import { readFile, writeFile, mkdir } from "fs/promises"; // 确保 mkdir 从 'fs/promises' 导入
import { existsSync } from "fs";

export function getPageHtml(page: Page) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    return el?.innerText || "";
  }, config.selector);
}

if (process.env.NO_CRAWL !== "true") {
  // 新增：用于存储当前页面深度的变量
  let currentDepth = 0;
  const processedUrls = new Set();

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
        timeout: 1000,
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

      if (currentDepth === 0 && config?.isContentLink) {
        // 调用 handleExternalLinks 函数处理外部链接
        await handleExternalLinks(
          page,
          request.loadedUrl as string,
          "external-links-data",
          processedUrls as any
        );
        currentDepth++;
      }
    },
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: config.maxPagesToCrawl,
    // Uncomment this option to see the browser window.
    // headless: false,
  });

  // Add first URL to the queue and start the crawl.
  await crawler.run([config.url]);
}

// This asynchronous function handles the extraction and processing of external links from a given web page.
async function handleExternalLinks(
  page: Page, // The page object from which to extract links.
  currentPageUrl: string, // The URL of the current page to compare link origins.
  folderName: string, // The name of the folder where processed data will be stored.
  processedUrls: Set<string> // A set to keep track of URLs that have already been processed.
) {
  // Extract all anchor elements from the page and filter out non-external links.
  const links = await page.$$eval(
    "a", // Select all anchor tags.
    (anchors, currentPageUrl: string) => {
      return anchors
        .map((anchor) => {
          const textContent = anchor.textContent?.trim() ?? "";
          const href = anchor.href || "";
          return { href, text: textContent };
        })
        .filter((link) => {
          // Filter out links that are not external.
          return (
            link.href &&
            new URL(link.href, document.baseURI).origin !==
              new URL(currentPageUrl, document.baseURI).origin
          );
        });
    },
    currentPageUrl
  );
  // Create the folder if it doesn't exist to store processed data.
  if (!existsSync(folderName)) {
    await mkdir(folderName);
  }

  // Process each external link.
  for (const link of links) {
    try {
      // Skip the link if it has already been processed.
      if (processedUrls.has(link.href)) {
        continue;
      }

      // Mark the link as processed.
      processedUrls.add(link.href);

      // Open a new page for the external link.
      const externalPage = await page.context().newPage();
      await externalPage.goto(link.href, { waitUntil: "domcontentloaded" });

      // Check if the specified element exists on the external page.
      const mainExists = await externalPage.$(config.withoutSelector);
      if (!mainExists) {
        console.warn(
          `No ${config.withoutSelector} element found in ${link.href}`
        );
        await externalPage.close();
        continue;
      }

      // Extract and clean the content of the specified element from the external page.
      const textContent = await externalPage.evaluate(() => {
        const mainElement: HTMLElement | null = document.querySelector(
          config.withoutSelector
        );

        const attributeWhitelist = config.attributeWhitelist;

        function cleanAttributes(element: Element) {
          for (const attr of Array.from(element.attributes)) {
            if (!attributeWhitelist.includes(attr.name)) {
              element.removeAttribute(attr.name);
            }
          }
        }

        function cleanElement(element: Element) {
          cleanAttributes(element);
          for (const child of element.children) {
            cleanElement(child);
          }
        }

        if (!mainElement) return "";

        cleanElement(mainElement);

        return mainElement.innerHTML;
      });

      const externalTitle = await externalPage.title();

      // Prepare the data to be saved as JSON.
      const jsonData = {
        title: externalTitle,
        url: link.href,
        content: textContent,
      };

      // Construct the file name and save the data in JSON format.
      const fileName = `${externalTitle} - ${link.text}.json`;
      await writeFile(
        `${folderName}/${fileName}`,
        JSON.stringify(jsonData, null, 2)
      );

      await externalPage.close();
    } catch (error) {
      console.error("Error processing external link:", error);
    }
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
