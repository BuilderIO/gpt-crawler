import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://docs.pinecone.io/docs/langchain",
  match: "https://docs.pinecone.io/docs/langchain/**",
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
};
