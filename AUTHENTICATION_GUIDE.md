# Authentication Guide for GPT Crawler

This guide explains how to use GPT Crawler with sites that require authentication (login). GPT Crawler supports multiple authentication methods to handle various types of protected content.

## Table of Contents

- [Quick Start Examples](#quick-start-examples)
- [Authentication Methods](#authentication-methods)
- [Configuration Options](#configuration-options)
- [Common Use Cases](#common-use-cases)
- [Site-Specific Examples](#site-specific-examples)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Quick Start Examples

### Basic Username/Password Login

```typescript
// config.ts
export const defaultConfig: Config = {
  url: "https://example.com/dashboard",
  match: "https://example.com/dashboard/**",
  selector: ".main-content",
  maxPagesToCrawl: 50,
  outputFileName: "protected-content.json",
  
  authentication: {
    credentials: {
      username: "your-username",
      password: "your-password",
      loginUrl: "https://example.com/login", // Optional: separate login page
    }
  }
};
```

### Using Environment Variables (Recommended)

```bash
# .env file
CRAWLER_USERNAME=your-username
CRAWLER_PASSWORD=your-password
CRAWLER_LOGIN_URL=https://example.com/login
```

```typescript
// config.ts
import { createAuthFromEnv } from "./src/authentication.js";

export const defaultConfig: Config = {
  url: "https://example.com/dashboard",
  match: "https://example.com/dashboard/**",
  selector: ".main-content",
  maxPagesToCrawl: 50,
  outputFileName: "protected-content.json",
  
  authentication: createAuthFromEnv()
};
```

### API Key Authentication

```typescript
export const defaultConfig: Config = {
  url: "https://api.example.com/docs",
  match: "https://api.example.com/docs/**",
  selector: ".documentation",
  maxPagesToCrawl: 20,
  outputFileName: "api-docs.json",
  
  authentication: {
    headers: {
      "Authorization": "Bearer your-api-token",
      "X-API-Key": "your-api-key",
    }
  }
};
```

### Session Cookie Authentication

```typescript
export const defaultConfig: Config = {
  url: "https://example.com/internal",
  match: "https://example.com/internal/**",
  selector: "main",
  maxPagesToCrawl: 30,
  outputFileName: "internal-docs.json",
  
  authentication: {
    sessionCookies: [
      {
        name: "session_id",
        value: "your-session-cookie-value",
        domain: "example.com",
        path: "/",
        httpOnly: true,
        secure: true,
      }
    ]
  }
};
```

## Authentication Methods

### 1. Username/Password Authentication

The most common authentication method. GPT Crawler will:
1. Navigate to the login page
2. Fill in username and password
3. Submit the form
4. Verify login success
5. Continue crawling with authenticated session

```typescript
authentication: {
  credentials: {
    username: "user@example.com",
    password: "secretpassword",
    
    // Optional: Custom selectors for the login form
    usernameSelector: "#email",
    passwordSelector: "#password",
    submitSelector: ".login-btn",
    
    // Optional: Login page URL (if different from starting URL)
    loginUrl: "https://example.com/auth/login",
    
    // Optional: How to verify login worked
    successSelector: ".user-menu",
    successText: "Welcome back",
    
    // Optional: Timeout for login process
    loginTimeout: 30000,
  }
}
```

### 2. Custom Headers Authentication

For APIs or sites that use token-based authentication:

```typescript
authentication: {
  headers: {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "X-API-Key": "abc123def456",
    "User-Agent": "GPT-Crawler/1.0",
    "Accept": "text/html,application/json",
  }
}
```

### 3. Session Cookies

When you have valid session cookies from a previous login:

```typescript
authentication: {
  sessionCookies: [
    {
      name: "sessionid",
      value: "abc123def456ghi789",
      domain: "example.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "csrftoken",
      value: "xyz789uvw456rst123",
      domain: "example.com",
      path: "/",
    }
  ]
}
```

### 4. Custom Authentication Function

For complex login flows (2FA, CAPTCHA, etc.):

```typescript
authentication: {
  customLogin: async ({ page, config }) => {
    // Navigate to login page
    await page.goto("https://example.com/login");
    
    // Fill username
    await page.fill("#username", "your-username");
    await page.fill("#password", "your-password");
    
    // Handle CAPTCHA or 2FA if needed
    await page.click("#login-btn");
    
    // Wait for 2FA prompt
    await page.waitForSelector(".two-factor-code");
    
    // You could pause here for manual intervention
    console.log("Please enter 2FA code manually...");
    await page.waitForSelector(".dashboard", { timeout: 60000 });
    
    console.log("Login successful!");
  }
}
```

## Configuration Options

### Authentication Options

```typescript
authentication: {
  // ... credential/headers/cookies config ...
  
  options: {
    // Delay after login before starting crawl (milliseconds)
    postLoginDelay: 3000,
    
    // Take screenshots for debugging
    debugScreenshot: true,
    
    // Save session cookies for reuse
    saveCookies: true,
    cookieFile: "./session-cookies.json",
  }
}
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CRAWLER_USERNAME` | Login username/email | `user@example.com` |
| `CRAWLER_PASSWORD` | Login password | `secretpassword` |
| `CRAWLER_LOGIN_URL` | Login page URL | `https://site.com/login` |
| `CRAWLER_USERNAME_SELECTOR` | CSS selector for username field | `#email` |
| `CRAWLER_PASSWORD_SELECTOR` | CSS selector for password field | `#password` |
| `CRAWLER_SUBMIT_SELECTOR` | CSS selector for submit button | `.login-btn` |
| `CRAWLER_SUCCESS_SELECTOR` | CSS selector that appears after login | `.dashboard` |
| `CRAWLER_SUCCESS_TEXT` | Text that appears after login | `Welcome back` |
| `CRAWLER_POST_LOGIN_DELAY` | Delay after login (milliseconds) | `3000` |
| `CRAWLER_DEBUG` | Enable debug screenshots | `true` |
| `CRAWLER_SAVE_COOKIES` | Save session cookies | `true` |
| `CRAWLER_COOKIE_FILE` | Cookie file path | `./cookies.json` |

## Common Use Cases

### Corporate Documentation

```typescript
// For internal company docs behind SSO
export const defaultConfig: Config = {
  url: "https://docs.company.com",
  match: "https://docs.company.com/**",
  selector: ".documentation",
  maxPagesToCrawl: 100,
  outputFileName: "company-docs.json",
  
  authentication: {
    credentials: {
      username: process.env.CORP_USERNAME,
      password: process.env.CORP_PASSWORD,
      loginUrl: "https://sso.company.com/login",
      successSelector: ".user-profile",
      postLoginDelay: 5000, // Wait for SSO redirect
    },
    options: {
      saveCookies: true,
      cookieFile: "./corp-session.json",
    }
  }
};
```

### GitHub Private Repositories

```typescript
// For private GitHub repos or organizations
export const defaultConfig: Config = {
  url: "https://github.com/your-org/private-repo",
  match: "https://github.com/your-org/private-repo/**",
  selector: ".markdown-body, .wiki-body",
  maxPagesToCrawl: 50,
  outputFileName: "private-repo-docs.json",
  
  authentication: {
    credentials: {
      username: process.env.GITHUB_USERNAME,
      password: process.env.GITHUB_TOKEN, // Use Personal Access Token
      loginUrl: "https://github.com/login",
      successSelector: ".Header-link--profile",
    }
  }
};
```

### API Documentation

```typescript
// For API docs behind authentication
export const defaultConfig: Config = {
  url: "https://api.example.com/docs",
  match: "https://api.example.com/docs/**",
  selector: ".api-docs",
  maxPagesToCrawl: 25,
  outputFileName: "api-documentation.json",
  
  authentication: {
    headers: {
      "Authorization": `Bearer ${process.env.API_TOKEN}`,
      "Accept": "text/html,application/xhtml+xml",
    }
  }
};
```

### Confluence/Notion Workspaces

```typescript
// For Confluence or Notion team workspaces
export const defaultConfig: Config = {
  url: "https://company.atlassian.net/wiki",
  match: "https://company.atlassian.net/wiki/**",
  selector: ".wiki-content, .page-content",
  maxPagesToCrawl: 200,
  outputFileName: "confluence-wiki.json",
  
  authentication: {
    credentials: {
      username: process.env.ATLASSIAN_EMAIL,
      password: process.env.ATLASSIAN_TOKEN,
      usernameSelector: "#username",
      passwordSelector: "#password",
      submitSelector: "#login-submit",
      successSelector: "[data-testid='ContextualNavigation']",
    }
  }
};
```

## Site-Specific Examples

GPT Crawler includes built-in selector patterns for popular sites:

### GitHub

```typescript
authentication: {
  credentials: {
    username: "your-username",
    password: "your-token", // Use Personal Access Token
    // GitHub selectors are auto-detected
  }
}
```

### GitLab

```typescript
authentication: {
  credentials: {
    username: "your-username", 
    password: "your-password",
    // GitLab selectors are auto-detected
  }
}
```

### Slack

```typescript
authentication: {
  credentials: {
    username: "your-email",
    password: "your-password",
    loginUrl: "https://your-workspace.slack.com/",
    // Slack selectors are auto-detected
  }
}
```

### Notion

```typescript
authentication: {
  credentials: {
    username: "your-email",
    password: "your-password",
    loginUrl: "https://www.notion.so/login",
    // Notion selectors are auto-detected
  }
}
```

## Troubleshooting

### Login Not Working

1. **Check selectors**: Use browser dev tools to verify CSS selectors
   ```typescript
   authentication: {
     credentials: {
       // Use specific selectors for your site
       usernameSelector: "input[name='username']",
       passwordSelector: "input[type='password']",
       submitSelector: "button[type='submit']",
     }
   }
   ```

2. **Enable debug mode**: Take screenshots to see what's happening
   ```typescript
   authentication: {
     options: {
       debugScreenshot: true,
       postLoginDelay: 5000, // Increase delay
     }
   }
   ```

3. **Check for redirects**: Some sites redirect after login
   ```typescript
   authentication: {
     credentials: {
       successSelector: ".dashboard", // What appears after redirect
       loginTimeout: 60000, // Increase timeout
     }
   }
   ```

### Session Expires During Crawling

```typescript
// Save and reuse session cookies
authentication: {
  options: {
    saveCookies: true,
    cookieFile: "./long-session.json",
  }
}
```

### Rate Limiting After Login

```typescript
export const defaultConfig: Config = {
  // ... other config ...
  maxConcurrency: 1, // Crawl one page at a time
  delay: 3000, // 3 second delay between requests
  
  authentication: {
    // ... auth config ...
    options: {
      postLoginDelay: 10000, // Wait longer after login
    }
  }
};
```

### CAPTCHA or 2FA

```typescript
authentication: {
  customLogin: async ({ page }) => {
    await page.goto("https://example.com/login");
    await page.fill("#username", process.env.USERNAME);
    await page.fill("#password", process.env.PASSWORD);
    await page.click("#submit");
    
    // Pause for manual intervention
    console.log("🤖 Please complete CAPTCHA/2FA manually...");
    console.log("⏳ Waiting for login completion...");
    
    // Wait for login to complete (look for success indicator)
    await page.waitForSelector(".dashboard", { timeout: 120000 });
    console.log("✅ Login completed!");
  }
}
```

### Corporate Firewalls/Proxies

```typescript
// Add proxy configuration if needed
export const defaultConfig: Config = {
  // ... other config ...
  
  // If you need to set proxy for corporate network
  onVisitPage: async ({ page }) => {
    await page.context().setProxy({
      server: "http://proxy.company.com:8080",
      username: "proxy-user",
      password: "proxy-pass",
    });
  },
  
  authentication: {
    // ... auth config ...
  }
};
```

## Security Best Practices

### 1. Use Environment Variables

Never hardcode credentials in your config files:

```bash
# .env file (never commit this!)
CRAWLER_USERNAME=your-username
CRAWLER_PASSWORD=your-password
```

```typescript
// config.ts
authentication: {
  credentials: {
    username: process.env.CRAWLER_USERNAME!,
    password: process.env.CRAWLER_PASSWORD!,
  }
}
```

### 2. Use Tokens Instead of Passwords

For sites that support it, use API tokens or app passwords:

```typescript
// GitHub Personal Access Token
authentication: {
  credentials: {
    username: "your-username",
    password: process.env.GITHUB_TOKEN, // Not your actual password
  }
}
```

### 3. Limit Scope

Only crawl what you need and use appropriate match patterns:

```typescript
export const defaultConfig: Config = {
  url: "https://company.com/docs",
  match: [
    "https://company.com/docs/**",
    "!https://company.com/docs/private/**", // Exclude private sections
  ],
  maxPagesToCrawl: 50, // Limit pages
};
```

### 4. Session Management

Clean up session files and don't commit them:

```bash
# .gitignore
session-cookies.json
*.session
.env
```

### 5. Monitor Access

Check your site's access logs to ensure crawling is behaving appropriately.

## Advanced Examples

### Multi-Step Authentication

```typescript
authentication: {
  customLogin: async ({ page, config }) => {
    // Step 1: Navigate to login
    await page.goto("https://example.com/login");
    
    // Step 2: Fill primary credentials
    await page.fill("#username", process.env.USERNAME);
    await page.click("#next");
    
    // Step 3: Wait for password page
    await page.waitForSelector("#password");
    await page.fill("#password", process.env.PASSWORD);
    await page.click("#login");
    
    // Step 4: Handle 2FA if present
    try {
      await page.waitForSelector(".two-factor", { timeout: 5000 });
      console.log("2FA required - please check your phone");
      await page.waitForSelector(".dashboard", { timeout: 60000 });
    } catch {
      // No 2FA required
    }
    
    console.log("Login completed successfully");
  }
}
```

### Conditional Authentication

```typescript
// Only authenticate if not already logged in
authentication: {
  customLogin: async ({ page }) => {
    await page.goto("https://example.com/dashboard");
    
    // Check if already logged in
    const loginRequired = await page.$(".login-form") !== null;
    
    if (loginRequired) {
      console.log("Authentication required");
      await page.fill("#username", process.env.USERNAME);
      await page.fill("#password", process.env.PASSWORD);
      await page.click("#submit");
      await page.waitForSelector(".dashboard");
    } else {
      console.log("Already authenticated");
    }
  }
}
```

## Getting Help

If you're having trouble with authentication:

1. **Enable debug mode** and check screenshots
2. **Use browser dev tools** to inspect login forms
3. **Check site-specific documentation** for API access
4. **Test login manually** in a browser first
5. **Check the GitHub issues** for site-specific solutions

Remember: Always respect the site's terms of service and robots.txt when crawling authenticated content.
