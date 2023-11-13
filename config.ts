type Config = {
  url: string;
  glob: string;
  selector: string;
  maxPagesToCrawl: number;
  outputFileName: string;
};

export const config = {
  url: "https://www.builder.io/c/docs/developer",
  glob: "https://www.builder.io/c/docs/*",
  selector: ".docs-builder-container",
  maxPagesToCrawl: 500,
  outputFileName: "output.json",
} satisfies Config;
