---
name: Mac Compatibility Issue
about: Report Mac-specific installation or runtime issues
title: "[Mac] Brief description of the issue"
labels: ["bug", "mac", "needs-investigation"]
assignees: []
---

## Mac System Information

- **macOS Version**: [e.g., macOS 13.5 (Ventura)]
- **Architecture**: [e.g., Intel x64, Apple M1, Apple M2]
- **Node.js Version**: [Run `node --version`]
- **npm Version**: [Run `npm --version`]
- **Xcode Command Line Tools**: [Run `xcode-select -p` or "Not installed"]

## Issue Description

**Brief Description:**
A clear and concise description of what the issue is.

**Expected Behavior:**
What you expected to happen.

**Actual Behavior:**
What actually happened.

## Error Information

**Error Message:**

```
Paste the complete error message here
```

**Stack Trace (if applicable):**

```
Paste any stack trace here
```

## Steps to Reproduce

1. Go to '...'
2. Run command '...'
3. See error

## Troubleshooting Steps Tried

Please check all that apply:

- [ ] Ran `./setup-mac.sh`
- [ ] Ran `npm run install:browsers`
- [ ] Ran `npm run fix:mac`
- [ ] Tried `npx playwright install --with-deps`
- [ ] Checked that Xcode command line tools are installed
- [ ] Verified Node.js 16+ is installed
- [ ] Cleared npm cache with `npm cache clean --force`
- [ ] Removed and reinstalled node_modules

## Configuration

**config.ts snippet:**

```typescript
// Paste relevant parts of your config.ts here
```

**npm packages (relevant):**

```json
// Output of: npm ls playwright
```

## Environment Details

**Terminal Output of Diagnostics:**

```bash
# Please run: npm run diagnostics
# And paste the output here
```

**Free Disk Space:**

```bash
# Output of: df -h
```

**Available Memory:**

```bash
# Output of: vm_stat | head -5
```

## Additional Context

Add any other context about the problem here. Screenshots can be helpful for UI-related issues.

## Possible Workarounds

If you found any temporary workarounds, please describe them here.

---

**Quick Self-Help Checklist:**
Before submitting, please try:

1. Run our Mac setup script: `./setup-mac.sh`
2. Check our [Mac Setup Guide](../MAC_SETUP_GUIDE.md)
3. Search existing [Mac-related issues](https://github.com/BuilderIO/gpt-crawler/issues?q=is%3Aissue+label%3Amac)
