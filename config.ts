type Config = {
  url: string;
  match: string;
  selector: string;
  maxPagesToCrawl: number;
  outputFileName: string;
};

export const config = {
  url: "https://forum.builder.io",
  match: "https://forum.builder.io/t/**",
  selector: ".posts-wrapper",
  maxPagesToCrawl: 1000,
  outputFileName: "forum.json",
} satisfies Config;
