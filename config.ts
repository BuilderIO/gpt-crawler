import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://https://sintra.ai/vizzy",
  match: "https://www.builder.io/c/docs/**",
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
  maxTokens: 2000000,
};
