import { Config } from "../src/config.js";
import { createAuthFromEnv } from "../src/authentication.js";

/**
 * Example configuration for crawling GitHub private repositories
 *
 * Requirements:
 * - GitHub username
 * - GitHub Personal Access Token (not password)
 *
 * Environment variables:
 * - GITHUB_USERNAME=your-username
 * - GITHUB_TOKEN=ghp_your_personal_access_token
 */
export const githubPrivateConfig: Config = {
  url: "https://github.com/your-org/private-repo/wiki",
  match: [
    "https://github.com/your-org/private-repo/**",
    "https://github.com/your-org/private-repo/wiki/**",
  ],
  exclude: [
    "https://github.com/your-org/private-repo/settings/**",
    "https://github.com/your-org/private-repo/actions/**",
  ],
  selector: ".markdown-body, .wiki-body, .readme",
  maxPagesToCrawl: 50,
  outputFileName: "github-private-repo.json",

  authentication: {
    credentials: {
      username: process.env.GITHUB_USERNAME!,
      password: process.env.GITHUB_TOKEN!, // Use Personal Access Token
      loginUrl: "https://github.com/login",
      successSelector: ".Header-link--profile",
      loginTimeout: 30000,
    },
    options: {
      postLoginDelay: 3000,
      saveCookies: true,
      cookieFile: "./github-session.json",
    },
  },
};

/**
 * Example configuration for crawling Confluence spaces
 *
 * Requirements:
 * - Atlassian email
 * - App password or API token
 *
 * Environment variables:
 * - ATLASSIAN_EMAIL=user@company.com
 * - ATLASSIAN_TOKEN=your_app_password
 */
export const confluenceConfig: Config = {
  url: "https://your-company.atlassian.net/wiki/spaces/DOCS",
  match: "https://your-company.atlassian.net/wiki/spaces/DOCS/**",
  selector: ".wiki-content, .page-content, [data-testid='page-content']",
  maxPagesToCrawl: 100,
  outputFileName: "confluence-docs.json",

  authentication: {
    credentials: {
      username: process.env.ATLASSIAN_EMAIL!,
      password: process.env.ATLASSIAN_TOKEN!,
      usernameSelector: "#username",
      passwordSelector: "#password",
      submitSelector: "#login-submit",
      successSelector: "[data-testid='ContextualNavigation']",
      loginTimeout: 45000,
    },
    options: {
      postLoginDelay: 5000, // Confluence can be slow
      debugScreenshot: true,
      saveCookies: true,
      cookieFile: "./confluence-session.json",
    },
  },
};

/**
 * Example configuration for crawling Notion workspaces
 *
 * Requirements:
 * - Notion email
 * - Notion password
 *
 * Environment variables:
 * - NOTION_EMAIL=user@company.com
 * - NOTION_PASSWORD=your_password
 */
export const notionConfig: Config = {
  url: "https://www.notion.so/your-workspace/Documentation-123abc",
  match: "https://www.notion.so/your-workspace/**",
  exclude: [
    "https://www.notion.so/your-workspace/Trash-*",
    "https://www.notion.so/your-workspace/Templates-*",
  ],
  selector: ".notion-page-content, [data-block-id]",
  maxPagesToCrawl: 75,
  outputFileName: "notion-workspace.json",

  authentication: {
    credentials: {
      username: process.env.NOTION_EMAIL!,
      password: process.env.NOTION_PASSWORD!,
      loginUrl: "https://www.notion.so/login",
      usernameSelector: "[placeholder*='email']",
      passwordSelector: "[placeholder*='password']",
      submitSelector: "button[type='submit']",
      successSelector: ".notion-topbar",
      loginTimeout: 40000,
    },
    options: {
      postLoginDelay: 4000,
      saveCookies: true,
      cookieFile: "./notion-session.json",
    },
  },
};

/**
 * Example configuration using API token authentication
 *
 * Requirements:
 * - API token or bearer token
 *
 * Environment variables:
 * - API_TOKEN=your_api_token
 */
export const apiDocsConfig: Config = {
  url: "https://api.example.com/docs",
  match: "https://api.example.com/docs/**",
  selector: ".api-documentation, .docs-content",
  maxPagesToCrawl: 30,
  outputFileName: "api-documentation.json",

  authentication: {
    headers: {
      Authorization: `Bearer ${process.env.API_TOKEN}`,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "GPT-Crawler/1.0 Documentation Bot",
    },
  },
};

/**
 * Example configuration using session cookies
 *
 * Use this when you have valid session cookies from a browser
 * You can extract cookies using browser dev tools
 */
export const sessionCookieConfig: Config = {
  url: "https://internal.company.com/docs",
  match: "https://internal.company.com/docs/**",
  selector: ".documentation, .content",
  maxPagesToCrawl: 40,
  outputFileName: "internal-docs.json",

  authentication: {
    sessionCookies: [
      {
        name: "sessionid",
        value: process.env.SESSION_COOKIE!, // Get from browser dev tools
        domain: "internal.company.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "csrftoken",
        value: process.env.CSRF_TOKEN!,
        domain: "internal.company.com",
        path: "/",
      },
    ],
  },
};

/**
 * Example configuration for complex authentication flow
 *
 * Use this for sites with custom login flows, 2FA, etc.
 */
export const customAuthConfig: Config = {
  url: "https://complex-site.com/dashboard",
  match: "https://complex-site.com/dashboard/**",
  selector: ".main-content",
  maxPagesToCrawl: 25,
  outputFileName: "complex-site-content.json",

  authentication: {
    customLogin: async ({ page, config }) => {
      console.log("🔐 Starting custom authentication flow...");

      // Navigate to login page
      await page.goto("https://complex-site.com/auth/login");

      // Fill credentials
      await page.fill("#email", process.env.SITE_EMAIL!);
      await page.fill("#password", process.env.SITE_PASSWORD!);

      // Handle any additional fields
      if (await page.isVisible("#company-code")) {
        await page.fill("#company-code", process.env.COMPANY_CODE!);
      }

      // Submit login
      await page.click("#login-button");

      // Handle potential 2FA
      try {
        await page.waitForSelector(".two-factor-prompt", { timeout: 10000 });
        console.log(
          "⚠️ 2FA detected - please complete manually or check your phone",
        );

        // Wait for 2FA completion (user input required)
        await page.waitForSelector(".dashboard", { timeout: 120000 });
      } catch (error) {
        // No 2FA, check if login was successful
        await page.waitForSelector(".dashboard", { timeout: 30000 });
      }

      console.log("✅ Custom authentication completed");
    },

    options: {
      postLoginDelay: 3000,
      debugScreenshot: true,
      saveCookies: true,
      cookieFile: "./custom-auth-session.json",
    },
  },
};

/**
 * Example using environment variables for all config
 * This is the recommended approach for production use
 */
export const envBasedConfig: Config = {
  url: process.env.CRAWLER_URL!,
  match: process.env.CRAWLER_MATCH!.split(","),
  selector: process.env.CRAWLER_SELECTOR || "main",
  maxPagesToCrawl: parseInt(process.env.CRAWLER_MAX_PAGES || "50"),
  outputFileName: process.env.CRAWLER_OUTPUT || "output.json",

  // Use the built-in environment variable parser
  authentication: createAuthFromEnv(),
};

// Export default configuration
export const defaultConfig = envBasedConfig;
