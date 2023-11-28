import cliProgress, { MultiBar, SingleBar } from "cli-progress";
import { Config } from "./config";
import { Log, LogLevel, Logger, log } from "crawlee";

// Multi progress bars setup
export const multiBar: MultiBar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    emptyOnZero: true,
    hideCursor: true,
    forceRedraw: true,
    linewrap: true,
    format:
      " {bar} | {name} | {value}/{total} (L: {limit}, F: {found}) | ETA: {eta}s | {url} ",
  },
  cliProgress.Presets.shades_classic,
);

let bars: SingleBar[] = [];
let progressValues: { [id: number]: number } = {};

export function createProgressBar(
  totalValue: number,
  id: number,
  config: Config,
): void {
  const bar = multiBar.create(totalValue, 0, {
    name: config.name,
    limit: config.maxPagesToCrawl,
    found: 0,
    url: "",
  });
  bars[id] = bar;
  progressValues[id] = 0;
}

export function updateTotalProgressBar(id: number, total: number): void {
  bars[id].setTotal(total);
}

export function updateProgressBar(
  id: number,
  increment: number,
  config: Config,
  currentURL: string,
  found?: number,
): void {
  progressValues[id] += increment;
  bars[id].update(progressValues[id], {
    name: config.name,
    limit: config.maxPagesToCrawl,
    found,
    url: currentURL,
  });
}

export function logMessage(message: string): void {
  multiBar.log(`${message}\n`);
}

type LogDataProps = {
  level: LogLevel;
  message: string;
  data: any;
  exception: any;
  opts: any;
};

const logs: LogDataProps[] = [];

class ProgressBarLogger extends Logger {
  constructor(options = {}) {
    super(options);
  }

  override _log(
    level: LogLevel,
    message: string,
    data = {},
    exception = undefined,
    opts = {},
  ) {
    logs.push({ level, message, data, exception, opts });
  }
}

export function getLogs(): LogDataProps[] {
  return logs;
}

/**
 * The logger for progressbar crawler multi-bar.
 */
export const crawlerMultiBarLogger = new Log({
  level: log.LEVELS.INFO,
  logger: new ProgressBarLogger(),
});
