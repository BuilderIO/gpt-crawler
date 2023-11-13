type Config = {
  url: string;
  match: string;
  selector: string;
  maxPagesToCrawl: number;
  outputFileName: string;
};

export const config = {
  url: "https://github.com/builderio/builder",
  match: "https://github.com/BuilderIO/builder/tree/main/**",
  selector: `#readme,[data-selector="repos-split-pane-content"]`,
  maxPagesToCrawl: 1000,
  outputFileName: "github.json",
} satisfies Config;
