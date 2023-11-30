import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://www.builder.io/c/docs/developers",
  match: "https://www.builder.io/c/docs/**",
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
};


// const treeEndPointUrl = 'https://github.com/BuilderIO/gpt-crawler/tree/main'
// const blobEndPointUrl = 'https://github.com/BuilderIO/gpt-crawler/blob/main'

// export const defaultConfig: Config = {
//   url: "https://github.com/BuilderIO/gpt-crawler/tree/main",
//   match: [
//     {
//       // skip the pattern you do not want to crawl
//       // pattern: "https://github.com/BuilderIO/gpt-crawler/tree/main/**",
//       pattern: `${treeEndPointUrl}/**`,
//       skip: true
//     },
//     {
//       // speical case for .md
//       // for .md, we need to crawl the raw content in the .markdown-body selector
//       // pattern: 'https://github.com/BuilderIO/gpt-crawler/blob/main/**/*.md',
//       pattern: `${blobEndPointUrl}/**/*.md`,
//       selector: '.markdown-body'
//     },
//     {
//       // other files like .js, .ts, .json, etc
//       pattern: `${blobEndPointUrl}/**`,
//       selector: '#read-only-cursor-text-area'
//     },
//   ],
//   maxPagesToCrawl: 50,
//   outputFileName: "output.json",
// };
