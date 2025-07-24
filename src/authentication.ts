/**
 * Authentication module for GPT Crawler
 * Handles various authentication methods for protected sites
 */

import { Page, BrowserContext } from "playwright";
import { Config } from "./config.js";
import { promises as fs } from "fs";
import { existsSync } from "fs";

export interface AuthenticationResult {
  success: boolean;
  message: string;
  screenshot?: string;
}

export interface SessionCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * Main authentication handler class
 */
export class AuthenticationHandler {
  private config: Config;
  private page: Page;
  private context: BrowserContext;

  constructor(config: Config, page: Page, context: BrowserContext) {
    this.config = config;
    this.page = page;
    this.context = context;
  }

  /**
   * Perform authentication based on config
   */
  async authenticate(): Promise<AuthenticationResult> {
    if (!this.config.authentication) {
      return { success: true, message: "No authentication required" };
    }

    console.log("🔐 Starting authentication process...");

    try {
      // Load saved session cookies first if available
      if (this.config.authentication.options?.saveCookies) {
        await this.loadSavedCookies();
      }

      // Set custom headers
      if (this.config.authentication.headers) {
        await this.setCustomHeaders();
      }

      // Set session cookies
      if (this.config.authentication.sessionCookies) {
        await this.setSessionCookies();
      }

      // Perform custom login if provided
      if (this.config.authentication.customLogin) {
        return await this.performCustomLogin();
      }

      // Perform credential-based login
      if (this.config.authentication.credentials) {
        return await this.performCredentialLogin();
      }

      return {
        success: true,
        message: "Authentication completed (headers/cookies only)",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown authentication error";
      console.error("❌ Authentication failed:", message);
      return { success: false, message };
    }
  }

  /**
   * Set custom headers for API authentication
   */
  private async setCustomHeaders(): Promise<void> {
    if (!this.config.authentication?.headers) return;

    console.log("📋 Setting custom authentication headers...");

    await this.page.setExtraHTTPHeaders(this.config.authentication.headers);

    // Also set headers for the context to apply to all pages
    await this.context.setExtraHTTPHeaders(this.config.authentication.headers);

    console.log("✅ Custom headers set successfully");
  }

  /**
   * Set session cookies for cookie-based authentication
   */
  private async setSessionCookies(): Promise<void> {
    if (!this.config.authentication?.sessionCookies) return;

    console.log("🍪 Setting session cookies...");

    const cookies = this.config.authentication.sessionCookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || new URL(this.config.url).hostname,
      path: cookie.path || "/",
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
      sameSite: cookie.sameSite || ("Lax" as const),
    }));

    await this.context.addCookies(cookies);
    console.log(`✅ Set ${cookies.length} session cookies`);
  }

  /**
   * Perform username/password login
   */
  private async performCredentialLogin(): Promise<AuthenticationResult> {
    const creds = this.config.authentication!.credentials!;
    console.log(`🔑 Performing credential login for user: ${creds.username}`);

    // Apply defaults for selectors
    const usernameSelector =
      creds.usernameSelector ||
      "#username, [name='username'], [name='email'], #email, #login, [type='email']";
    const passwordSelector =
      creds.passwordSelector ||
      "#password, [name='password'], [type='password']";
    const submitSelector =
      creds.submitSelector ||
      "button[type='submit'], input[type='submit'], .login-button, #login-button, .submit";
    const loginTimeout = creds.loginTimeout || 30000;

    try {
      // Navigate to login page if specified, otherwise use current page
      if (creds.loginUrl) {
        console.log(`🌐 Navigating to login page: ${creds.loginUrl}`);
        await this.page.goto(creds.loginUrl, { waitUntil: "networkidle" });
      }

      // Wait for login form to be visible
      console.log("⏳ Waiting for login form...");
      await this.page.waitForSelector(usernameSelector, { timeout: 10000 });

      // Fill username
      console.log("👤 Filling username...");
      await this.page.fill(usernameSelector, creds.username);

      // Fill password
      console.log("🔒 Filling password...");
      await this.page.fill(passwordSelector, creds.password);

      // Take screenshot before login if debugging
      if (this.config.authentication?.options?.debugScreenshot) {
        const screenshot = `login-form-${Date.now()}.png`;
        await this.page.screenshot({ path: screenshot });
        console.log(`📸 Debug screenshot saved: ${screenshot}`);
      }

      // Click submit button
      console.log("🚀 Submitting login form...");
      await Promise.all([
        this.page.waitForNavigation({ timeout: loginTimeout }),
        this.page.click(submitSelector),
      ]);

      // Wait for post-login delay
      const postLoginDelay =
        this.config.authentication?.options?.postLoginDelay || 2000;
      if (postLoginDelay > 0) {
        console.log(`⏱️  Waiting ${postLoginDelay}ms after login...`);
        await this.page.waitForTimeout(postLoginDelay);
      }

      // Verify login success
      const loginSuccess = await this.verifyLoginSuccess();

      if (loginSuccess.success) {
        // Save session cookies if requested
        if (this.config.authentication?.options?.saveCookies) {
          await this.saveCookies();
        }

        // Take success screenshot if debugging
        if (this.config.authentication?.options?.debugScreenshot) {
          const screenshot = `login-success-${Date.now()}.png`;
          await this.page.screenshot({ path: screenshot });
          console.log(`📸 Success screenshot saved: ${screenshot}`);
          loginSuccess.screenshot = screenshot;
        }
      }

      return loginSuccess;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      console.error("❌ Credential login failed:", message);

      // Take error screenshot if debugging
      if (this.config.authentication?.options?.debugScreenshot) {
        const screenshot = `login-error-${Date.now()}.png`;
        await this.page.screenshot({ path: screenshot });
        console.log(`📸 Error screenshot saved: ${screenshot}`);
      }

      return { success: false, message };
    }
  }

  /**
   * Perform custom login using provided function
   */
  private async performCustomLogin(): Promise<AuthenticationResult> {
    console.log("🔧 Performing custom login...");

    try {
      await this.config.authentication!.customLogin!({
        page: this.page,
        config: this.config,
      });

      // Wait for post-login delay
      const postLoginDelay =
        this.config.authentication?.options?.postLoginDelay || 2000;
      if (postLoginDelay > 0) {
        await this.page.waitForTimeout(postLoginDelay);
      }

      // Verify login if success indicators are provided
      if (
        this.config.authentication?.credentials?.successSelector ||
        this.config.authentication?.credentials?.successText
      ) {
        return await this.verifyLoginSuccess();
      }

      return { success: true, message: "Custom login completed" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Custom login failed";
      console.error("❌ Custom login failed:", message);
      return { success: false, message };
    }
  }

  /**
   * Verify that login was successful
   */
  private async verifyLoginSuccess(): Promise<AuthenticationResult> {
    const creds = this.config.authentication?.credentials;
    if (!creds) {
      return { success: true, message: "No verification criteria provided" };
    }

    console.log("🔍 Verifying login success...");

    try {
      // Check for success selector
      if (creds.successSelector) {
        console.log(
          `👀 Looking for success selector: ${creds.successSelector}`,
        );
        await this.page.waitForSelector(creds.successSelector, {
          timeout: 10000,
        });
        console.log("✅ Success selector found - login verified");
        return { success: true, message: "Login verified by success selector" };
      }

      // Check for success text
      if (creds.successText) {
        console.log(`📝 Looking for success text: "${creds.successText}"`);
        await this.page.waitForFunction(
          (text) => document.body.innerText.includes(text),
          creds.successText,
          { timeout: 10000 },
        );
        console.log("✅ Success text found - login verified");
        return { success: true, message: "Login verified by success text" };
      }

      // If no specific verification criteria, check for common error indicators
      const errorSelectors = [
        ".error",
        ".alert-error",
        ".login-error",
        '[class*="error"]',
        ".invalid",
        ".alert-danger",
        '[class*="invalid"]',
      ];

      for (const selector of errorSelectors) {
        const errorElement = await this.page.$(selector);
        if (errorElement) {
          const errorText = await errorElement.textContent();
          if (errorText && errorText.trim()) {
            console.log(`❌ Error found: ${errorText.trim()}`);
            return {
              success: false,
              message: `Login error: ${errorText.trim()}`,
            };
          }
        }
      }

      // No errors found, assume success
      console.log("✅ No errors detected - assuming login success");
      return {
        success: true,
        message: "Login appears successful (no errors detected)",
      };
    } catch (error) {
      // If verification times out, it might still be successful
      console.log(
        "⚠️ Login verification inconclusive - proceeding with caution",
      );
      return {
        success: true,
        message: "Login verification inconclusive but proceeding",
      };
    }
  }

  /**
   * Save current session cookies to file
   */
  private async saveCookies(): Promise<void> {
    if (!this.config.authentication?.options?.cookieFile) {
      return;
    }

    try {
      const cookies = await this.context.cookies();
      const cookieData = JSON.stringify(cookies, null, 2);
      await fs.writeFile(
        this.config.authentication.options.cookieFile,
        cookieData,
      );
      console.log(
        `💾 Saved ${cookies.length} cookies to ${this.config.authentication.options.cookieFile}`,
      );
    } catch (error) {
      console.error("❌ Failed to save cookies:", error);
    }
  }

  /**
   * Load previously saved session cookies
   */
  private async loadSavedCookies(): Promise<void> {
    const cookieFile = this.config.authentication?.options?.cookieFile;
    if (!cookieFile || !existsSync(cookieFile)) {
      return;
    }

    try {
      const cookieData = await fs.readFile(cookieFile, "utf-8");
      const cookies = JSON.parse(cookieData);
      await this.context.addCookies(cookies);
      console.log(
        `🍪 Loaded ${cookies.length} saved cookies from ${cookieFile}`,
      );
    } catch (error) {
      console.error("❌ Failed to load saved cookies:", error);
    }
  }
}

/**
 * Utility functions for authentication
 */

/**
 * Check if a URL requires authentication based on common patterns
 */
export function requiresAuthentication(url: string): boolean {
  const authPatterns = [
    "/login",
    "/signin",
    "/auth",
    "/dashboard",
    "/admin",
    "/account",
    "/profile",
    "/user",
    "/member",
    "/portal",
  ];

  return authPatterns.some((pattern) => url.toLowerCase().includes(pattern));
}

/**
 * Get default selectors for common login forms
 */
export function getDefaultSelectors(site: string) {
  const hostname = new URL(site).hostname.toLowerCase();

  // Site-specific selector patterns
  const siteSelectors: Record<string, any> = {
    "github.com": {
      usernameSelector: "#login_field",
      passwordSelector: "#password",
      submitSelector: '[type="submit"]',
      successSelector: ".Header-link--profile",
    },
    "gitlab.com": {
      usernameSelector: "#user_login",
      passwordSelector: "#user_password",
      submitSelector: '[type="submit"]',
      successSelector: ".header-user",
    },
    "atlassian.net": {
      usernameSelector: "#username",
      passwordSelector: "#password",
      submitSelector: "#login-submit",
      successSelector: '[data-testid="ContextualNavigation"]',
    },
    "notion.so": {
      usernameSelector: '[placeholder*="email"]',
      passwordSelector: '[placeholder*="password"]',
      submitSelector: 'button[type="submit"]',
      successSelector: ".notion-topbar",
    },
    "slack.com": {
      usernameSelector: "#email",
      passwordSelector: "#password",
      submitSelector: "#signin_btn",
      successSelector: ".p-client",
    },
  };

  // Check for exact match first
  for (const [domain, selectors] of Object.entries(siteSelectors)) {
    if (hostname.includes(domain)) {
      return selectors;
    }
  }

  // Return generic selectors
  return {
    usernameSelector:
      '#username, [name="username"], [name="email"], #email, #login, [type="email"]',
    passwordSelector: '#password, [name="password"], [type="password"]',
    submitSelector:
      'button[type="submit"], input[type="submit"], .login-button, #login-button, .submit',
  };
}

/**
 * Create authentication config from environment variables
 */
export function createAuthFromEnv(): Config["authentication"] {
  const username = process.env.CRAWLER_USERNAME;
  const password = process.env.CRAWLER_PASSWORD;
  const loginUrl = process.env.CRAWLER_LOGIN_URL;

  if (!username || !password) {
    return undefined;
  }

  return {
    credentials: {
      username,
      password,
      loginUrl: loginUrl || undefined,
      usernameSelector: process.env.CRAWLER_USERNAME_SELECTOR || undefined,
      passwordSelector: process.env.CRAWLER_PASSWORD_SELECTOR || undefined,
      submitSelector: process.env.CRAWLER_SUBMIT_SELECTOR || undefined,
      successSelector: process.env.CRAWLER_SUCCESS_SELECTOR || undefined,
      successText: process.env.CRAWLER_SUCCESS_TEXT || undefined,
    },
    options: {
      postLoginDelay: parseInt(process.env.CRAWLER_POST_LOGIN_DELAY || "2000"),
      debugScreenshot: process.env.CRAWLER_DEBUG === "true",
      saveCookies: process.env.CRAWLER_SAVE_COOKIES === "true",
      cookieFile: process.env.CRAWLER_COOKIE_FILE || "./session-cookies.json",
    },
  };
}
