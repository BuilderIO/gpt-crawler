#!/usr/bin/env node

import { program } from "commander";
import { Config } from "./config.js";
import { crawl, write } from "./core.js";
import { createRequire } from "node:module";
import inquirer from "inquirer";

const require = createRequire(import.meta.url);
const { version, description } = require("../../package.json");

const messages = {
  url: "What is the first URL of the website you want to crawl?",
  match: "What is the URL pattern you want to match?",
  selector: "What is the CSS selector you want to match?",
  maxPagesToCrawl: "How many pages do you want to crawl?",
  outputFileName: "What is the name of the output file?",
};

async function handler(options: Config) {
  try {
    const {
      url,
      match,
      selector,
      maxPagesToCrawl: maxPagesToCrawlStr,
      outputFileName,
    } = options;

    // @ts-ignore
    const maxPagesToCrawl = parseInt(maxPagesToCrawlStr, 10);

    let config: Config = {
      url,
      match,
      selector,
      maxPagesToCrawl,
      outputFileName,
    };

    if (!config.url || !config.match || !config.selector) {
      const questions = [];

      if (!config.url) {
        questions.push({
          type: "input",
          name: "url",
          message: messages.url,
        });
      }

      if (!config.match) {
        questions.push({
          type: "input",
          name: "match",
          message: messages.match,
        });
      }

      if (!config.selector) {
        questions.push({
          type: "input",
          name: "selector",
          message: messages.selector,
        });
      }

      const answers = await inquirer.prompt(questions);

      config = {
        ...config,
        ...answers,
      };
    }

    await crawl(config);
    await write(config);
  } catch (error) {
    console.log(error);
  }
}

program.version(version).description(description);

program
  .option("-u, --url <string>", messages.url, "")
  .option("-m, --match <string>", messages.match, "")
  .option("-s, --selector <string>", messages.selector, "")
  .option("-m, --maxPagesToCrawl <number>", messages.maxPagesToCrawl, "50")
  .option(
    "-o, --outputFileName <string>",
    messages.outputFileName,
    "output.json",
  )
  .action(handler);

program.parse();
