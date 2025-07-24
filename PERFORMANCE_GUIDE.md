# Performance Optimization Guide

This guide helps you optimize GPT Crawler's performance for different types of websites and crawling scenarios. The crawler now includes intelligent performance optimizations that automatically adapt to your target site.

## Table of Contents

- [Automatic Performance Features](#automatic-performance-features)
- [Site Type Detection](#site-type-detection)
- [Performance Configuration](#performance-configuration)
- [Memory Management](#memory-management)
- [Concurrency Optimization](#concurrency-optimization)
- [Troubleshooting Performance Issues](#troubleshooting-performance-issues)
- [Advanced Configuration](#advanced-configuration)

## Automatic Performance Features

GPT Crawler now automatically optimizes itself based on your target website:

### ✨ **Smart Site Detection**
- Automatically detects Single Page Applications (SPAs)
- Identifies API-driven sites
- Recognizes static vs. dynamic content
- Adapts crawling strategy accordingly

### 🔗 **Enhanced Link Discovery**
- Finds JavaScript-driven navigation links
- Discovers hidden menu items and dropdowns
- Detects React Router, Vue Router, and Angular Router links
- Extracts links from data attributes and event handlers

### 🚀 **Adaptive Performance**
- Adjusts concurrency based on site response times
- Manages memory usage automatically
- Implements smart retry logic with exponential backoff
- Optimizes resource loading

### 📊 **Real-time Monitoring**
- Tracks memory usage, response times, and error rates
- Provides performance reports during crawling
- Automatically triggers cleanup when needed

## Site Type Detection

The crawler automatically analyzes your target site and applies the optimal strategy:

### 🔵 **Single Page Applications (SPAs)**
```
Detected: React, Vue, Angular apps
Strategy: Wait for dynamic content, enhanced link discovery, lower concurrency
Example: Modern web apps, dashboards, interactive sites
```

### 🟢 **Static Sites**
```
Detected: Traditional HTML sites
Strategy: Fast crawling, high concurrency, basic link discovery
Example: Documentation sites, blogs, marketing pages
```

### 🟡 **API-Driven Sites**
```
Detected: Sites that load content via AJAX/API
Strategy: Wait for network idle, scroll to load content
Example: News sites, e-commerce, dynamic content platforms
```

### 🟠 **Server-Side Rendered (SSR)**
```
Detected: Next.js, Nuxt.js, SSR apps
Strategy: Balanced approach, moderate concurrency
Example: Next.js apps, server-rendered React/Vue sites
```

## Performance Configuration

### Basic Configuration

The crawler works out of the box with optimal defaults, but you can customize performance:

```typescript
// config.ts
export const defaultConfig: Config = {
  url: "https://example.com",
  match: "https://example.com/**",
  selector: "main",
  maxPagesToCrawl: 100,
  outputFileName: "output.json",
  
  // Performance tuning (optional)
  maxConcurrency: 5,        // Override automatic concurrency
  delay: 1000,              // Delay between requests (ms)
  timeout: 30000,           // Request timeout (ms)
  
  // Memory management
  maxFileSize: 450,         // Max file size (MB)
  maxTokens: 1800000,       // Max tokens per file
};
```

### Site-Specific Optimizations

#### For SPAs (React, Vue, Angular)
```typescript
export const spaConfig: Config = {
  // ... basic config
  maxPagesToCrawl: 50,      // SPAs often have fewer "pages"
  waitForSelectorTimeout: 10000, // Wait longer for dynamic content
  
  // Let the crawler detect and optimize automatically
  // Manual overrides (optional):
  // maxConcurrency: 2,      // Lower concurrency for SPAs
  // delay: 2000,            // More time between requests
};
```

#### For Large Static Sites
```typescript
export const staticConfig: Config = {
  // ... basic config
  maxPagesToCrawl: 1000,    // Can handle more pages
  
  // Manual overrides (optional):
  // maxConcurrency: 8,      // Higher concurrency for static sites
  // delay: 500,             // Faster crawling
};
```

#### For Slow/Complex Sites
```typescript
export const slowSiteConfig: Config = {
  // ... basic config
  waitForSelectorTimeout: 15000,
  
  // Conservative settings
  maxConcurrency: 1,        // One page at a time
  delay: 3000,              // Wait 3 seconds between requests
};
```

## Memory Management

The crawler automatically manages memory, but you can monitor and tune it:

### Automatic Memory Management
- Monitors memory usage in real-time
- Clears caches when memory is high
- Forces garbage collection when available
- Splits large output files automatically

### Memory Configuration
```typescript
// Set memory limits (values in MB)
export const memoryConfig: Config = {
  // ... basic config
  maxFileSize: 300,         // Smaller files = less memory
  maxTokens: 1000000,       // Fewer tokens = less memory
  
  // The crawler will automatically:
  // - Monitor memory usage
  // - Clean up when > 1GB is used
  // - Split files when they get too large
};
```

### Memory Monitoring
Watch the console output for memory reports:
```
Performance Report:
    Runtime: 120s
    Pages crawled: 45
    Pages/second: 0.38
    Memory usage: 678MB ✅
    Requests: 156 (149 success, 7 errors)
    Avg response time: 2341ms
    Cache size: 89
```

## Concurrency Optimization

The crawler automatically adjusts concurrency based on performance:

### How Auto-Concurrency Works
1. **Starts with default concurrency** (3-5 parallel requests)
2. **Monitors response times and error rates**
3. **Increases concurrency** if responses are fast and successful
4. **Decreases concurrency** if responses are slow or errors occur
5. **Caps at reasonable limits** (1-10 concurrent requests)

### Manual Concurrency Control
```typescript
export const customConcurrencyConfig: Config = {
  // ... basic config
  
  // Force specific concurrency (overrides auto-adjustment)
  maxConcurrency: 3,
  
  // Or let it auto-adjust within limits:
  // The crawler will automatically adjust between 1-10
};
```

### Concurrency Guidelines

| Site Type | Recommended Concurrency | Reason |
|-----------|------------------------|--------|
| **SPAs** | 1-3 | Need time for JavaScript to execute |
| **Static Sites** | 5-10 | Can handle many parallel requests |
| **API-Heavy Sites** | 2-4 | Avoid overwhelming API endpoints |
| **Slow Sites** | 1-2 | Prevent timeouts and errors |
| **Fast CDN Sites** | 8-15 | Can handle high concurrency |

## Troubleshooting Performance Issues

### 🐌 **Slow Crawling**

**Problem**: Crawler is very slow
```
Symptoms: 
- Low pages/second rate
- Long response times
- Frequent timeouts
```

**Solutions**:
1. **Check site type detection**:
   ```bash
   # Look for this in the console:
   # "Applied crawling strategy: [Strategy Name]"
   # Make sure it matches your site type
   ```

2. **Increase concurrency** (if appropriate):
   ```typescript
   maxConcurrency: 8, // Try higher for static sites
   ```

3. **Reduce delays**:
   ```typescript
   delay: 500, // Reduce delay between requests
   ```

4. **Optimize selectors**:
   ```typescript
   selector: "article", // Use specific selectors, not "body"
   ```

### 🧠 **High Memory Usage**

**Problem**: Crawler uses too much memory
```
Symptoms:
- Memory usage > 2GB
- System becomes slow
- Out of memory errors
```

**Solutions**:
1. **Reduce file size limits**:
   ```typescript
   maxFileSize: 200,     // Smaller files
   maxTokens: 1000000,   // Fewer tokens
   ```

2. **Lower concurrency**:
   ```typescript
   maxConcurrency: 2,    // Fewer parallel requests
   ```

3. **Exclude large resources**:
   ```typescript
   resourceExclusions: ['pdf', 'zip', 'mp4', 'mp3'], // Skip large files
   ```

### ❌ **High Error Rates**

**Problem**: Many failed requests
```
Symptoms:
- High error count in performance reports
- Many timeout errors
- 403/429 status codes
```

**Solutions**:
1. **Lower concurrency**:
   ```typescript
   maxConcurrency: 1,    // Be more gentle
   ```

2. **Increase delays**:
   ```typescript
   delay: 5000,          // Wait longer between requests
   ```

3. **Increase timeouts**:
   ```typescript
   waitForSelectorTimeout: 30000, // Wait longer for content
   ```

### 🔄 **Stuck on SPAs**

**Problem**: Can't crawl Single Page Applications
```
Symptoms:
- Only crawls first page
- Missing navigation links
- JavaScript errors
```

**Solutions**:
1. **Verify SPA detection**:
   ```bash
   # Look for: "Applied crawling strategy: Single Page Application"
   ```

2. **Increase timeouts**:
   ```typescript
   waitForSelectorTimeout: 15000, // Wait for React/Vue to load
   ```

3. **Use better selectors**:
   ```typescript
   selector: "[data-testid='content']", // Use app-specific selectors
   ```

## Advanced Configuration

### Custom Performance Settings

For advanced users who want full control:

```typescript
export const advancedConfig: Config = {
  url: "https://complex-spa.com",
  match: "https://complex-spa.com/**",
  selector: "main",
  maxPagesToCrawl: 200,
  outputFileName: "output.json",
  
  // Performance fine-tuning
  maxConcurrency: 3,
  delay: 2000,
  waitForSelectorTimeout: 20000,
  
  // Memory management
  maxFileSize: 300,
  maxTokens: 1500000,
  
  // Resource optimization
  resourceExclusions: [
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'css', 'js', 'ico',
    'woff', 'woff2', 'ttf', 'pdf', 'zip', 'mp4', 'mp3'
  ],
  
  // Custom page processing
  onVisitPage: async ({ page, pushData }) => {
    // Wait for custom loading indicators
    try {
      await page.waitForSelector('.content-loaded', { timeout: 10000 });
    } catch {
      // Continue if custom selector not found
    }
    
    // Extract additional data
    const metadata = await page.evaluate(() => {
      return {
        loadTime: performance.now(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    });
    
    await pushData({ metadata });
  }
};
```

### Environment Variables

Control performance via environment variables:

```bash
# Force disable performance optimizations
NO_PERFORMANCE_OPTIMIZATION=true npm start

# Enable garbage collection (Node.js)
node --expose-gc dist/src/main.js

# Increase memory limit
node --max-old-space-size=4096 dist/src/main.js

# Debug performance
DEBUG=performance npm start
```

### Performance Monitoring Script

Create a custom monitoring script:

```typescript
// monitor-performance.ts
import { execSync } from 'child_process';

const monitorCrawl = () => {
  const startTime = Date.now();
  
  const interval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const runtime = (Date.now() - startTime) / 1000;
    
    console.log(`Performance Monitor:
      Runtime: ${runtime}s
      Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB
      Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB
    `);
  }, 10000); // Every 10 seconds
  
  // Stop monitoring when done
  process.on('exit', () => clearInterval(interval));
};

monitorCrawl();
```

## Performance Best Practices

### 🎯 **Do's**
- ✅ Let the crawler auto-detect your site type first
- ✅ Use specific CSS selectors, not `body`
- ✅ Start with small `maxPagesToCrawl` for testing
- ✅ Monitor the console output for performance reports
- ✅ Exclude unnecessary resources (images, videos, etc.)

### ❌ **Don'ts**  
- ❌ Don't set very high concurrency (>10) without testing
- ❌ Don't ignore memory warnings in console output
- ❌ Don't crawl entire large sites at once
- ❌ Don't disable JavaScript for SPAs
- ❌ Don't use tiny delays (<100ms) for slow sites

### 📈 **Performance Tuning Process**

1. **Start with defaults** - Let auto-optimization work
2. **Run a small test** - Try 10-20 pages first
3. **Check the output** - Look for strategy detection and performance reports
4. **Adjust if needed** - Fine-tune based on results
5. **Scale up** - Increase `maxPagesToCrawl` once optimized

---

**Need help with performance?** Check the console output for automatic optimization reports and adjust your configuration based on the recommendations above!
