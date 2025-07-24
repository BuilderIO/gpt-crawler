import { Configuration, PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { Config, configSchema } from "./config.js";
import { Page } from "playwright";
import { isWithinTokenLimit } from "gpt-tokenizer";
import { PathLike } from "fs";
import { splitJSONFile, analyzeContent, CHATGPT_LIMITS } from "./file-splitter.js";

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
            exclude:
              typeof config.exclude === "string"
                ? [config.exclude]
                : config.exclude ?? [],
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

export async function write(config: Config) {
  let nextFileNameString: PathLike = "";
  const jsonFiles = await glob("storage/datasets/default/*.json", {
    absolute: true,
  });

  console.log(`Found ${jsonFiles.length} files to combine...`);

  // Collect all crawled data
  const allResults: Record<string, any>[] = [];
  
  // Read and combine all JSON files
  for (const file of jsonFiles) {
    const fileContent = await readFile(file, "utf-8");
    const data: Record<string, any> = JSON.parse(fileContent);
    allResults.push(data);
  }

  if (allResults.length === 0) {
    console.log("No data to write");
    return config.outputFileName;
  }

  // First, write the combined file
  const outputFileName = config.outputFileName;
  const combinedContent = JSON.stringify(allResults, null, 2);
  await writeFile(outputFileName, combinedContent);
  
  console.log(`Wrote ${allResults.length} items to ${outputFileName}`);

  // Analyze the file to see if it needs splitting
  const analysis = analyzeContent(allResults);
  
  // Check if file exceeds ChatGPT limits or user-specified limits
  const exceedsTokenLimit = config.maxTokens && analysis.estimatedTokens > config.maxTokens;
  const exceedsSizeLimit = config.maxFileSize && analysis.fileSizeBytes > (config.maxFileSize * 1024 * 1024);
  const exceedsChatGPTLimits = analysis.estimatedTokens > CHATGPT_LIMITS.MAX_TOKENS_PER_FILE || 
                              analysis.fileSizeBytes > CHATGPT_LIMITS.MAX_BYTES_PER_FILE;

  if (exceedsTokenLimit || exceedsSizeLimit || exceedsChatGPTLimits) {
    console.log(`\n📊 File Analysis:`);
    console.log(`   Items: ${allResults.length.toLocaleString()}`);
    console.log(`   Estimated tokens: ${analysis.estimatedTokens.toLocaleString()}`);
    console.log(`   File size: ${analysis.fileSizeMB.toFixed(1)} MB`);
    
    if (exceedsChatGPTLimits) {
      console.log(`   ⚠️  File exceeds ChatGPT limits - splitting automatically...`);
    } else {
      console.log(`   ⚠️  File exceeds your configured limits - splitting...`);
    }

    // Use our enhanced file splitter
    const splitResult = await splitJSONFile(outputFileName, {
      maxTokensPerFile: config.maxTokens || CHATGPT_LIMITS.RECOMMENDED_TOKENS_PER_FILE,
      maxBytesPerFile: config.maxFileSize ? config.maxFileSize * 1024 * 1024 : CHATGPT_LIMITS.RECOMMENDED_BYTES_PER_FILE,
      maxFiles: CHATGPT_LIMITS.MAX_FILES_PER_GPT
    });

    if (splitResult.success && splitResult.outputFiles.length > 0) {
      console.log(`✅ Successfully split into ${splitResult.outputFiles.length} files:`);
      splitResult.outputFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.filename}: ${file.itemCount} items, ${file.estimatedTokens.toLocaleString()} tokens, ${file.fileSizeMB.toFixed(1)} MB`);
      });
      
      if (splitResult.warnings.length > 0) {
        console.log(`⚠️  Warnings:`);
        splitResult.warnings.forEach(warning => console.log(`   • ${warning}`));
      }
      
      console.log(`\n💡 Upload tip: You can upload up to ${CHATGPT_LIMITS.MAX_FILES_PER_GPT} files to a single ChatGPT.`);
      
      // Return the first split file name for backward compatibility
      nextFileNameString = splitResult.outputFiles[0].path;
    } else {
      console.log(`❌ Failed to split file: ${splitResult.summary}`);
      nextFileNameString = outputFileName;
    }
  } else {
    console.log(`✅ File is within limits - no splitting needed`);
    console.log(`   Items: ${allResults.length.toLocaleString()}, Tokens: ${analysis.estimatedTokens.toLocaleString()}, Size: ${analysis.fileSizeMB.toFixed(1)} MB`);
    nextFileNameString = outputFileName;
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
