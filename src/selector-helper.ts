/**
 * Selector Helper Utilities for GPT Crawler
 * 
 * This file provides common selector patterns and guidance for better crawling results.
 * Use these patterns in your config.ts file.
 */

/**
 * Common generic selectors that work well across most websites
 * Try these in order of preference
 */
export const COMMON_SELECTORS = [
  "body",           // Gets everything (good starting point)
  "main",           // Main content area (semantic HTML)
  "article",        // Article content (semantic HTML)
  ".content",       // Generic content class
  ".main-content",  // Main content class
  ".post-content",  // Post/blog content
  ".article-body",  // Article body content
  ".docs-content",  // Documentation content
  ".entry-content", // Entry content (common in CMS)
  ".page-content",  // Page content
  "#content",       // Content by ID
  "[role='main']"   // Main content by ARIA role
];

/**
 * Site-specific selector patterns for popular platforms
 * Use these if you're crawling known platforms
 */
export const SITE_PATTERNS = {
  github: [".markdown-body", "article", ".Box-body"],
  medium: ["article", ".post-content", ".postArticle-content"],
  stackoverflow: [".post-text", ".question .post-text", ".answer .post-text"],
  wordpress: [".entry-content", ".post-content", ".content"],
  wiki: [".mw-parser-output", "#content", ".content"],
  docs: [".docs-content", ".documentation", "main .content"],
  news: [".article-body", ".story-content", "article"],
  blog: [".post-body", ".article-content", ".blog-content"]
};

/**
 * Quick selector suggestions based on content type
 */
export const SELECTOR_SUGGESTIONS = {
  documentation: [
    ".docs-content",
    ".documentation", 
    "main .content",
    "article",
    ".markdown-body"
  ],
  blog: [
    ".post-content",
    ".entry-content", 
    ".article-body",
    "article",
    ".post-body"
  ],
  news: [
    ".article-body",
    ".story-content",
    "article .content",
    ".post-content"
  ],
  ecommerce: [
    ".product-description",
    ".product-details",
    ".product-content",
    ".product-info"
  ],
  generic: [
    "main",
    "article", 
    ".content",
    ".main-content",
    "body"
  ]
};

/**
 * Browser console commands to test selectors
 * Copy and paste these into your browser's developer console
 */
export const CONSOLE_HELPERS = {
  // Test if a selector exists and has content
  testSelector: `
function testSelector(selector) {
  const el = document.querySelector(selector);
  if (!el) return "❌ Selector not found";
  const text = el.innerText || el.textContent || "";
  return {
    found: true,
    textLength: text.length,
    preview: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
    isEmpty: text.trim().length === 0
  };
}
// Usage: testSelector(".content")
`,

  // Test multiple selectors at once
  testMultiple: `
function testSelectors(selectors) {
  return selectors.map(sel => ({
    selector: sel,
    ...testSelector(sel)
  })).filter(r => r.found && !r.isEmpty);
}
// Usage: testSelectors(["main", "article", ".content"])
`,

  // Find common content classes
  findContentClasses: `
function findContentClasses() {
  const classes = [];
  document.querySelectorAll('[class*="content"], [class*="article"], [class*="post"], [class*="main"]').forEach(el => {
    el.className.split(' ').forEach(cls => {
      if (cls.includes('content') || cls.includes('article') || cls.includes('post') || cls.includes('main')) {
        classes.push('.' + cls);
      }
    });
  });
  return [...new Set(classes)];
}
// Usage: findContentClasses()
`
};
