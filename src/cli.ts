#!/usr/bin/env node

import { program } from "commander";
import { Config } from "../config.js";
import { crawl, write } from "./core.js";
import { createRequire } from "node:module";
import inquirer from "inquirer";

const require = createRequire(import.meta.url);
const { version, description } = require("../../package.json");

async function handler(options: any) {
  try {
    let config: Config = {
      url: options.url,
      match: options.match,
      selector: options.selector,
      maxPagesToCrawl: 50,
      outputFileName: options.outputFileName ?? "output.json",
    };

    if (!config.url || !config.match || !config.selector) {
      const { url, match, selector } = await inquirer
        .prompt([
          {
            type: "input",
            name: "url",
            message: "What is the URL of the website you want to crawl?",
          },
          {
            type: "input",
            name: "match",
            message: "What is the URL pattern you want to match?",
          },
          {
            type: "input",
            name: "selector",
            message: "What is the CSS selector you want to match?",
          },
        ]);

      config.url = url;
      config.match = match;
      config.selector = selector;
    }

    await crawl(config);
    await write(config);
  } catch (error) {
    console.log(error);
  }
}

program
  .version(version)
  .description(description);

program
  .option("-u, --url")
  .option("-m, --match")
  .option("-s, --selector")
  .option("-m, --maxPagesToCrawl")
  .option("-o, --outputFileName")
  .action(handler);

program.parse();
