import { z } from 'zod';

import type { Page } from "playwright";

const Page: z.ZodType<Page> = z.any();

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
   * Don't crawl more than this many pages
   * @default 50
   */
  maxPagesToCrawl: z.number().int().positive(),
  /**
   * File name for the finished data
   * @default "output.json"
   */
  outputFileName: z.string(),
  /** Optional cookie to be set. E.g. for Cookie Consent */
  cookie: z.object({
    name: z.string(),
    value: z.string(),
  }).optional(),
  /** Optional function to run for each page found */
  onVisitPage: z.function()
      .args(z.object({
        page: Page,
        pushData: z.function()
            .args(z.any())
            .returns(z.promise(z.void()))
      }))
      .returns(z.promise(z.void()))
      .optional(),
  /** Optional timeout for waiting for a selector to appear */
  waitForSelectorTimeout: z.number().int().nonnegative().optional(),


  /** Optional maximum file size in megabytes to include in the output file
   * @example 1
  */
  maxFileSize: z.number().int().positive().optional(),
  /** Optional maximum number tokens to include in the output file 
   * @example 5000
  */
  maxTokens: z.number().int().positive().optional(),
});

export type Config = z.infer<typeof configSchema>;

