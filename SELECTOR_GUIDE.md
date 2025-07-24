# CSS Selector Guide for GPT Crawler

This guide helps you find effective CSS selectors for crawling content with GPT Crawler. Instead of using overly specific selectors that break easily, learn to identify robust, generic selectors that work reliably across pages.

## Table of Contents

- [Quick Start](#quick-start)
- [Understanding the Problem](#understanding-the-problem)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Advanced Techniques](#advanced-techniques)

## Quick Start

### The Easy Way: Use Generic Selectors

For most use cases, start with these simple, robust selectors:

```typescript
// Get all content on the page
selector: "body"

// Get main content area (works on most modern sites)
selector: "main"

// Get article content (good for blogs and documentation)
selector: "article"

// Get the main content container (common pattern)
selector: ".content, .main-content, #content, main"
```

### The Right Way: Find Content-Specific Selectors

1. **Inspect the page structure** - Right-click → Inspect Element
2. **Look for semantic HTML elements** - `<main>`, `<article>`, `<section>`
3. **Find meaningful class names** - `.content`, `.article-body`, `.docs-container`
4. **Test your selector** - Use browser console: `document.querySelector("your-selector")`

## Understanding the Problem

### ❌ Bad Selectors (Too Specific)

```css
/* This is what you get from "Copy selector" - don't use this! */
#app > div.article-box.grid.container > div:nth-child(2) > div.article-content > div:nth-child(2) > div.normal.system.article-body > p:nth-child(6)
```

**Problems with overly specific selectors:**
- Break when page structure changes
- Only target one specific element
- Include layout-specific details (nth-child, grid classes)
- Difficult to maintain

### ✅ Good Selectors (Generic & Robust)

```css
/* These are more reliable */
.article-body          /* Targets content by meaningful class */
article                /* Uses semantic HTML */
.content               /* Generic content class */
main .text-content     /* Combines semantic + content class */
```

## Best Practices

### 1. Start Simple, Get More Specific If Needed

```typescript
// Try these in order of preference:
selector: "body"                    // Gets everything (good starting point)
selector: "main"                    // Gets main content area
selector: ".content"                // Gets content container
selector: "article .content"        // More specific if needed
```

### 2. Use Semantic HTML Elements

Modern websites use semantic HTML. These are your best friends:

```css
main            /* Main content area */
article         /* Article content */
section         /* Content sections */
.content        /* Common content class name */
.post-content   /* Blog post content */
.docs-content   /* Documentation content */
```

### 3. Look for Meaningful Class Names

Good class names to look for:
- `.content`, `.main-content`, `.page-content`
- `.article`, `.article-body`, `.post-body`
- `.docs`, `.documentation`, `.docs-container`
- `.text`, `.text-content`, `.prose`

### 4. Test Your Selectors

**In the browser console:**
```javascript
// Test if your selector finds content
document.querySelector(".content")

// See what text it would extract
document.querySelector(".content")?.innerText

// Count how many elements it finds
document.querySelectorAll(".content").length
```

## Common Patterns

### Documentation Sites
```typescript
// Common selectors for docs sites
selector: ".docs-content"
selector: ".documentation"
selector: "main .content"
selector: "article"
```

### Blog Posts
```typescript
// Common selectors for blogs
selector: ".post-content"
selector: ".article-body"
selector: "article .content"
selector: ".entry-content"
```

### News Sites
```typescript
// Common selectors for news
selector: ".article-body"
selector: ".story-content"
selector: "article"
selector: ".content"
```

### E-commerce Product Pages
```typescript
// Common selectors for products
selector: ".product-description"
selector: ".product-details"
selector: ".product-content"
```

## Troubleshooting

### Problem: Selector Returns No Content

**Solution:** Your selector is too specific or wrong.

```javascript
// Debug in browser console:
document.querySelector("your-selector")  // Should not be null
```

**Try simpler selectors:**
```typescript
// From most generic to more specific
selector: "body"
selector: "main"
selector: ".content"
selector: "article"
```

### Problem: Selector Returns Too Much Content

**Solution:** Make your selector more specific.

```typescript
// Add more specificity
selector: "main .content"        // Instead of just ".content"
selector: "article .post-body"   // Instead of just ".post-body"
```

### Problem: Content Is Inside Multiple Elements

**Solution:** Use multiple selectors (comma-separated).

```typescript
// This will try each selector and use the first one that exists
selector: "article, .content, main, .post-body"
```

### Problem: JavaScript-Rendered Content Not Loading

**Solution:** Add a wait timeout.

```typescript
{
  selector: ".content",
  waitForSelectorTimeout: 3000  // Wait up to 3 seconds for content
}
```

## Advanced Techniques

### 1. Using XPath (Alternative to CSS)

GPT Crawler also supports XPath selectors:

```typescript
// XPath selector (starts with "/")
selector: "//article//div[contains(@class, 'content')]"
selector: "//main"
selector: "//*[contains(@class, 'post-body')]"
```

### 2. Combining Multiple Approaches

```typescript
// Use fallback selectors
selector: "article .content, .post-body, .article-body, main"
```

### 3. Excluding Unwanted Elements

Use CSS `:not()` pseudo-selector:

```typescript
// Get content but exclude navigation
selector: "main :not(nav):not(.sidebar)"
```

### 4. Targeting Specific Content Types

```typescript
// Only get paragraphs and headings
selector: "article p, article h1, article h2, article h3"

// Get content but exclude code blocks
selector: ".content :not(pre):not(code)"
```

## How to Find the Right Selector

### Step 1: Inspect the Page Structure
1. Right-click on the content you want to crawl
2. Select "Inspect Element"
3. Look at the HTML structure

### Step 2: Identify Patterns
Look for:
- Semantic HTML tags (`<main>`, `<article>`, `<section>`)
- Meaningful class names (`.content`, `.article-body`)
- Container elements that wrap the content

### Step 3: Test Different Options
```javascript
// Test in browser console:
document.querySelector("main")?.innerText?.substring(0, 100)
document.querySelector(".content")?.innerText?.substring(0, 100)
document.querySelector("article")?.innerText?.substring(0, 100)
```

### Step 4: Choose the Most Stable Option
Pick the selector that:
- ✅ Gets all the content you want
- ✅ Doesn't get content you don't want
- ✅ Uses semantic or meaningful class names
- ✅ Is simple and not overly specific

## Examples from Popular Sites

### GitHub Documentation
```typescript
selector: ".markdown-body"
// or
selector: "article"
```

### Medium Articles
```typescript
selector: "article"
// or
selector: ".post-content"
```

### Stack Overflow
```typescript
selector: ".post-text"
// or for questions
selector: ".question .post-text"
```

### WordPress Blogs
```typescript
selector: ".entry-content"
// or
selector: ".post-content"
```

## Quick Reference

| Content Type | Try These Selectors |
|-------------|-------------------|
| **Any Site** | `body`, `main`, `.content` |
| **Blog Posts** | `article`, `.post-content`, `.entry-content` |
| **Documentation** | `.docs-content`, `main`, `article` |
| **News Articles** | `article`, `.article-body`, `.story-content` |
| **Product Pages** | `.product-description`, `.product-details` |
| **Wiki Pages** | `.mw-parser-output`, `.content`, `#content` |

## Need Help?

If you're still having trouble:

1. **Start with `body`** - This always works but gets everything
2. **Try `main`** - Most modern sites use this for main content
3. **Use browser dev tools** - Test selectors in the console
4. **Look for semantic HTML** - `<article>`, `<section>`, `<main>`
5. **Check class names** - Look for words like "content", "article", "post"

Remember: It's better to get too much content than none at all. You can always clean up the data later!