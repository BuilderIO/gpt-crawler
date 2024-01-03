import express, {Express} from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import swaggerUi from "swagger-ui-express";
// @ts-ignore
import swaggerDocument from "../swagger-output.json" assert { type: "json" };
import GPTCrawlerCore from "./core.js";
import {mkdirSync} from "fs";
import {randomUUID} from "node:crypto";
import {existsSync} from "node:fs";
import projectService from "./projectService.js";
import {defaultConfig} from "../config";

configDotenv({
  path: `.env.${process.env.NODE_ENV}`
});

type CrawlRequest = {
  url: string
  match: string
  maxPagesToCrawl: number
}

const app: Express = express();
const port = Number(process.env.API_PORT) || 3000;
const hostname = process.env.API_HOST || "localhost";

app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Define a POST route to accept config and run the crawler
app.post("/crawl", async (req, res) => {
  const request = req.body as CrawlRequest
  try {
    const uuid = randomUUID()
    const crawler = new GPTCrawlerCore({
      ...defaultConfig,
      ...request,
      outputFileName: `${uuid}.json`
    });
    crawler.crawl(uuid);
    res.contentType("application/json");
    return res.send({
      data: uuid
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error occurred during crawling", error });
  }
});

app.get('/query/:uuid', async (req, res) => {
  const {uuid} = req.params
  const project = await projectService.getProject(uuid)
  res.send({
    data: project?.state
  })
})

app.get('/query/:uuid/download', async (req, res) => {
  const {uuid} = req.params
  const project = await projectService.getProject(uuid)
  res.download(`data/${project!.outputFile}`)
})

app.listen(port, hostname, () => {
  if (!existsSync('data')) {
    mkdirSync('data')
  }
  console.log(`API server listening at http://${hostname}:${port}`);
});

export default app;
