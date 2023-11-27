import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://www.builder.io/c/docs/developers",
  match: "https://www.builder.io/c/docs/**",
  maxPagesToCrawl: 10,
  pagesPerPagination: 5,
  outputFileName: "output.json",
};
