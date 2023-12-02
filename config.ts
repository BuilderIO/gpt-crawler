import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://www.builder.io/c/docs/developers",
  match: "https://www.builder.io/c/docs/**",
  selectorexcl: "header,nav,footer,script,style,iframe,svg,button,form,aside",
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
};
