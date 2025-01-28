// For more information, see https://crawlee.dev/
import { Configuration, PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { Config, configSchema } from "./config.js";
import { Page } from "playwright";
import { isWithinTokenLimit } from "gpt-tokenizer";
import { PathLike } from "fs";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { URL } from "url";

let pageCounter = 0;
let crawler: PlaywrightCrawler;

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
    crawler = new PlaywrightCrawler(
      {
        // Use the requestHandler to process each of the crawled pages.
        async requestHandler({ request, page, enqueueLinks, log, pushData }) {
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

          const html = await page.content();
          const dom = new JSDOM(html, { url: request.loadedUrl });
          const reader = new Readability(dom.window.document);
          const article = reader.parse();

          // Create a wrapper for pushData that matches the expected type
          const pushDataWrapper = async (data: any) => {
            await pushData(data);
          };

          // Save results
          await pushDataWrapper({
            title: article?.title || title,
            url: request.loadedUrl,
            content: article?.content || "",
            textContent: article?.textContent || "",
            excerpt: article?.excerpt || "",
            byline: article?.byline || "",
            siteName: article?.siteName || "",
          });

          if (config.onVisitPage) {
            await config.onVisitPage({ page, pushData: pushDataWrapper });
          }

          // Extract links from the current page
          // and add them to the crawling queue.
          await enqueueLinks({
            globs:
              typeof config.match === "string" ? [config.match] : config.match,
            exclude:
              typeof config.exclude === "string"
                ? [config.exclude]
                : config.exclude,
            transformRequestFunction: (req) => {
              // Additional check for excluded query parameters
              if (config.exclude && Array.isArray(config.exclude)) {
                const url = new URL(req.url);
                for (const pattern of config.exclude) {
                  if (typeof pattern === "string" && pattern.includes("&do=")) {
                    const param = pattern.replace(/\*\*/g, "").trim();
                    if (url.search.includes(param)) {
                      return false; // Exclude this URL
                    }
                  }
                }
              }
              return req; // Include this URL
            },
          });
        },
        // Comment this option to scrape the full website.
        maxRequestsPerCrawl: config.maxPagesToCrawl,
        // Uncomment this option to see the browser window.
        // headless: false,
        preNavigationHooks: [
          // Abort requests for certain resource types and add cookies
          async (crawlingContext, _gotoOptions) => {
            const { request, page, log } = crawlingContext;
            // Add cookies to the page
            // Because the crawler has not yet navigated to the page, so the loadedUrl is always undefined. Use the request url instead.
            if (config.cookie) {
              const cookies = (
                Array.isArray(config.cookie) ? config.cookie : [config.cookie]
              ).map((cookie) => {
                return {
                  name: cookie.name,
                  value: cookie.value,
                  url: request.url,
                };
              });
              await page.context().addCookies(cookies);
            }
            const RESOURCE_EXCLUSTIONS = config.resourceExclusions ?? [];
            // If there are no resource exclusions, return
            if (RESOURCE_EXCLUSTIONS.length === 0) {
              return;
            }
            await page.route(
              `**\/*.{${RESOURCE_EXCLUSTIONS.join()}}`,
              (route) => route.abort("aborted"),
            );
            log.info(
              `Aborting requests for as this is a resource excluded route`,
            );
          },
        ],
      },
      new Configuration({
        purgeOnStart: true,
      }),
    );

    const isUrlASitemap = /sitemap.*\.xml$/.test(config.url);

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

interface ToCItem {
  level: number;
  text: string;
  slug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function convertToMarkdown(
  data: Record<string, any>,
  baseUrl: string,
  allUrls: string[],
  includeExtras: boolean,
): { markdown: string; tocItems: ToCItem[] } {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });

  // Custom rule to ensure list items start on a new line
  turndownService.addRule("listItems", {
    filter: "li",
    replacement: function (content) {
      content = content
        .trim()
        .replace(/^\n+/, "") // remove leading newlines
        .replace(/\n+$/, "\n") // replace trailing newlines with just a single one
        .replace(/\n/gm, "\n    "); // indent
      return `\n* ${content}\n`;
    },
  });

  // Custom rule to convert links to local if they exist in allUrls
  turndownService.addRule("links", {
    filter: "a",
    replacement: function (content, node) {
      const element = node as HTMLElement;
      const href = element.getAttribute("href");
      if (href && allUrls.includes(href)) {
        const localSlug = slugify(content);
        return includeExtras
          ? `[${content}](#${localSlug})`
          : `[${content}](${href})`;
      }
      return `[${content}](${href})`;
    },
  });

  const domain = new URL(baseUrl).hostname;
  let markdown = "";
  const tocItems: ToCItem[] = [];

  if (data.isFirstPage && includeExtras) {
    markdown += `# ${domain}\n\n`;
  }

  const slug = slugify(data.title);
  if (includeExtras) {
    tocItems.push({ level: 2, text: data.title, slug });
  }
  markdown += `## ${data.title}${includeExtras ? ` {#${slug}}` : ""}\n\n`;
  if (includeExtras) {
    markdown += `[Back to Top](#table-of-contents)\n\n`;
  }
  markdown += `URL: ${data.url}\n\n`;

  if (data.excerpt) {
    markdown += `${data.excerpt}\n\n`;
  }

  if (data.byline) {
    markdown += `Author: ${data.byline}\n\n`;
  }

  if (data.siteName) {
    markdown += `Site: ${data.siteName}\n\n`;
  }

  // Create a JSDOM instance to parse the HTML content
  const dom = new JSDOM(data.content);
  let content = turndownService.turndown(dom.window.document.body);

  // Collect headers and add "Back to Top" links if includeExtras is true
  content = content.replace(/^(#{2,6}) (.+)$/gm, (_, hashes, title) => {
    const level = hashes.length;
    const slug = slugify(title);
    if (includeExtras) {
      tocItems.push({ level, text: title, slug });
      return `${hashes} ${title} {#${slug}}\n\n[Back to Top](#table-of-contents)\n`;
    }
    return `${hashes} ${title}\n`;
  });

  // Increase heading levels
  content = content.replace(/^# /gm, "### ");
  content = content.replace(/^## /gm, "#### ");
  content = content.replace(/^### /gm, "##### ");
  content = content.replace(/^#### /gm, "###### ");

  // Remove any headings that are now beyond level 6
  content = content.replace(/^#{7,} (.+)$/gm, "***$1***");

  markdown += `${content}\n\n`;
  markdown += "---\n\n";

  return { markdown, tocItems };
}

function generateToC(tocItems: ToCItem[]): string {
  let toc = "## Table of Contents {#table-of-contents}\n\n";

  tocItems.forEach((item) => {
    const indent = "  ".repeat(item.level - 2);
    toc += `${indent}- [${item.text}](#${item.slug})\n`;
  });

  return toc + "\n";
}

export async function write(config: Config) {
  let nextFileNameString: PathLike = "";
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

  const nextFileName = (): string => {
    const baseName = config.outputFileName.replace(/\.[^/.]+$/, ""); // Remove any existing extension
    const extension = config.outputFileFormat === "json" ? "json" : "md";
    if (fileCounter > 1) {
      return `${baseName}-${fileCounter}.${extension}`;
    }
    return `${baseName}.${extension}`;
  };

  const writeBatchToFile = async (): Promise<void> => {
    nextFileNameString = nextFileName();
    if (
      config.outputFileFormat === "markdown" ||
      config.outputFileFormat === "human_readable_markdown"
    ) {
      const reversedResults = currentResults.reverse();
      let allToCItems: ToCItem[] = [];
      let markdownContent = "";

      // Collect all URLs
      const allUrls = reversedResults.map((data) => data.url);

      const includeExtras =
        config.outputFileFormat === "human_readable_markdown";

      reversedResults.forEach((data, index) => {
        const { markdown, tocItems } = convertToMarkdown(
          { ...data, isFirstPage: index === 0 },
          config.url,
          allUrls,
          includeExtras,
        );
        markdownContent += markdown;
        allToCItems = allToCItems.concat(tocItems);
      });

      if (includeExtras) {
        const toc = generateToC(allToCItems);

        // Insert ToC after the primary header
        const primaryHeaderIndex = markdownContent.indexOf("\n\n");
        if (primaryHeaderIndex !== -1) {
          markdownContent =
            markdownContent.slice(0, primaryHeaderIndex + 2) +
            toc +
            markdownContent.slice(primaryHeaderIndex + 2);
        } else {
          markdownContent = toc + markdownContent;
        }
      }

      await writeFile(nextFileNameString, markdownContent);
    } else {
      // For JSON, we'll also reverse the order
      await writeFile(
        nextFileNameString,
        JSON.stringify(currentResults.reverse(), null, 2),
      );
    }
    console.log(
      `Wrote ${currentResults.length} items to ${nextFileNameString}`,
    );
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

  return nextFileNameString;
}

class GPTCrawlerCore {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async crawl() {
    await crawl(this.config);
  }

  async write(): Promise<PathLike> {
    // we need to wait for the file path as the path can change
    return new Promise((resolve, reject) => {
      write(this.config)
        .then((outputFilePath) => {
          resolve(outputFilePath);
        })
        .catch(reject);
    });
  }
}

export default GPTCrawlerCore;
