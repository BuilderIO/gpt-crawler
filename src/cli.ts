#!/usr/bin/env node

import { program } from "commander";
import { createRequire } from "node:module";
import inquirer from "inquirer";

import { crawl, write } from "./core.js";
import { Config, ConfigInput } from "./config.js";

const require = createRequire(import.meta.url);
const { version, description } = require("../../package.json");

const messages = {
	url: "What is the first URL of the website you want to crawl?",
	match: "What is the URL pattern you want to match?",
	selector: "What is the CSS selector you want to match?",
	excludeSelectors: "What is the CSS selector you want to exclude?",
	maxPagesToCrawl: "How many pages do you want to crawl?",
	outputFileName: "What is the name of the output file?",
	name: "What is the name of the dataset?",
};

async function handler(options: ConfigInput) {
	try {
		const {
			url,
			match,
			selector,
			excludeSelectors,
			maxPagesToCrawl: maxPagesToCrawlStr,
			name,
			outputFileName,
		} = options;

		// @ts-ignore
		const maxPagesToCrawl = parseInt(maxPagesToCrawlStr, 10);

		let config: ConfigInput = {
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

			if (!config.excludeSelectors) {
				questions.push({
					type: "input",
					name: "excludeSelectors",
					message: messages.excludeSelectors,
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
	.option("-x, --excludeSelectors <string...>", messages.excludeSelectors, "")
	.option("-l, --maxPagesToCrawl <number>", messages.maxPagesToCrawl, "50")
	.option("-o, --outputFileName <string>", messages.outputFileName, "data.json")
	.option("-n, --name <string>", messages.name, "default")
	.action(handler);

program.parse();
