import { z } from "zod";

import type { Page } from "playwright";

const Page: z.ZodType<Page> = z.any();

export const configSchema = z.object({
  /**
   * URL to start the crawl, if url is a sitemap, it will crawl all pages in the sitemap
   * @example "https://www.builder.io/c/docs/developers"
   * @example "https://www.builder.io/sitemap.xml"
   * @default ""
   * @required
   */
  url: z.string(),
  /**
   * Pattern to match against for links on a page to subsequently crawl
   * @example "https://www.builder.io/c/docs/**"
   * @default ""
   * @required
   */
  match: z.string().or(z.array(z.string())),
  /**
   * Selector to grab the inner text from
   * @example ".docs-builder-container"
   * @default ""
   */
  selector: z.string().optional(),
  /**
   * Don't crawl more than this many pages
   * @default 50
   */
  maxPagesToCrawl: z.number().int().nonnegative().or(z.undefined()).optional(),
  /**
   * File name for the finished data
   * @example "output.json"
   */
  outputFileName: z.string(),
  /**
   * Cookie to be set. E.g. for Cookie Consent
   */
  cookie: z
    .object({
      name: z.string(),
      value: z.string(),
    })
    .optional(),
  /**
   * Function to run for each page found
   */
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
   *  Resources to exclude
   * @example
   * ['png','jpg','jpeg','gif','svg','css','js','ico','woff','woff2','ttf','eot','otf','mp4','mp3','webm','ogg','wav','flac','aac','zip','tar','gz','rar','7z','exe','dmg','apk','csv','xls','xlsx','doc','docx','pdf','epub','iso','dmg','bin','ppt','pptx','odt','avi','mkv','xml','json','yml','yaml','rss','atom','swf','txt','dart','webp','bmp','tif','psd','ai','indd','eps','ps','zipx','srt','wasm','m4v','m4a','webp','weba','m4b','opus','ogv','ogm','oga','spx','ogx','flv','3gp','3g2','jxr','wdp','jng','hief','avif','apng','avifs','heif','heic','cur','ico','ani','jp2','jpm','jpx','mj2','wmv','wma','aac','tif','tiff','mpg','mpeg','mov','avi','wmv','flv','swf','mkv','m4v','m4p','m4b','m4r','m4a','mp3','wav','wma','ogg','oga','webm','3gp','3g2','flac','spx','amr','mid','midi','mka','dts','ac3','eac3','weba','m3u','m3u8','ts','wpl','pls','vob','ifo','bup','svcd','drc','dsm','dsv','dsa','dss','vivo','ivf','dvd','fli','flc','flic','flic','mng','asf','m2v','asx','ram','ra','rm','rpm','roq','smi','smil','wmf','wmz','wmd','wvx','wmx','movie','wri','ins','isp','acsm','djvu','fb2','xps','oxps','ps','eps','ai','prn','svg','dwg','dxf','ttf','fnt','fon','otf','cab']
   */
  resourceExclusions: z.array(z.string()).optional(),
  /**
   * Maximum file size in megabytes to include in the output file
   * @example 1
   */
  maxFileSize: z.number().int().positive().optional(),
  /**
   * The maximum number tokens to include in the output file
   * @example 5000
   */
  maxTokens: z.number().int().positive().optional(),
  /**
   * Maximum concurent parellel requets at a time Maximum concurent parellel requets at a time
   * @example
   * Specific number of parellel requests
   * ```ts
   * maxConcurrency: 2;
   * ```
   * @example
   *  0 = Unlimited, Doesn't stop until cancelled
   * text outside of the code block as regular text.
   * ```ts
   * maxConcurrency: 0;
   * ```
   * @example
   * undefined = max parellel requests possible
   * ```ts
   * maxConcurrency: undefined;
   * ```
   * @default 1
   */
  maxConcurrency: z.number().int().nonnegative().optional(),
  /**
   * Range for random number of milliseconds between **min** and **max** to wait after each page crawl
   * @default {min:1000,max:1000}
   * @example {min:1000,max:2000}
   */
  waitForSelectorTimeout: z.number().int().nonnegative().optional(),
  waitPerPageCrawlTimeoutRange: z
    .object({
      min: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
    })
    .optional(),
  /**
   * Headless mode
   * @default true
   */
  headless: z.boolean().optional(),
});

export type Config = z.infer<typeof configSchema>;
