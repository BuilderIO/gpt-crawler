import { Config } from "../config.js";
import { crawl, write } from "./core.js";

const hardcodedConfig: Config = {
  url: "https://www.builder.io/c/docs/developers",
  match: "https://www.builder.io/c/docs/**",
  selector: `.docs-builder-container`,
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
};

await crawl(hardcodedConfig);
await write(hardcodedConfig);
