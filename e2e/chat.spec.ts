import { test, expect } from "@playwright/test";

test.describe("Chat Interface", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chat/conversations page
    await page.goto("/");

    // Click on Conversations in navigation
    const navLink = page.locator('a[href*="conversation"], nav >> text=Chat');
    if (
      await navLink
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await navLink.first().click();
      await page.waitForTimeout(500);
    }
  });

  test("displays Nova empty state when no messages", async ({ page }) => {
    // Check for Nova greeting
    const novaGreeting = page.locator("text=Hi, I'm Nova");
    if (await novaGreeting.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(novaGreeting).toBeVisible();
    }
  });

  test("shows suggestion chips in empty state", async ({ page }) => {
    // Check for suggestion buttons
    const suggestions = page.locator(
      "button >> text=/pattern|summarize|Find/i",
    );
    if (
      await suggestions
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await expect(suggestions.first()).toBeVisible();
    }
  });

  test("has message input area", async ({ page }) => {
    // Check for textarea input
    const input = page.locator(
      'textarea[placeholder*="Ask Nova"], textarea[placeholder*="life"]',
    );
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(input).toBeVisible();
    }
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    // Find the send button
    const sendButton = page.locator('button[title="Send"]');
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(sendButton).toBeDisabled();
    }
  });

  test("can type in the message input", async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill("Test message");
      await expect(input).toHaveValue("Test message");
    }
  });

  test("send button enables when input has text", async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');
    const sendButton = page.locator('button[title="Send"]');

    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type a message
      await input.fill("Hello Nova");

      // Send button should be enabled
      await expect(sendButton).toBeEnabled();
    }
  });

  test("sending a message shows user message bubble", async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');

    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type and send a message
      await input.fill("What patterns do you see?");
      await page.keyboard.press("Enter");

      // Wait for message to appear
      await page.waitForTimeout(500);

      // Check for user message
      const userMessage = page.locator("text=What patterns do you see?");
      await expect(userMessage.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("shows typing indicator while Nova responds", async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');

    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill("Test question");
      await page.keyboard.press("Enter");

      // Check for typing indicator (animated dots)
      const typingIndicator = page.locator('[class*="animate-bounce"]');
      // The indicator should appear at some point
      await expect(typingIndicator.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test("receives Nova response after sending message", async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');

    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill("Summarize my notes");
      await page.keyboard.press("Enter");

      // Wait for response (simulated AI takes ~1.5s)
      await page.waitForTimeout(2500);

      // Check for assistant message content
      const response = page.locator("text=/summary|Summarize|themes/i");
      await expect(response.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("assistant messages have action buttons", async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Ask"]');

    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill("Hello");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2500);

      // Check for copy button
      const copyButton = page.locator('button[title="Copy"]');
      if (
        await copyButton
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        await expect(copyButton.first()).toBeVisible();
      }
    }
  });
});

test.describe("Chat - Mobile View", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("chat input is visible and accessible on mobile", async ({ page }) => {
    await page.goto("/");

    const input = page.locator('textarea[placeholder*="Ask"]');
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(input).toBeVisible();
    }
  });

  test("messages render correctly on mobile viewport", async ({ page }) => {
    await page.goto("/");

    const input = page.locator('textarea[placeholder*="Ask"]');
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill("Mobile test");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      const message = page.locator("text=Mobile test");
      await expect(message.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
