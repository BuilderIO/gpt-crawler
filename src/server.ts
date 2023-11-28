import express from 'express';
import cors from 'cors';
import { readFile } from 'fs/promises';
import { crawl, write } from "./core.js";
import { Config } from './config.js';
import { configDotenv } from 'dotenv';

configDotenv();

const app = express();
const port = Number(process.env.API_PORT) || 3000;
const hostname = process.env.API_HOST || 'localhost';

app.use(cors());
app.use(express.json());

// Define a POST route to accept config and run the crawler
app.post('/crawl', async (req, res) => {
    const config: Config = req.body;
    try {
        await crawl(config);
        await write(config);
        const outputFileContent = await readFile(config.outputFileName, 'utf-8');
        res.contentType('application/json');
        return res.send(outputFileContent);
    } catch (error) {
        return res.status(500).json({ message: 'Error occurred during crawling', error });
    }
});

app.listen(port, hostname, () => {
    console.log(`API server listening at http://${hostname}:${port}`);
});

export default app;
