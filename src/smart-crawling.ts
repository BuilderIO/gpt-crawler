/**
 * Smart Crawling Strategies for Modern Web Applications
 *
 * This module detects different types of websites and applies
 * appropriate crawling strategies:
 * - Single Page Applications (SPAs)
 * - Server-side rendered sites
 * - Dynamic content sites
 * - API-driven sites
 */

import { Page } from "playwright";
import { Config } from "./config.js";
import {
  discoverLinks,
  LinkDiscoveryOptions,
} from "./enhanced-link-discovery.js";

export interface SiteAnalysis {
  siteType: "spa" | "ssr" | "static" | "api-driven" | "unknown";
  confidence: number;
  characteristics: {
    hasReactRouter: boolean;
    hasVueRouter: boolean;
    hasAngularRouter: boolean;
    hasNextJS: boolean;
    hasAjaxNavigation: boolean;
    hasDynamicContent: boolean;
    hasAPIEndpoints: boolean;
    hasServiceWorker: boolean;
  };
  recommendedStrategy: CrawlingStrategy;
}

export interface CrawlingStrategy {
  name: string;
  description: string;
  settings: {
    enableJavaScript: boolean;
    waitForNetworkIdle: boolean;
    enableLinkDiscovery: boolean;
    linkDiscoveryOptions: LinkDiscoveryOptions;
    navigationTimeout: number;
    scrollToLoadContent: boolean;
    waitForDynamicContent: boolean;
    maxConcurrency: number;
    delayBetweenRequests: number;
  };
}

export class SmartCrawlingManager {
  private siteAnalysis?: SiteAnalysis;
  private currentStrategy?: CrawlingStrategy;

  /**
   * Analyze a website to determine the best crawling strategy
   */
  async analyzeSite(page: Page): Promise<SiteAnalysis> {
    console.log("Analyzing site structure and technology stack...");

    const characteristics = await this.detectSiteCharacteristics(page);
    const siteType = this.determineSiteType(characteristics);
    const confidence = this.calculateConfidence(siteType, characteristics);
    const recommendedStrategy = this.getStrategyForSiteType(siteType);

    this.siteAnalysis = {
      siteType,
      confidence,
      characteristics,
      recommendedStrategy,
    };

    console.log(`Site analysis complete:
    Type: ${siteType} (confidence: ${Math.round(confidence * 100)}%)
    Framework: ${
      this.getDetectedFrameworks(characteristics).join(", ") || "None detected"
    }
    Strategy: ${recommendedStrategy.name}`);

    return this.siteAnalysis;
  }

  /**
   * Get the current crawling strategy
   */
  getStrategy(): CrawlingStrategy | undefined {
    return this.currentStrategy || this.siteAnalysis?.recommendedStrategy;
  }

  /**
   * Apply the recommended strategy to a page
   */
  async applyStrategy(page: Page, strategy?: CrawlingStrategy): Promise<void> {
    const targetStrategy = strategy || this.getStrategy();
    if (!targetStrategy) {
      console.warn("No crawling strategy available, using default settings");
      return;
    }

    this.currentStrategy = targetStrategy;
    console.log(`Applying crawling strategy: ${targetStrategy.name}`);

    // Configure page timeouts
    page.setDefaultTimeout(targetStrategy.settings.navigationTimeout);
    page.setDefaultNavigationTimeout(targetStrategy.settings.navigationTimeout);

    // Wait for network idle if required
    if (targetStrategy.settings.waitForNetworkIdle) {
      try {
        await page.waitForLoadState("networkidle", { timeout: 10000 });
      } catch (error) {
        console.warn("Network idle timeout, continuing...");
      }
    }

    // Scroll to load dynamic content if required
    if (targetStrategy.settings.scrollToLoadContent) {
      await this.scrollToLoadContent(page);
    }

    // Wait for dynamic content if required
    if (targetStrategy.settings.waitForDynamicContent) {
      await this.waitForDynamicContent(page);
    }
  }

  /**
   * Detect site characteristics by analyzing the page
   */
  private async detectSiteCharacteristics(
    page: Page,
  ): Promise<SiteAnalysis["characteristics"]> {
    return await page.evaluate(() => {
      const characteristics = {
        hasReactRouter: false,
        hasVueRouter: false,
        hasAngularRouter: false,
        hasNextJS: false,
        hasAjaxNavigation: false,
        hasDynamicContent: false,
        hasAPIEndpoints: false,
        hasServiceWorker: false,
      };

      // Check for React Router
      if (
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
        document.querySelector("[data-reactroot]") ||
        document.querySelector("[data-react-checksum]") ||
        Array.from(document.scripts).some((script) =>
          script.src.includes("react"),
        )
      ) {
        characteristics.hasReactRouter = true;
      }

      // Check for Vue Router
      if (
        (window as any).Vue ||
        document.querySelector("[data-v-]") ||
        document.querySelector("#app") ||
        Array.from(document.scripts).some((script) =>
          script.src.includes("vue"),
        )
      ) {
        characteristics.hasVueRouter = true;
      }

      // Check for Angular Router
      if (
        document.querySelector("[ng-app]") ||
        document.querySelector("[ng-controller]") ||
        document.querySelector("ng-view") ||
        document.querySelector("router-outlet") ||
        (window as any).ng ||
        Array.from(document.scripts).some((script) =>
          script.src.includes("angular"),
        )
      ) {
        characteristics.hasAngularRouter = true;
      }

      // Check for Next.js
      if (
        document.getElementById("__next") ||
        document.querySelector("[data-next-page]") ||
        (window as any).__NEXT_DATA__ ||
        Array.from(document.scripts).some((script) =>
          script.src.includes("_next"),
        )
      ) {
        characteristics.hasNextJS = true;
      }

      // Check for AJAX navigation patterns
      const ajaxPatterns = [
        "data-href",
        "data-url",
        "data-navigate",
        "data-router-link",
        "onclick",
        "data-click",
        "data-action",
      ];

      characteristics.hasAjaxNavigation = ajaxPatterns.some(
        (pattern) => document.querySelector(`[${pattern}]`) !== null,
      );

      // Check for dynamic content indicators
      const dynamicIndicators = [
        "[data-reactid]",
        "[data-vue]",
        "[ng-if]",
        "[ng-repeat]",
        ".loading",
        ".spinner",
        ".skeleton",
        "[data-placeholder]",
      ];

      characteristics.hasDynamicContent = dynamicIndicators.some(
        (selector) => document.querySelector(selector) !== null,
      );

      // Check for API endpoints in script tags
      const scriptTexts = Array.from(document.scripts)
        .map((script) => script.textContent || script.src)
        .join(" ");

      const apiPatterns = [
        "/api/",
        "/graphql",
        "/rest/",
        ".json",
        "fetch(",
        "axios",
        "XMLHttpRequest",
        "$.ajax",
      ];

      characteristics.hasAPIEndpoints = apiPatterns.some((pattern) =>
        scriptTexts.includes(pattern),
      );

      // Check for Service Worker
      characteristics.hasServiceWorker = "serviceWorker" in navigator;

      return characteristics;
    });
  }

  /**
   * Determine site type based on characteristics
   */
  private determineSiteType(
    characteristics: SiteAnalysis["characteristics"],
  ): SiteAnalysis["siteType"] {
    // Single Page Application indicators
    if (
      characteristics.hasReactRouter ||
      characteristics.hasVueRouter ||
      characteristics.hasAngularRouter ||
      characteristics.hasNextJS ||
      (characteristics.hasAjaxNavigation && characteristics.hasDynamicContent)
    ) {
      return "spa";
    }

    // API-driven site indicators
    if (characteristics.hasAPIEndpoints && characteristics.hasDynamicContent) {
      return "api-driven";
    }

    // Server-side rendered indicators
    if (
      characteristics.hasNextJS ||
      (!characteristics.hasAjaxNavigation && characteristics.hasDynamicContent)
    ) {
      return "ssr";
    }

    // Static site (default)
    if (
      !characteristics.hasDynamicContent &&
      !characteristics.hasAjaxNavigation
    ) {
      return "static";
    }

    return "unknown";
  }

  /**
   * Calculate confidence in site type detection
   */
  private calculateConfidence(
    siteType: SiteAnalysis["siteType"],
    characteristics: SiteAnalysis["characteristics"],
  ): number {
    let confidence = 0.5; // Base confidence

    const trueCharacteristics =
      Object.values(characteristics).filter(Boolean).length;

    switch (siteType) {
      case "spa":
        if (
          characteristics.hasReactRouter ||
          characteristics.hasVueRouter ||
          characteristics.hasAngularRouter
        ) {
          confidence += 0.3;
        }
        if (characteristics.hasAjaxNavigation) confidence += 0.1;
        if (characteristics.hasDynamicContent) confidence += 0.1;
        break;

      case "api-driven":
        if (characteristics.hasAPIEndpoints) confidence += 0.2;
        if (characteristics.hasDynamicContent) confidence += 0.2;
        break;

      case "ssr":
        if (characteristics.hasNextJS) confidence += 0.3;
        break;

      case "static":
        if (trueCharacteristics === 0) confidence += 0.4;
        break;
    }

    return Math.min(1, confidence);
  }

  /**
   * Get crawling strategy for a specific site type
   */
  private getStrategyForSiteType(
    siteType: SiteAnalysis["siteType"],
  ): CrawlingStrategy {
    const strategies: Record<SiteAnalysis["siteType"], CrawlingStrategy> = {
      spa: {
        name: "Single Page Application",
        description: "Optimized for React, Vue, Angular and other SPAs",
        settings: {
          enableJavaScript: true,
          waitForNetworkIdle: true,
          enableLinkDiscovery: true,
          linkDiscoveryOptions: {
            enableJavaScriptAnalysis: true,
            enableInteraction: true,
            maxLinks: 500,
            minConfidence: 0.4,
          },
          navigationTimeout: 30000,
          scrollToLoadContent: true,
          waitForDynamicContent: true,
          maxConcurrency: 2, // Lower for SPAs
          delayBetweenRequests: 2000,
        },
      },

      "api-driven": {
        name: "API-Driven Site",
        description: "Sites that load content via AJAX/API calls",
        settings: {
          enableJavaScript: true,
          waitForNetworkIdle: true,
          enableLinkDiscovery: true,
          linkDiscoveryOptions: {
            enableJavaScriptAnalysis: true,
            enableInteraction: false,
            maxLinks: 300,
            minConfidence: 0.5,
          },
          navigationTimeout: 25000,
          scrollToLoadContent: true,
          waitForDynamicContent: true,
          maxConcurrency: 3,
          delayBetweenRequests: 1500,
        },
      },

      ssr: {
        name: "Server-Side Rendered",
        description: "Sites rendered on the server (Next.js, Nuxt, etc.)",
        settings: {
          enableJavaScript: true,
          waitForNetworkIdle: false,
          enableLinkDiscovery: true,
          linkDiscoveryOptions: {
            enableJavaScriptAnalysis: false,
            enableInteraction: false,
            maxLinks: 800,
            minConfidence: 0.6,
          },
          navigationTimeout: 15000,
          scrollToLoadContent: false,
          waitForDynamicContent: false,
          maxConcurrency: 5,
          delayBetweenRequests: 1000,
        },
      },

      static: {
        name: "Static Site",
        description: "Traditional static HTML sites",
        settings: {
          enableJavaScript: false,
          waitForNetworkIdle: false,
          enableLinkDiscovery: true,
          linkDiscoveryOptions: {
            enableJavaScriptAnalysis: false,
            enableInteraction: false,
            maxLinks: 1000,
            minConfidence: 0.8,
          },
          navigationTimeout: 10000,
          scrollToLoadContent: false,
          waitForDynamicContent: false,
          maxConcurrency: 8,
          delayBetweenRequests: 500,
        },
      },

      unknown: {
        name: "Adaptive Strategy",
        description: "Conservative approach for unknown site types",
        settings: {
          enableJavaScript: true,
          waitForNetworkIdle: true,
          enableLinkDiscovery: true,
          linkDiscoveryOptions: {
            enableJavaScriptAnalysis: true,
            enableInteraction: false,
            maxLinks: 400,
            minConfidence: 0.5,
          },
          navigationTimeout: 20000,
          scrollToLoadContent: true,
          waitForDynamicContent: true,
          maxConcurrency: 3,
          delayBetweenRequests: 1500,
        },
      },
    };

    return strategies[siteType];
  }

  /**
   * Scroll page to trigger lazy loading
   */
  private async scrollToLoadContent(page: Page): Promise<void> {
    try {
      await page.evaluate(async () => {
        // Scroll to bottom slowly to trigger lazy loading
        const scrollStep = 100;
        const scrollDelay = 100;

        let currentScroll = 0;
        const maxScroll = document.body.scrollHeight;

        while (currentScroll < maxScroll) {
          window.scrollTo(0, currentScroll);
          currentScroll += scrollStep;
          await new Promise((resolve) => setTimeout(resolve, scrollDelay));
        }

        // Scroll back to top
        window.scrollTo(0, 0);
      });
    } catch (error) {
      console.warn("Scroll loading failed:", error);
    }
  }

  /**
   * Wait for dynamic content to load
   */
  private async waitForDynamicContent(page: Page): Promise<void> {
    try {
      // Wait for common loading indicators to disappear
      const loadingSelectors = [
        ".loading",
        ".spinner",
        ".skeleton",
        '[data-loading="true"]',
        ".loader",
      ];

      for (const selector of loadingSelectors) {
        try {
          await page.waitForSelector(selector, {
            state: "detached",
            timeout: 5000,
          });
        } catch {
          // Selector not found or timeout, continue
        }
      }

      // Wait for content to stabilize
      await page.waitForTimeout(1000);
    } catch (error) {
      console.warn("Dynamic content wait failed:", error);
    }
  }

  /**
   * Get detected frameworks as strings
   */
  private getDetectedFrameworks(
    characteristics: SiteAnalysis["characteristics"],
  ): string[] {
    const frameworks: string[] = [];

    if (characteristics.hasReactRouter) frameworks.push("React");
    if (characteristics.hasVueRouter) frameworks.push("Vue.js");
    if (characteristics.hasAngularRouter) frameworks.push("Angular");
    if (characteristics.hasNextJS) frameworks.push("Next.js");

    return frameworks;
  }

  /**
   * Get site analysis results
   */
  getSiteAnalysis(): SiteAnalysis | undefined {
    return this.siteAnalysis;
  }
}
