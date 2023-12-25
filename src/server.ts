import express from 'express';
import cors from 'cors';
import { readFile } from 'fs/promises';
import { crawl, write } from "./core.js";
import { Config, ConfigSchema } from './config.js';
import { configDotenv } from 'dotenv';
import swaggerUi from 'swagger-ui-express';
// @ts-ignore
import swaggerDocument from '../swagger-output.json' assert { type: 'json' };

configDotenv();

const app = express();
const port = Number(process.env.API_PORT) || 3000;
const hostname = process.env.API_HOST || 'localhost';

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Define a POST route to accept config and run the crawler
app.post('/crawl', async (req, res) => {
    const config: Config = req.body;
    try {
        const validatedConfig = ConfigSchema.validate(config).value;
        await crawl(validatedConfig);
        await write(validatedConfig);
        const outputFileContent = await readFile(validatedConfig.outputFileName, 'utf-8');
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
