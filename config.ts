import { Config } from "./src/config";

let protocol = "https://www.";
let domain = "builder";
let tld = ".io";
let extra = "/c/docs/developers";
let content = "/c/docs"
let rest = "/**";

export const defaultConfig: Config = {
  url: protocol + domain + tld + extra,
  match: protocol + domain + tld + content + rest,
  maxPagesToCrawl: 50,
  outputFileName: domain + ".json",
};
