import { z } from "zod";

import type { Page } from "playwright";

const Page: z.ZodType<Page> = z.any();

/**
 * Configuration schema for the crawler.
 */
export const configSchema = z.object({
  /**
   * URL to start the crawl
   * @example "https://www.builder.io/c/docs/developers"
   * @default ""
   */
  url: z.string(),
  /**
   * Pattern to match against for links on a page to subsequently crawl
   * @example "https://www.builder.io/c/docs/**"
   * @default ""
   */
  match: z.string().or(z.array(z.string())),

  /**
   * Selector to grab the inner text from
   * @example ".docs-builder-container"
   * @default ""
   */
  selector: z.string().optional(),
  /**
   * Array of selectors to exclude the text from the final result
   * @example [".unwanted-class"]
   * @default []
   */
  excludeSelectors: z.string().or(z.array(z.string())).optional(),
  /**
   * Don't crawl more than this many pages
   * @default 50
   */
  maxPagesToCrawl: z.number().int().positive().default(50),
  /**
   * Maximum concurrency level for crawling pages
   * @default 1
   */
  maxConcurrency: z.number().int().positive().default(1),
  /**
   * File name for the finished data
   * @default "data.json"
   */
  outputFileName: z.string().default("data.json"),
  /**
   * Name of the dataset to be created in the storage/datasets folder
   * @default "default"
   * If you want to create multiple datasets, you should manually set this to something unique
   */
  name: z.string().default("default"),
  /** Optional cookie to be set. E.g. for Cookie Consent */
  cookie: z
    .object({
      name: z.string(),
      value: z.string(),
    })
    .optional(),
  /** Optional function to run for each page found */
  onVisitPage: z
    .function()
    .args(
      z.object({
        page: Page,
        pushData: z.function().args(z.any()).returns(z.promise(z.void())),
      }),
    )
    .returns(z.promise(z.void()))
    .optional(),
  /**
   * Optional timeout for waiting for a selector to appear
   * @default 3000
   */
  waitForSelectorTimeout: z.number().int().nonnegative().default(1000),
});

export type Config = z.infer<typeof configSchema>;
export type ConfigInput = z.input<typeof configSchema>;
