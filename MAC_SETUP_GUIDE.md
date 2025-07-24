# Mac Setup Guide for GPT Crawler

This guide helps Mac users successfully install and run GPT Crawler. If you're experiencing browser launch errors or dependency issues, this guide will walk you through the complete setup process.

## Table of Contents

- [Quick Fix (Most Common Solution)](#quick-fix-most-common-solution)
- [Complete Setup Steps](#complete-setup-steps)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Mac-Specific Configuration](#mac-specific-configuration)
- [Advanced Troubleshooting](#advanced-troubleshooting)
- [Getting Help](#getting-help)

## Quick Fix (Most Common Solution)

If you're getting browser launch errors, try this first:

```bash
# Install Playwright browsers with system dependencies
npx playwright install --with-deps

# If that doesn't work, try installing chromium specifically
npx playwright install chromium --with-deps

# Then try running the crawler
npm start
```

**90% of Mac issues are resolved by this step!**

## Complete Setup Steps

### Prerequisites

1. **Node.js 16 or higher**
   ```bash
   # Check your Node version
   node --version
   
   # If you need to install/update Node.js:
   # Option 1: Download from https://nodejs.org/
   # Option 2: Use Homebrew
   brew install node
   
   # Option 3: Use nvm (Node Version Manager)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install node
   nvm use node
   ```

2. **Xcode Command Line Tools** (Required for native dependencies)
   ```bash
   xcode-select --install
   ```

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/builderio/gpt-crawler
   cd gpt-crawler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers** (Critical step for Mac)
   ```bash
   # This installs browsers and system dependencies
   npx playwright install --with-deps
   ```

4. **Verify Playwright installation**
   ```bash
   # Test that browsers can launch
   npx playwright install-deps
   
   # Optional: Run a quick test
   npx playwright test --version
   ```

5. **Configure your crawler**
   ```bash
   # Edit config.ts with your target URL and selectors
   nano config.ts
   ```

6. **Run the crawler**
   ```bash
   npm start
   ```

## Troubleshooting Common Issues

### Issue 1: "Failed to launch browser" Error

**Symptoms:**
```
Failed to launch browser. Please check the following:
• Try installing the required dependencies by running `npx playwright install --with-deps`
browserType.launchPersistentContext: Target page, context or browser has been closed
```

**Solutions:**

1. **Install system dependencies:**
   ```bash
   # Install all required system libraries
   npx playwright install-deps
   
   # Or install for specific browser
   npx playwright install-deps chromium
   ```

2. **Reset Playwright installation:**
   ```bash
   # Remove existing browsers
   rm -rf ~/Library/Caches/ms-playwright
   
   # Reinstall everything
   npx playwright install --with-deps
   ```

3. **Use a different browser:**
   ```typescript
   // In your config.ts, try using webkit instead of chromium
   export const defaultConfig: Config = {
     // ... your other config
     // Add browser-specific options if needed
   };
   ```

### Issue 2: "Library not loaded" / AuthenticationServices Error

**Symptoms:**
```
Library not loaded: /System/Library/Frameworks/AuthenticationServices.framework/Versions/A/AuthenticationServices
Reason: image not found
```

**Solutions:**

1. **Update macOS:**
   ```bash
   # Check your macOS version
   sw_vers
   
   # Update to latest macOS if possible
   # AuthenticationServices requires macOS 10.15+ (Catalina)
   ```

2. **Use older Playwright version (if on older macOS):**
   ```bash
   npm install playwright@1.30.0
   npx playwright install --with-deps
   ```

3. **Force browser download:**
   ```bash
   # Set environment variable to force download
   PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install --with-deps
   ```

### Issue 3: Permission Issues

**Symptoms:**
```
EACCES: permission denied
Error: spawn EACCES
```

**Solutions:**

1. **Fix npm permissions:**
   ```bash
   # Option 1: Use nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install node
   
   # Option 2: Fix npm permissions
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bash_profile
   source ~/.bash_profile
   ```

2. **Fix browser permissions:**
   ```bash
   # Make sure browser binaries are executable
   chmod +x ~/Library/Caches/ms-playwright/*/chrome-mac/Chromium.app/Contents/MacOS/Chromium
   ```

### Issue 4: Network/Proxy Issues

**Symptoms:**
```
Error: net::ERR_TUNNEL_CONNECTION_FAILED
connect ECONNREFUSED 127.0.0.1:51152
```

**Solutions:**

1. **Check corporate proxy:**
   ```bash
   # If you're behind a corporate proxy
   npm config set proxy http://proxy.company.com:8080
   npm config set https-proxy http://proxy.company.com:8080
   
   # Or temporarily disable proxy
   npm config delete proxy
   npm config delete https-proxy
   ```

2. **Disable proxy for Playwright:**
   ```bash
   # Set environment variable
   export NO_PROXY=localhost,127.0.0.1
   npm start
   ```

## Mac-Specific Configuration

### Environment Variables

Add these to your `~/.bash_profile` or `~/.zshrc`:

```bash
# Playwright configuration for Mac
export PLAYWRIGHT_BROWSERS_PATH=~/Library/Caches/ms-playwright
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false

# If you have ARM64 Mac (M1/M2), you might need:
export PLAYWRIGHT_BROWSER_EXECUTABLE_PATH="/opt/homebrew/bin/chromium"
```

### Config.ts Adjustments for Mac

```typescript
export const defaultConfig: Config = {
  url: "https://example.com",
  match: "https://example.com/**",
  selector: "main",
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
  
  // Mac-friendly options
  maxConcurrency: 2, // Lower concurrency for stability
  delay: 1000,       // Add delay between requests
  
  // Browser options that work well on Mac
  onVisitPage: ({page}) => {
    // Set user agent to avoid detection
    page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  }
};
```

## Advanced Troubleshooting

### Debug Mode

Run with debug information:

```bash
# Enable Playwright debug logs
DEBUG=pw:* npm start

# Or just browser logs
DEBUG=pw:browser npm start
```

### Manual Browser Installation

If automatic installation fails:

```bash
# Download browsers manually
npx playwright install chromium
npx playwright install webkit
npx playwright install firefox

# Test each browser
npx playwright open --browser=chromium https://example.com
npx playwright open --browser=webkit https://example.com
npx playwright open --browser=firefox https://example.com
```

### Clean Installation

Complete reset if nothing works:

```bash
# 1. Remove all node modules and caches
rm -rf node_modules
rm -rf package-lock.json
rm -rf ~/Library/Caches/ms-playwright
npm cache clean --force

# 2. Reinstall everything
npm install
npx playwright install --with-deps

# 3. Test with minimal config
npm start
```

### Check System Requirements

```bash
# Check if your system meets requirements
npx playwright install-deps --dry-run

# Check available space (Playwright needs ~200MB per browser)
df -h

# Check memory (recommended 4GB+ available)
vm_stat

# Check CPU architecture
uname -m
```

## Mac Version Compatibility

| macOS Version | Playwright Support | Recommended Version |
|---------------|-------------------|-------------------|
| macOS 13+ (Ventura) | ✅ Full support | Latest Playwright |
| macOS 12 (Monterey) | ✅ Full support | Latest Playwright |
| macOS 11 (Big Sur) | ✅ Good support | Playwright 1.35+ |
| macOS 10.15 (Catalina) | ⚠️ Limited support | Playwright 1.30.x |
| macOS 10.14 (Mojave) | ❌ Not supported | Use Docker instead |

## Docker Alternative (For Older Macs)

If you can't get Playwright working natively:

```bash
# Use the Docker container
cd containerapp
docker build -t gpt-crawler .
docker run -v $(pwd)/data:/app/data gpt-crawler
```

See [containerapp/README.md](containerapp/README.md) for detailed Docker instructions.

## Performance Tips for Mac

1. **Reduce concurrency on older Macs:**
   ```typescript
   maxConcurrency: 1, // For MacBook Air or older machines
   ```

2. **Use webkit instead of chromium:**
   ```typescript
   // Webkit is often more efficient on Mac
   // No code change needed - Playwright will use the best browser
   ```

3. **Monitor memory usage:**
   ```bash
   # Watch memory while crawling
   watch -n 1 'ps aux | grep node'
   ```

4. **Close other applications:**
   - Close unnecessary browser tabs
   - Quit memory-intensive applications
   - Use Activity Monitor to identify resource usage

## Common Error Messages and Fixes

### "Browser executable not found"

```bash
# Solution: Reinstall browsers
npx playwright install --force --with-deps
```

### "Timeout waiting for browser"

```typescript
// Solution: Increase timeouts in config
export const defaultConfig: Config = {
  // ... other config
  timeout: 60000, // Increase to 60 seconds
};
```

### "ENOTDIR: not a directory"

```bash
# Solution: Clear corrupted cache
rm -rf ~/Library/Caches/ms-playwright
npx playwright install --with-deps
```

### "dyld: Library not loaded"

```bash
# Solution: Install/update Xcode command line tools
sudo xcode-select --reset
xcode-select --install
```

## Getting Help

If you're still experiencing issues:

1. **Check the GitHub Issues:**
   - [Mac-related issues](https://github.com/BuilderIO/gpt-crawler/issues?q=is%3Aissue+mac+OR+macos+OR+osx)
   - [Playwright issues](https://github.com/BuilderIO/gpt-crawler/issues?q=is%3Aissue+playwright+OR+browser)

2. **Create a detailed issue report:**
   ```bash
   # Include this information in your issue:
   echo "Node version: $(node --version)"
   echo "npm version: $(npm --version)"
   echo "macOS version: $(sw_vers -productVersion)"
   echo "Architecture: $(uname -m)"
   echo "Playwright version: $(npx playwright --version)"
   ```

3. **Try the community:**
   - [Playwright Discord](https://discord.gg/playwright-807756831384403968)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/playwright)

## Success Checklist

Before running your crawler, verify:

- ✅ Node.js 16+ installed
- ✅ Xcode command line tools installed
- ✅ `npx playwright install --with-deps` completed successfully
- ✅ No permission errors when running npm commands
- ✅ No corporate proxy blocking browser downloads
- ✅ At least 500MB free disk space
- ✅ `npm start` shows "Starting the crawler" message

If all items are checked, you should be ready to crawl! 🚀

---

**Need immediate help?** Try the [Quick Fix](#quick-fix-most-common-solution) at the top of this guide first!
