import { ConfigInput } from "./src/config.js";

export const defaultConfig: ConfigInput | ConfigInput[] = {
  url: "https://www.builder.io/c/docs/developers",
  match: "https://www.builder.io/c/docs/**",
  selector: "",
  excludeSelectors: [],
  maxPagesToCrawl: 50,
  outputFileName: "data.json",
};
  outputFileName: "output.json",
};
