import { defaultConfig } from "../config.js";
import { ConfigInput, configSchema } from "./config.js";
import { crawl, write } from "./core.js";
import {
  createProgressBar,
  getLogs,
  logMessage,
  multiBar,
} from "./progressBar.js";
import { parallelAsyncMap, toArray } from "./utils.js";

const main = async () => {
  const allConfigs = toArray(defaultConfig).map((config) =>
    configSchema.parse(config),
  );
  allConfigs.forEach((config, index) =>
    createProgressBar(config.maxPagesToCrawl ?? 1000, index, config),
  );

  await parallelAsyncMap(
    allConfigs,
    async (config: ConfigInput, index: number) => {
      await crawl(config, index);
      await write(config);
    },
  );
  multiBar.stop();

  // if you want the logs from the crawler, uncomment the following line.
  // Not sure about the usefullness of this, but it's here if you want it.
  // getLogs().forEach((log) => console.log(log));
};

logMessage("Crawling started.");
await main();
