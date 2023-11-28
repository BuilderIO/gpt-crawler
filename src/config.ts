import { z } from "zod";

import type { Page } from "playwright";

const Page: z.ZodType<Page> = z.any();

/**
 * Configuration schema for the crawler.
 */
export const configSchema = z.object({
	/**
	 * URL to start the crawl
	 * @example "https://www.builder.io/c/docs/developers"
	 * @example "https://www.builder.io/sitemap.xml"
	 */
	url: z.string().min(1),
	/**
	 * Pattern to match against for links on a page to subsequently crawl
	 * @example "https://www.builder.io/c/docs/**"
	 */
	match: z
		.string()
		.min(1)
		.or(z.array(z.string().min(1))),
	/**
	 * Selector to grab the inner text from
	 * @example ".docs-builder-container"
	 */
	selector: z.string().min(1),
	/**
	 * Array of selectors to exclude the text from the final result
	 * @example [".unwanted-class"]
	 * @default []
	 */
	excludeSelectors: z.string().or(z.array(z.string())).optional(),
	/**
	 * Don't crawl more than this many pages
	 * @default 50
	 */
	maxPagesToCrawl: z.number().int().positive().default(50),
	/**
	 * Maximum concurrency level for crawling pages
	 * @default 1
	 */
	maxConcurrency: z.number().int().positive().default(1),
	/**
	 * File name for the finished data
	 * @default "data.json"
	 */
	outputFileName: z.string().default("data.json"),
	/**
	 * Name of the dataset to be created in the storage/datasets folder
	 * @default "default"
	 * If you want to create multiple datasets, you should manually set this to something unique
	 */
	name: z.string().default("default"),
	/** Optional cookie to be set. E.g. for Cookie Consent */
	cookie: z
		.object({
			name: z.string(),
			value: z.string(),
		})
		.optional(),
	/** Optional function to run for each page found */
	onVisitPage: z
		.function()
		.args(
			z.object({
				page: Page,
				pushData: z.function().args(z.any()).returns(z.promise(z.void())),
			}),
		)
		.returns(z.promise(z.void()))
		.optional(),
	/**
	 * Optional timeout for waiting for a selector to appear
	 * @default 3000
	 */
	waitForSelectorTimeout: z.number().int().nonnegative().default(1000),
	/** Optional resources to exclude
	 *
	 * @example
	 * ['png','jpg','jpeg','gif','svg','css','js','ico','woff','woff2','ttf','eot','otf','mp4','mp3','webm','ogg','wav','flac','aac','zip','tar','gz','rar','7z','exe','dmg','apk','csv','xls','xlsx','doc','docx','pdf','epub','iso','dmg','bin','ppt','pptx','odt','avi','mkv','xml','json','yml','yaml','rss','atom','swf','txt','dart','webp','bmp','tif','psd','ai','indd','eps','ps','zipx','srt','wasm','m4v','m4a','webp','weba','m4b','opus','ogv','ogm','oga','spx','ogx','flv','3gp','3g2','jxr','wdp','jng','hief','avif','apng','avifs','heif','heic','cur','ico','ani','jp2','jpm','jpx','mj2','wmv','wma','aac','tif','tiff','mpg','mpeg','mov','avi','wmv','flv','swf','mkv','m4v','m4p','m4b','m4r','m4a','mp3','wav','wma','ogg','oga','webm','3gp','3g2','flac','spx','amr','mid','midi','mka','dts','ac3','eac3','weba','m3u','m3u8','ts','wpl','pls','vob','ifo','bup','svcd','drc','dsm','dsv','dsa','dss','vivo','ivf','dvd','fli','flc','flic','flic','mng','asf','m2v','asx','ram','ra','rm','rpm','roq','smi','smil','wmf','wmz','wmd','wvx','wmx','movie','wri','ins','isp','acsm','djvu','fb2','xps','oxps','ps','eps','ai','prn','svg','dwg','dxf','ttf','fnt','fon','otf','cab']
	 */
	resourceExclusions: z.array(z.string()).optional(),
});

export type Config = z.infer<typeof configSchema>;
export type ConfigInput = z.input<typeof configSchema>;
