import { Config } from "./src/config";

// For help with finding good CSS selectors, see SELECTOR_GUIDE.md
export const defaultConfig: Config = {
  url: "https://www.builder.io/c/docs/developers",
  match: "https://www.builder.io/c/docs/**",
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
  maxTokens: 2000000,
  selector: ".docs-builder-container", // See SELECTOR_GUIDE.md for help finding the right selector
};
