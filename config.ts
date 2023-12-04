import { Config } from "./src/config";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const starting_url = "https://www.builder.io/c/docs/developers";
const url_prefix = "https://"
const domain = "www.builder.io";
const url_suffix = "/c/docs";
const base_url = url_prefix + domain;
const match_url_prefix = base_url + url_suffix;
const match_url = match_url_prefix + "/**";

// Now date stamp for output file name
const now = new Date();
const date = now.toISOString().split('T')[0];
const time = now.toTimeString().split(' ')[0];
const outputs_dir = __dirname.split('/').slice(0, -1).join('/') + '/outputs';

const outputFileName = outputs_dir + "/" + domain + "-" + date + "-" + time + ".json";

export const defaultConfig: Config = {
  url: "https://www.builder.io/c/docs/developers",
  match: "https://www.builder.io/c/docs/**",
  maxPagesToCrawl: 50,
  maxConcurrency: 1,
};
