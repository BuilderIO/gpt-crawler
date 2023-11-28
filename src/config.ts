import type { Page } from "playwright";
import Joi from "joi";
import { configDotenv } from "dotenv";

configDotenv();

export type Config = {
  /**
   * URL to start the crawl
   * @example "https://www.builder.io/c/docs/developers"
   * @default ""
   */
  url: string;
  /**
   * Pattern to match against for links on a page to subsequently crawl
   * @example "https://www.builder.io/c/docs/**"
   * @default ""
   */
  match: string | string[];
  /**
   * Selector to grab the inner text from
   * @example ".docs-builder-container"
   * @default ""
   */
  selector?: string;
  /**
   * Don't crawl more than this many pages
   * @default 50
   */
  maxPagesToCrawl: number;
  /**
   * File name for the finished data
   * @default "output.json"
   */
  outputFileName: string;
  /** Optional cookie to be set. E.g. for Cookie Consent */
  cookie?: { name: string; value: string };
  /** Optional function to run for each page found */
  onVisitPage?: (options: {
    page: Page;
    pushData: (data: any) => Promise<void>;
  }) => Promise<void>;
  /** Optional timeout for waiting for a selector to appear */
  waitForSelectorTimeout?: number;
};

export const ConfigSchema = Joi.object({
  url: Joi.string().uri().required(),
  match: Joi.alternatives(Joi.string().required(), Joi.array().items(Joi.string().required())).required(),
  selector: Joi.string().default(''),
  maxPagesToCrawl: Joi.number().integer().default(process.env.MAX_PAGES_TO_CRAWL || 50),
  outputFileName: Joi.string().default('output.json'),
  cookie: Joi.object({
    name: Joi.string().required(),
    value: Joi.string().required(),
  }).optional(),
  onVisitPage: Joi.function().optional(),
  waitForSelectorTimeout: Joi.number().optional(),
});
