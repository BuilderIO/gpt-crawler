import { defaultConfig } from "../config.js";
import { crawl, write } from "./core.js";

await crawl(defaultConfig);
await write(defaultConfig);
