/**
 * Enhanced Link Discovery for Modern Web Applications
 *
 * This module provides advanced link detection for sites that use:
 * - JavaScript event handlers for navigation
 * - Single Page Applications (SPAs)
 * - Dynamic content loading
 * - Custom navigation patterns
 */

import { Page } from "playwright";

export interface DiscoveredLink {
  url: string;
  text?: string;
  method: "anchor" | "javascript" | "form" | "meta" | "sitemap";
  confidence: number; // 0-1 score of how likely this is a valid navigation link
  element?: string; // CSS selector of the element
}

export interface LinkDiscoveryOptions {
  /** Maximum number of links to discover per page */
  maxLinks?: number;
  /** Minimum confidence score to include a link (0-1) */
  minConfidence?: number;
  /** Whether to click elements to discover dynamic links */
  enableInteraction?: boolean;
  /** Additional URL patterns to look for */
  customPatterns?: RegExp[];
  /** Whether to execute JavaScript to find dynamic links */
  enableJavaScriptAnalysis?: boolean;
  /** Timeout for JavaScript analysis */
  analysisTimeout?: number;
}

/**
 * Discovers all possible navigation links on a page using multiple strategies
 */
export async function discoverLinks(
  page: Page,
  options: LinkDiscoveryOptions = {},
): Promise<DiscoveredLink[]> {
  const {
    maxLinks = 1000,
    minConfidence = 0.3,
    enableInteraction = false,
    customPatterns = [],
    enableJavaScriptAnalysis = true,
    analysisTimeout = 5000,
  } = options;

  const discoveredLinks: DiscoveredLink[] = [];
  const seenUrls = new Set<string>();

  // Strategy 1: Traditional anchor tags
  const anchorLinks = await findAnchorLinks(page);
  for (const link of anchorLinks) {
    if (!seenUrls.has(link.url)) {
      discoveredLinks.push(link);
      seenUrls.add(link.url);
    }
  }

  // Strategy 2: JavaScript event handlers
  if (enableJavaScriptAnalysis) {
    try {
      const jsLinks = await findJavaScriptLinks(page, analysisTimeout);
      for (const link of jsLinks) {
        if (!seenUrls.has(link.url)) {
          discoveredLinks.push(link);
          seenUrls.add(link.url);
        }
      }
    } catch (error) {
      console.warn("JavaScript link analysis failed:", error);
    }
  }

  // Strategy 3: Form actions
  const formLinks = await findFormLinks(page);
  for (const link of formLinks) {
    if (!seenUrls.has(link.url)) {
      discoveredLinks.push(link);
      seenUrls.add(link.url);
    }
  }

  // Strategy 4: Meta tags and structured data
  const metaLinks = await findMetaLinks(page);
  for (const link of metaLinks) {
    if (!seenUrls.has(link.url)) {
      discoveredLinks.push(link);
      seenUrls.add(link.url);
    }
  }

  // Strategy 5: Dynamic content discovery through interaction
  if (enableInteraction) {
    try {
      const dynamicLinks = await findDynamicLinks(page);
      for (const link of dynamicLinks) {
        if (!seenUrls.has(link.url)) {
          discoveredLinks.push(link);
          seenUrls.add(link.url);
        }
      }
    } catch (error) {
      console.warn("Dynamic link discovery failed:", error);
    }
  }

  // Strategy 6: Custom pattern matching
  if (customPatterns.length > 0) {
    const patternLinks = await findPatternLinks(page, customPatterns);
    for (const link of patternLinks) {
      if (!seenUrls.has(link.url)) {
        discoveredLinks.push(link);
        seenUrls.add(link.url);
      }
    }
  }

  // Filter by confidence and limit
  return discoveredLinks
    .filter((link) => link.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxLinks);
}

/**
 * Find traditional anchor tag links
 */
async function findAnchorLinks(page: Page): Promise<DiscoveredLink[]> {
  return await page.evaluate(() => {
    const links: DiscoveredLink[] = [];
    const anchors = document.querySelectorAll("a[href]");

    anchors.forEach((anchor, index) => {
      const href = anchor.getAttribute("href");
      if (!href) return;

      // Resolve relative URLs
      let url: string;
      try {
        url = new URL(href, window.location.href).href;
      } catch {
        return; // Invalid URL
      }

      const text = anchor.textContent?.trim() || "";
      const confidence = calculateAnchorConfidence(
        anchor as HTMLAnchorElement,
        text,
      );

      links.push({
        url,
        text,
        method: "anchor",
        confidence,
        element: `a:nth-of-type(${index + 1})`,
      });
    });

    return links;
  });
}

/**
 * Find links through JavaScript event analysis
 */
async function findJavaScriptLinks(
  page: Page,
  timeout: number,
): Promise<DiscoveredLink[]> {
  return await page.evaluate(() => {
    const links: DiscoveredLink[] = [];

    // Look for elements with click handlers that might navigate
    const clickableElements = document.querySelectorAll(
      "[onclick], [data-href], [data-url], [data-link]",
    );

    clickableElements.forEach((element, index) => {
      // Check for data attributes that suggest navigation
      const dataHref = element.getAttribute("data-href");
      const dataUrl = element.getAttribute("data-url");
      const dataLink = element.getAttribute("data-link");
      const onclick = element.getAttribute("onclick");

      let url: string | null = null;
      let confidence = 0.5;

      if (dataHref) {
        url = dataHref;
        confidence = 0.8;
      } else if (dataUrl) {
        url = dataUrl;
        confidence = 0.8;
      } else if (dataLink) {
        url = dataLink;
        confidence = 0.7;
      } else if (onclick) {
        // Try to extract URL from onclick handler
        const urlMatch = onclick.match(
          /(?:location\.href|window\.location|navigate|goto)\s*=\s*['"`]([^'"`]+)['"`]/i,
        );
        if (urlMatch) {
          url = urlMatch[1];
          confidence = 0.6;
        }
      }

      if (url) {
        try {
          const resolvedUrl = new URL(url, window.location.href).href;
          const text = element.textContent?.trim() || "";

          links.push({
            url: resolvedUrl,
            text,
            method: "javascript",
            confidence,
            element:
              element.tagName.toLowerCase() + `:nth-of-type(${index + 1})`,
          });
        } catch {
          // Invalid URL, skip
        }
      }
    });

    // Look for React Router or similar SPA navigation
    const routerLinks = document.querySelectorAll(
      '[to], [href^="#"], [href^="/"]',
    );
    routerLinks.forEach((element, index) => {
      const to = element.getAttribute("to");
      const href = element.getAttribute("href");

      let path = to || href;
      if (!path) return;

      // Convert to full URL
      try {
        const url = new URL(path, window.location.href).href;
        const text = element.textContent?.trim() || "";

        links.push({
          url,
          text,
          method: "javascript",
          confidence: 0.7,
          element: element.tagName.toLowerCase() + `:nth-of-type(${index + 1})`,
        });
      } catch {
        // Invalid URL, skip
      }
    });

    return links;
  }, timeout);
}

/**
 * Find form action URLs
 */
async function findFormLinks(page: Page): Promise<DiscoveredLink[]> {
  return await page.evaluate(() => {
    const links: DiscoveredLink[] = [];
    const forms = document.querySelectorAll("form[action]");

    forms.forEach((form, index) => {
      const action = form.getAttribute("action");
      if (!action) return;

      try {
        const url = new URL(action, window.location.href).href;
        const method = form.getAttribute("method")?.toUpperCase() || "GET";

        // Only include GET forms as potential navigation
        if (method === "GET") {
          links.push({
            url,
            text: `Form ${index + 1}`,
            method: "form",
            confidence: 0.4,
            element: `form:nth-of-type(${index + 1})`,
          });
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return links;
  });
}

/**
 * Find links in meta tags and structured data
 */
async function findMetaLinks(page: Page): Promise<DiscoveredLink[]> {
  return await page.evaluate(() => {
    const links: DiscoveredLink[] = [];

    // Meta tags
    const metaTags = document.querySelectorAll("meta[content]");
    metaTags.forEach((meta) => {
      const property =
        meta.getAttribute("property") || meta.getAttribute("name");
      const content = meta.getAttribute("content");

      if (!content || !property) return;

      // Look for URL-like meta tags
      if (
        property.includes("url") ||
        property.includes("canonical") ||
        property.includes("og:url") ||
        property.includes("twitter:url")
      ) {
        try {
          const url = new URL(content, window.location.href).href;
          links.push({
            url,
            text: `Meta: ${property}`,
            method: "meta",
            confidence: 0.5,
            element: `meta[property="${property}"], meta[name="${property}"]`,
          });
        } catch {
          // Invalid URL, skip
        }
      }
    });

    // Structured data (JSON-LD)
    const scriptTags = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    scriptTags.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "");
        const urls = extractUrlsFromStructuredData(data);

        urls.forEach((url) => {
          try {
            const resolvedUrl = new URL(url, window.location.href).href;
            links.push({
              url: resolvedUrl,
              text: "Structured Data",
              method: "meta",
              confidence: 0.6,
            });
          } catch {
            // Invalid URL, skip
          }
        });
      } catch {
        // Invalid JSON, skip
      }
    });

    return links;
  });
}

/**
 * Find dynamic links by interacting with the page
 */
async function findDynamicLinks(page: Page): Promise<DiscoveredLink[]> {
  // This is a more advanced technique that would interact with dropdown menus,
  // hover effects, etc. to discover hidden navigation

  // For now, we'll implement a basic version that looks for common patterns
  return await page.evaluate(() => {
    const links: DiscoveredLink[] = [];

    // Look for elements that might reveal links on hover/click
    const potentialContainers = document.querySelectorAll(
      '.menu, .nav, .navigation, .dropdown, [class*="nav"]',
    );

    potentialContainers.forEach((container) => {
      const hiddenLinks = container.querySelectorAll(
        'a[href]:not([style*="display: none"])',
      );
      hiddenLinks.forEach((link, index) => {
        const href = link.getAttribute("href");
        if (href) {
          try {
            const url = new URL(href, window.location.href).href;
            const text = link.textContent?.trim() || "";

            links.push({
              url,
              text,
              method: "javascript",
              confidence: 0.5,
              element: `${container.tagName.toLowerCase()} a:nth-of-type(${
                index + 1
              })`,
            });
          } catch {
            // Invalid URL, skip
          }
        }
      });
    });

    return links;
  });
}

/**
 * Find links using custom regex patterns
 */
async function findPatternLinks(
  page: Page,
  patterns: RegExp[],
): Promise<DiscoveredLink[]> {
  return await page.evaluate(
    (patterns) => {
      const links: DiscoveredLink[] = [];
      const pageText = document.documentElement.innerHTML;

      patterns.forEach((pattern) => {
        const regex = new RegExp(pattern);
        const matches = pageText.match(regex);

        if (matches) {
          matches.forEach((match) => {
            try {
              const url = new URL(match, window.location.href).href;
              links.push({
                url,
                text: "Pattern Match",
                method: "javascript",
                confidence: 0.4,
              });
            } catch {
              // Invalid URL, skip
            }
          });
        }
      });

      return links;
    },
    patterns.map((p) => p.source),
  );
}

/**
 * Calculate confidence score for anchor links
 */
function calculateAnchorConfidence(
  anchor: HTMLAnchorElement,
  text: string,
): number {
  let confidence = 0.9; // Start high for anchor tags

  // Reduce confidence for external links
  if (anchor.hostname !== window.location.hostname) {
    confidence -= 0.2;
  }

  // Reduce confidence for certain patterns
  if (text.toLowerCase().includes("download") || anchor.download) {
    confidence -= 0.3;
  }

  if (anchor.href.includes("mailto:") || anchor.href.includes("tel:")) {
    confidence -= 0.5;
  }

  // Increase confidence for navigation-like text
  const navWords = ["next", "more", "continue", "read", "view", "page"];
  if (navWords.some((word) => text.toLowerCase().includes(word))) {
    confidence += 0.1;
  }

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Extract URLs from structured data
 */
function extractUrlsFromStructuredData(data: any): string[] {
  const urls: string[] = [];

  function traverse(obj: any) {
    if (
      typeof obj === "string" &&
      (obj.startsWith("http") || obj.startsWith("/"))
    ) {
      urls.push(obj);
    } else if (typeof obj === "object" && obj !== null) {
      Object.values(obj).forEach(traverse);
    }
  }

  traverse(data);
  return urls;
}
