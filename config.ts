import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://docs.dopus.com/doku.php?id=scripting",
  match: "https://docs.dopus.com/doku.php?id=scripting**",
  exclude: [
    "**&do=resendpwd**",
    "**&do=register**",
    "**&do=login**",
    "**&do=logout**",
    "**&do=profile**",
    "**&do=edit**",
    "**&do=diff**",
    "**&do=revisions**",
  ],
  maxPagesToCrawl: 75,
  selector: ".page",
  outputFileName: "directory_opus.md",
  outputFileFormat: "markdown",
  maxTokens: 2000000,
};
