import { Page } from "playwright";

type Config = {
  /** URL to start the crawl */
  url: string;
  /** Pattern to match against for links on a page to subsequently crawl */
  match: string;
  /** Selector to grab the inner text from */
  selector: string;
  /** Don't crawl more than this many pages */
  maxPagesToCrawl: number;
  /** File name for the finished data */
  outputFileName: string;
  /** Optional cookie to be set. E.g. for Cookie Consent */
  cookie?: { name: string; value: string };
  /** Selector for the area of the page that should be processed. */
  withoutSelector: string;
  /** List of HTML attributes to retain during content processing. */
  attributeWhitelist: string[];
  /** Flag to determine if content links should be crawled. */
  isContentLink: boolean;
  /** Optional function to run for each page found */
  onVisitPage?: (options: {
    page: Page;
    pushData: (data: any) => Promise<void>;
  }) => Promise<void>;
};

export const config: Config = {
  url: "https://react.dev/learn",
  match: "https://react.dev/learn",
  selector: `main`,
  isContentLink: false,
  withoutSelector: `main`,
  attributeWhitelist: ["href", "title"],
  maxPagesToCrawl: 50,
  outputFileName: "nuxt.json",
};
