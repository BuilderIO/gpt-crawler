import { defaultConfig } from "../config.js";
import { crawl, write } from "./core.js";
import {randomUUID} from "node:crypto";

const uuid = randomUUID()
await crawl(defaultConfig, uuid);
await write(defaultConfig, uuid);
