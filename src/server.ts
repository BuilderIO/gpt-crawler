// file: app/src/api.ts

import express from 'express';
import cors from 'cors';
import { readFile, writeFile } from 'fs/promises';
import { crawl, write } from "./core.js";
import { Config } from './config.js';

// Create a new express application instance
const app = express();
const port = 3000; // You may want to make the port configurable

// Enable JSON and file upload functionality
app.use(cors());
app.use(express.json());

// Define a POST route to accept config and run the crawler
app.post('/crawl', async (req, res) => {
    // Read the configuration file sent as form-data
    const config: Config = req.body;

    // Placeholder for handling crawler events and operations
    try {
        await crawl(config);
        await write(config);

        // Read the output file after crawling and send it in the response
        const outputFileContent = await readFile(config.outputFileName, 'utf-8');
        res.contentType('application/json');
        return res.send(outputFileContent);
    } catch (error) {
        return res.status(500).json({ message: 'Error occurred during crawling', error });
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port}`);
});

export default app;
