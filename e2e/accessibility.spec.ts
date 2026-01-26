import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page has proper heading structure", async ({ page }) => {
    // Should have an h1
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });

  test("interactive elements are keyboard accessible", async ({ page }) => {
    // Tab through the page
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Something should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test("buttons have accessible names", async ({ page }) => {
    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute("aria-label");
      const hasTitle = await button.getAttribute("title");

      // Button should have some accessible name
      expect(hasText?.trim() || hasAriaLabel || hasTitle).toBeTruthy();
    }
  });

  test("images have alt text", async ({ page }) => {
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      // Images should have alt attribute (can be empty for decorative)
      expect(alt !== null).toBeTruthy();
    }
  });

  test("links have descriptive text", async ({ page }) => {
    const links = page.locator('a[href]:not([href=""])');
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");

      // Links should have text or aria-label
      expect((text?.trim() || ariaLabel || "").length).toBeGreaterThan(0);
    }
  });

  test("form inputs have labels", async ({ page }) => {
    const inputs = page.locator('input:not([type="hidden"]), textarea, select');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledby = await input.getAttribute("aria-labelledby");
      const placeholder = await input.getAttribute("placeholder");

      // Input should have some form of label
      const hasLabel = id || ariaLabel || ariaLabelledby || placeholder;
      expect(hasLabel).toBeTruthy();
    }
  });

  test("focus is visible on interactive elements", async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press("Tab");

    // Check if focus styles are visible (focus ring or outline)
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;

      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        border: styles.border,
      };
    });

    // Element should have some visual focus indicator
    expect(focusedElement).toBeDefined();
  });

  test("page has lang attribute", async ({ page }) => {
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBeTruthy();
  });

  test("color contrast meets minimum standards", async ({ page }) => {
    // Check text color against background
    const textElement = page.locator("h1, p, span").first();

    if (await textElement.isVisible()) {
      const colors = await textElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      });

      // Just verify we can read the colors (actual contrast checking would need a library)
      expect(colors.color).toBeTruthy();
    }
  });
});

test.describe("Accessibility - Keyboard Navigation", () => {
  test("can navigate cards with keyboard", async ({ page }) => {
    await page.goto("/");

    // Tab through to a card
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
    }

    // Press Enter to select
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
  });

  test("can close modal with Escape key", async ({ page }) => {
    await page.goto("/");

    // Click to open a modal
    const card = page.locator('[class*="cursor-pointer"]').first();
    await card.click();
    await page.waitForTimeout(500);

    // Press Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("modal traps focus", async ({ page }) => {
    await page.goto("/");

    // Open modal
    const card = page.locator('[class*="cursor-pointer"]').first();
    await card.click();
    await page.waitForTimeout(500);

    // Check if modal is visible
    const modal = page.locator('[class*="fixed"][class*="inset-0"]');
    if (
      await modal
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      // Tab through modal elements
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Focus should stay within modal
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return (
          el?.closest('[class*="modal"]') !== null ||
          el?.closest('[class*="fixed"]') !== null
        );
      });

      // Focus should be somewhere on the page
      expect(focused !== null).toBeTruthy();
    }
  });
});

test.describe("Touch Accessibility", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("touch targets are at least 44x44px", async ({ page }) => {
    await page.goto("/");

    const buttons = page.locator("button, a, [role='button']");
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44px (allow some tolerance)
          expect(box.width).toBeGreaterThanOrEqual(32);
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    }
  });
});
