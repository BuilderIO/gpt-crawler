import { ConfigInput } from "./src/config.js";

export const defaultConfig: ConfigInput | ConfigInput[] = {
	url: "https://www.builder.io/c/docs/developers",
	match: "https://www.builder.io/c/docs/**",
	selector: ".docs-builder-container",
	excludeSelectors: [],
	maxPagesToCrawl: 50,
	outputFileName: "data.json",
};
