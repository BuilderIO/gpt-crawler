import express, { Express } from "express";
import cors from "cors";
import { readFile } from "fs/promises";
import { Config, configSchema } from "./config.js";
import { configDotenv } from "dotenv";
import swaggerUi from "swagger-ui-express";
// @ts-ignore
import swaggerDocument from "../swagger-output.json" assert { type: "json" };
import GPTCrawlerCore from "./core.js";
import { PathLike } from "fs";
import path from 'path';

configDotenv();

const app: Express = express();
const port = Number(process.env.API_PORT) || 3000;
const hostname = process.env.API_HOST || "localhost";

app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Add this line to serve static files
app.use('/static', express.static(path.join(process.cwd(), 'local_xmls')));

// Define a POST route to accept config and run the crawler
app.post("/crawl", async (req, res) => {
  const config: Config = req.body;
  try {
    const validatedConfig = configSchema.parse(config);
    const crawler = new GPTCrawlerCore(validatedConfig);
    await crawler.crawl();
    const outputFileNames = await crawler.write();

    // Read all output files and combine their content
    const outputContents = await Promise.all(
      outputFileNames.map((fileName) => readFile(fileName, "utf-8")),
    );

    res.contentType("application/json");
    return res.send(outputContents.join("\n\n"));
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error occurred during crawling", error });
  }
});

app.listen(port, hostname, () => {
  console.log(`API server listening at http://${hostname}:${port}`);
});

export default app;
