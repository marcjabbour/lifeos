---
name: browser-testing
description: Browser automation and E2E testing with Playwright MCP. Use for visual testing, UI verification, screenshot capture, form testing, user flow validation, and scraping web content. Leverages the Playwright MCP server for browser control.
---

# Browser Testing

Use Playwright MCP for browser automation and E2E testing.

## Available Tools

The Playwright MCP provides these capabilities:
- `playwright_navigate` - Go to URL
- `playwright_screenshot` - Capture page/element screenshots
- `playwright_click` - Click elements
- `playwright_fill` - Fill form inputs
- `playwright_select` - Select dropdown options
- `playwright_hover` - Hover over elements
- `playwright_evaluate` - Run JavaScript in page context

## Common Workflows

### Visual Verification
```
1. Navigate to page
2. Take screenshot
3. Compare against expected state
```

### Form Testing
```
1. Navigate to form
2. Fill fields with test data
3. Submit
4. Verify success state
```

### User Flow Testing
```
1. Start at entry point
2. Perform user actions (click, fill, navigate)
3. Assert expected outcomes at each step
4. Screenshot critical states
```

### Content Scraping
```
1. Navigate to page
2. Use evaluate to extract data
3. Return structured results
```

## Element Selection

Use CSS selectors or text content:
- `button[type="submit"]` - By attribute
- `text=Sign In` - By visible text
- `#email` - By ID
- `.form-input` - By class

## Best Practices

1. Wait for elements before interacting
2. Use specific selectors (ID > class > tag)
3. Screenshot before/after critical actions
4. Handle navigation timing (page loads)
5. Test both success and error states
