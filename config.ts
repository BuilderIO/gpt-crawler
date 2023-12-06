import { Config } from "./src/config";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const startingUrl = "https://www.builder.io/c/docs/developers";
const urlPrefix = "https://";
const domain = "www.builder.io";
const urlSuffix = "/c/docs";
const baseUrl = urlPrefix + domain;
const matchUrl_prefix = baseUrl + urlSuffix;
const matchUrl = matchUrl_prefix + "/**";

// Now date stamp for output file name
const now = new Date();
const date = now.toISOString().split("T")[0];
const time = now.toTimeString().split(" ")[0];
const outputs_dir = __dirname.split("/").slice(0, -1).join("/") + "/outputs";

const outputFileName =
  outputs_dir + "/" + domain + "-" + date + "-" + time + ".json";

export const defaultConfig: Config = {
  url: startingUrl,
  match: matchUrl,
  maxPagesToCrawl: 50,
  outputFileName: outputFileName,
  waitPerPageCrawlTimeoutRange: { min: 1000, max: 1000 },
  headless: true,
  maxConcurrency: 1,
};
