/**
 * Performance Optimization Module for GPT Crawler
 * 
 * This module provides various performance improvements:
 * - Memory management and garbage collection
 * - Request optimization and caching
 * - Concurrent crawling improvements
 * - Resource usage monitoring
 * - Smart retry logic
 */

import { Page, Browser, BrowserContext } from "playwright";
import { Config } from "./config.js";

export interface PerformanceMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  startTime: number;
  crawledPages: number;
  queueSize: number;
}

export interface PerformanceOptions {
  /** Enable memory monitoring and cleanup */
  enableMemoryManagement?: boolean;
  /** Maximum memory usage before triggering cleanup (MB) */
  maxMemoryUsage?: number;
  /** Enable request caching */
  enableCaching?: boolean;
  /** Cache size limit */
  cacheSize?: number;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Interval for performance logging (ms) */
  monitoringInterval?: number;
  /** Enable smart retry logic */
  enableSmartRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Base retry delay (ms) */
  retryDelay?: number;
}

export class PerformanceManager {
  private metrics: PerformanceMetrics;
  private options: PerformanceOptions;
  private requestCache = new Map<string, any>();
  private responseTimeHistory: number[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private lastCleanupTime = Date.now();

  constructor(options: PerformanceOptions = {}) {
    this.options = {
      enableMemoryManagement: true,
      maxMemoryUsage: 1024, // 1GB default
      enableCaching: true,
      cacheSize: 1000,
      enableMonitoring: true,
      monitoringInterval: 30000, // 30 seconds
      enableSmartRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };

    this.metrics = {
      memoryUsage: process.memoryUsage(),
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      startTime: Date.now(),
      crawledPages: 0,
      queueSize: 0
    };

    if (this.options.enableMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * Optimize browser and context settings for performance
   */
  async optimizeBrowser(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext({
      // Reduce memory usage
      viewport: { width: 1280, height: 720 },
      
      // Disable unnecessary features for headless crawling
      javaScriptEnabled: true, // Keep enabled for SPA support
      
      // Optimize for crawling
      ignoreHTTPSErrors: true,
      
      // Reduce resource usage
      userAgent: 'Mozilla/5.0 (compatible; GPTCrawler/1.0; +https://github.com/BuilderIO/gpt-crawler)',
    });

    // Set up request interception for performance
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();

      // Check cache first
      if (this.options.enableCaching && this.requestCache.has(url)) {
        const cachedResponse = this.requestCache.get(url);
        await route.fulfill(cachedResponse);
        return;
      }

      // Continue with request
      try {
        const startTime = Date.now();
        await route.continue();
        const responseTime = Date.now() - startTime;
        this.recordResponseTime(responseTime);
        this.metrics.successCount++;
      } catch (error) {
        this.metrics.errorCount++;
        throw error;
      }
    });

    return context;
  }

  /**
   * Optimize page settings for performance
   */
  async optimizePage(page: Page, config: Config): Promise<void> {
    // Set up performance monitoring
    page.on('response', (response) => {
      this.metrics.requestCount++;
      
      // Cache successful responses if enabled
      if (this.options.enableCaching && response.status() < 400) {
        const url = response.url();
        if (this.requestCache.size < this.options.cacheSize!) {
          // Store basic response info for caching
          this.requestCache.set(url, {
            status: response.status(),
            headers: response.headers(),
            url: url
          });
        }
      }
    });

    page.on('pageerror', (error) => {
      console.warn('Page error:', error.message);
      this.metrics.errorCount++;
    });

    // Optimize resource loading
    const resourceExclusions = config.resourceExclusions || [
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'css', 'js', 'ico', 
      'woff', 'woff2', 'ttf', 'eot', 'otf', 'mp4', 'mp3', 'webm'
    ];

    if (resourceExclusions.length > 0) {
      await page.route(`**/*.{${resourceExclusions.join(',')}}`, (route) => {
        route.abort();
      });
    }

    // Set reasonable timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  }

  /**
   * Smart retry logic with exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    if (!this.options.enableSmartRetry) {
      return await operation();
    }

    let lastError: any;
    
    for (let attempt = 1; attempt <= this.options.maxRetries!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.metrics.errorCount++;
        
        if (attempt === this.options.maxRetries) {
          console.error(`${context} failed after ${attempt} attempts:`, error);
          throw error;
        }

        // Calculate exponential backoff delay
        const delay = this.options.retryDelay! * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        const totalDelay = delay + jitter;

        console.warn(`${context} failed (attempt ${attempt}), retrying in ${Math.round(totalDelay)}ms:`, error instanceof Error ? error.message : String(error));
        await this.sleep(totalDelay);
      }
    }

    throw lastError;
  }

  /**
   * Memory management and cleanup
   */
  async performMemoryCleanup(): Promise<void> {
    if (!this.options.enableMemoryManagement) return;

    const currentMemory = process.memoryUsage();
    const memoryUsageMB = currentMemory.heapUsed / 1024 / 1024;

    if (memoryUsageMB > this.options.maxMemoryUsage!) {
      console.log(`Memory usage high (${Math.round(memoryUsageMB)}MB), performing cleanup...`);
      
      // Clear cache if it exists
      if (this.requestCache.size > 0) {
        const cacheSize = this.requestCache.size;
        this.requestCache.clear();
        console.log(`Cleared ${cacheSize} cached requests`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('Forced garbage collection');
      }

      this.lastCleanupTime = Date.now();
    }

    this.metrics.memoryUsage = currentMemory;
  }

  /**
   * Dynamic concurrency adjustment based on performance
   */
  calculateOptimalConcurrency(): number {
    const baseConcurrency = 5; // Default concurrency
    let optimalConcurrency = baseConcurrency;

    // Adjust based on memory usage
    const memoryUsageMB = this.metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > this.options.maxMemoryUsage! * 0.8) {
      optimalConcurrency = Math.max(1, Math.floor(baseConcurrency * 0.5));
    }

    // Adjust based on error rate
    const totalRequests = this.metrics.requestCount;
    if (totalRequests > 10) {
      const errorRate = this.metrics.errorCount / totalRequests;
      if (errorRate > 0.1) { // More than 10% error rate
        optimalConcurrency = Math.max(1, Math.floor(optimalConcurrency * 0.7));
      }
    }

    // Adjust based on response time
    if (this.metrics.avgResponseTime > 5000) { // Slow responses
      optimalConcurrency = Math.max(1, Math.floor(optimalConcurrency * 0.8));
    }

    return Math.min(optimalConcurrency, 10); // Cap at 10
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performMemoryCleanup();
      this.logPerformanceMetrics();
    }, this.options.monitoringInterval!);
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(): void {
    const runtime = (Date.now() - this.metrics.startTime) / 1000;
    const pagesPerSecond = this.metrics.crawledPages / runtime;
    const memoryMB = Math.round(this.metrics.memoryUsage.heapUsed / 1024 / 1024);
    
    console.log(`Performance Report:
    Runtime: ${Math.round(runtime)}s
    Pages crawled: ${this.metrics.crawledPages}
    Pages/second: ${pagesPerSecond.toFixed(2)}
    Memory usage: ${memoryMB}MB
    Requests: ${this.metrics.requestCount} (${this.metrics.successCount} success, ${this.metrics.errorCount} errors)
    Avg response time: ${Math.round(this.metrics.avgResponseTime)}ms
    Cache size: ${this.requestCache.size}`);
  }

  /**
   * Record response time for metrics
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimeHistory.push(responseTime);
    
    // Keep only last 100 response times
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory.shift();
    }

    // Calculate average
    this.metrics.avgResponseTime = this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length;
  }

  /**
   * Update crawled pages count
   */
  updateCrawledPages(count: number): void {
    this.metrics.crawledPages = count;
  }

  /**
   * Update queue size
   */
  updateQueueSize(size: number): void {
    this.metrics.queueSize = size;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Cleanup and stop monitoring
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.requestCache.clear();
    this.logPerformanceMetrics();
  }

  /**
   * Utility function for sleeping
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Smart concurrency manager that adjusts based on site performance
 */
export class ConcurrencyManager {
  private currentConcurrency: number;
  private maxConcurrency: number;
  private minConcurrency: number;
  private responseTimeHistory: number[] = [];
  private errorHistory: boolean[] = [];
  private adjustmentInterval: number = 10; // Adjust every 10 requests

  constructor(initialConcurrency: number = 3, maxConcurrency: number = 10) {
    this.currentConcurrency = initialConcurrency;
    this.maxConcurrency = maxConcurrency;
    this.minConcurrency = 1;
  }

  /**
   * Record a request result and potentially adjust concurrency
   */
  recordRequest(responseTime: number, success: boolean): void {
    this.responseTimeHistory.push(responseTime);
    this.errorHistory.push(!success);

    // Keep history manageable
    if (this.responseTimeHistory.length > this.adjustmentInterval) {
      this.responseTimeHistory.shift();
      this.errorHistory.shift();
    }

    // Adjust concurrency if we have enough data
    if (this.responseTimeHistory.length >= this.adjustmentInterval) {
      this.adjustConcurrency();
    }
  }

  /**
   * Adjust concurrency based on recent performance
   */
  private adjustConcurrency(): void {
    const avgResponseTime = this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length;
    const errorRate = this.errorHistory.filter(Boolean).length / this.errorHistory.length;

    let adjustment = 0;

    // If response times are good and no errors, increase concurrency
    if (avgResponseTime < 2000 && errorRate < 0.05) {
      adjustment = 1;
    }
    // If response times are slow or high error rate, decrease concurrency
    else if (avgResponseTime > 5000 || errorRate > 0.2) {
      adjustment = -1;
    }

    if (adjustment !== 0) {
      const newConcurrency = Math.max(
        this.minConcurrency,
        Math.min(this.maxConcurrency, this.currentConcurrency + adjustment)
      );

      if (newConcurrency !== this.currentConcurrency) {
        console.log(`Adjusting concurrency: ${this.currentConcurrency} → ${newConcurrency} (avg response: ${Math.round(avgResponseTime)}ms, error rate: ${Math.round(errorRate * 100)}%)`);
        this.currentConcurrency = newConcurrency;
      }
    }
  }

  /**
   * Get current concurrency level
   */
  getCurrentConcurrency(): number {
    return this.currentConcurrency;
  }
}

/**
 * Resource monitor for tracking crawler resource usage
 */
export class ResourceMonitor {
  private startTime: number;
  private initialMemory: NodeJS.MemoryUsage;

  constructor() {
    this.startTime = Date.now();
    this.initialMemory = process.memoryUsage();
  }

  /**
   * Get current resource usage statistics
   */
  getUsageStats(): {
    runtime: number;
    memoryUsage: NodeJS.MemoryUsage;
    memoryDelta: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  } {
    const currentMemory = process.memoryUsage();
    
    return {
      runtime: Date.now() - this.startTime,
      memoryUsage: currentMemory,
      memoryDelta: {
        rss: currentMemory.rss - this.initialMemory.rss,
        heapTotal: currentMemory.heapTotal - this.initialMemory.heapTotal,
        heapUsed: currentMemory.heapUsed - this.initialMemory.heapUsed,
        external: currentMemory.external - this.initialMemory.external,
        arrayBuffers: (currentMemory as any).arrayBuffers - (this.initialMemory as any).arrayBuffers || 0
      },
      cpuUsage: process.cpuUsage ? process.cpuUsage() : undefined
    };
  }

  /**
   * Check if resource usage is within acceptable limits
   */
  isWithinLimits(maxMemoryMB: number = 2048): boolean {
    const stats = this.getUsageStats();
    const memoryUsageMB = stats.memoryUsage.heapUsed / 1024 / 1024;
    return memoryUsageMB <= maxMemoryMB;
  }
}
