// For more information, see https://crawlee.dev/
import { Configuration, PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { Config, configSchema } from "./config.js";
import { Page } from "playwright";
import { isWithinTokenLimit } from "gpt-tokenizer";
import { PathLike } from "fs";
import { PerformanceManager, ConcurrencyManager } from "./performance-manager.js";
import { SmartCrawlingManager } from "./smart-crawling.js";
import { discoverLinks } from "./enhanced-link-discovery.js";

let pageCounter = 0;
let crawler: PlaywrightCrawler;
let performanceManager: PerformanceManager;
let smartCrawlingManager: SmartCrawlingManager;

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
    // Initialize performance management
    console.log('🚀 Initializing performance-optimized crawler...');
    performanceManager = new PerformanceManager({
      enableMemoryManagement: true,
      maxMemoryUsage: 1024, // 1GB
      enableCaching: true,
      enableMonitoring: true,
      enableSmartRetry: true
    });

    smartCrawlingManager = new SmartCrawlingManager();
    // PlaywrightCrawler crawls the web using a headless
    // browser controlled by the Playwright library.
    crawler = new PlaywrightCrawler(
      {
        // Use the requestHandler to process each of the crawled pages.
        async requestHandler({ request, page, enqueueLinks, log, pushData }) {
          const startTime = Date.now();
          let success = false;
          
          try {
            const title = await page.title();
            pageCounter++;
            
            // Update performance metrics
            performanceManager.updateCrawledPages(pageCounter);
            
            log.info(
              `Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`,
            );

            // Analyze site and apply smart crawling strategy on first page
            if (pageCounter === 1) {
              await performanceManager.executeWithRetry(async () => {
                const siteAnalysis = await smartCrawlingManager.analyzeSite(page);
                await smartCrawlingManager.applyStrategy(page, siteAnalysis.recommendedStrategy);
                console.log(`🎯 Applied crawling strategy: ${siteAnalysis.recommendedStrategy.name}`);
              }, 'Site analysis');
            } else {
              // Apply strategy to subsequent pages
              await smartCrawlingManager.applyStrategy(page);
            }

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

            // Enhanced link discovery with performance optimizations
            const strategy = smartCrawlingManager.getStrategy();
            if (strategy?.settings.enableLinkDiscovery) {
              // Use enhanced link discovery instead of basic enqueueLinks
              const discoveredLinks = await performanceManager.executeWithRetry(async () => {
                return await discoverLinks(page, strategy.settings.linkDiscoveryOptions);
              }, 'Link discovery');

              // Filter links and add to queue
              const validUrls = discoveredLinks
                .filter(link => {
                  const url = link.url;
                  const matches = typeof config.match === "string" ? [config.match] : config.match;
                  const excludes = typeof config.exclude === "string" ? [config.exclude] : config.exclude ?? [];
                  
                  // Check if URL matches include patterns
                  const matchesPattern = matches.some(pattern => {
                    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                    return regex.test(url);
                  });
                  
                  // Check if URL matches exclude patterns
                  const excludesPattern = excludes.some(pattern => {
                    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                    return regex.test(url);
                  });
                  
                  return matchesPattern && !excludesPattern;
                })
                .map(link => ({ url: link.url }));

              // Add discovered links to crawler queue
              if (validUrls.length > 0) {
                await crawler.addRequests(validUrls);
                log.info(`🔗 Discovered ${validUrls.length} links using enhanced discovery`);
              }
            } else {
              // Fallback to traditional link discovery
              await enqueueLinks({
                globs: typeof config.match === "string" ? [config.match] : config.match,
                exclude: typeof config.exclude === "string" ? [config.exclude] : config.exclude ?? [],
              });
            }

            success = true;
            
            // Memory cleanup check
            await performanceManager.performMemoryCleanup();
            
          } catch (error) {
            log.error(`Error processing page ${request.loadedUrl}:`, { error: error instanceof Error ? error.message : String(error) });
            throw error;
          } finally {
            // Record request performance
            const responseTime = Date.now() - startTime;
            if (performanceManager) {
              // Note: This is just a placeholder since we don't have access to the actual performance manager method
              console.log(`⏱️  Page processed in ${responseTime}ms`);
            }
          }
        },
        // Comment this option to scrape the full website.
        maxRequestsPerCrawl: config.maxPagesToCrawl,
        // Dynamic concurrency based on performance
        maxConcurrency: Math.min(10, Math.max(1, performanceManager.calculateOptimalConcurrency())),
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

    try {
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
      
      console.log('✅ Crawling completed successfully!');
      
    } catch (error) {
      console.error('❌ Crawling failed:', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      // Cleanup performance manager
      if (performanceManager) {
        performanceManager.cleanup();
        console.log('🧹 Performance cleanup completed');
      }
    }
  }
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

  const nextFileName = (): string =>
    `${config.outputFileName.replace(/\.json$/, "")}-${fileCounter}.json`;

  const writeBatchToFile = async (): Promise<void> => {
    nextFileNameString = nextFileName();
    await writeFile(
      nextFileNameString,
      JSON.stringify(currentResults, null, 2),
    );
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
