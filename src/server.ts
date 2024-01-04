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

configDotenv();

const app: Express = express();
const port = Number(process.env.API_PORT) || 3000;
const hostname = process.env.API_HOST || "localhost";

app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Define a POST route to accept config and run the crawler
app.post("/crawl", async (req, res) => {
  const config: Config = req.body;
  try {
    const validatedConfig = configSchema.parse(config);
    const crawler = new GPTCrawlerCore(validatedConfig);
    await crawler.crawl();
    const outputFileName: PathLike = await crawler.write();
    const outputFileContent = await readFile(outputFileName, "utf-8");
    res.contentType("application/json");
    return res.send(outputFileContent);
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
