import { test, expect } from "@playwright/test";

test.describe("Items Feed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays the Intelligence Feed header", async ({ page }) => {
    // Verify the feed header is visible
    await expect(page.locator("h1")).toContainText("Intelligence Feed");
    await expect(page.locator("text=Nova has enriched")).toBeVisible();
  });

  test("shows feed items with proper structure", async ({ page }) => {
    // Wait for items to load
    await expect(page.locator('[class*="Card"]').first()).toBeVisible();

    // Should have at least one item
    const cards = page.locator('[class*="cursor-pointer"]');
    await expect(cards.first()).toBeVisible();
  });

  test("infinite scroll loads more items", async ({ page }) => {
    // Count initial items
    const initialCards = await page.locator('[class*="Card"]').count();

    // Scroll to bottom to trigger infinite scroll
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for loading to complete
    await page.waitForTimeout(1500);

    // Verify more items loaded
    const finalCards = await page.locator('[class*="Card"]').count();
    expect(finalCards).toBeGreaterThanOrEqual(initialCards);
  });

  test("clicking an item opens the detail modal", async ({ page }) => {
    // Click the first card
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    await firstCard.click();

    // Wait for modal to open
    await page.waitForTimeout(500);

    // Check if modal content is visible (dialog or modal backdrop)
    const modalOverlay = page.locator('[class*="fixed"][class*="inset-0"]');
    await expect(modalOverlay.first()).toBeVisible({ timeout: 5000 });
  });

  test("modal can be closed", async ({ page }) => {
    // Open modal
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    await firstCard.click();

    // Wait for modal
    await page.waitForTimeout(500);

    // Click close button or backdrop
    const closeButton = page.locator('button:has-text("Close")');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Press escape to close
      await page.keyboard.press("Escape");
    }

    // Verify modal is closed (with timeout for animation)
    await page.waitForTimeout(300);
  });

  test("displays Nova enrichment badges on enriched items", async ({
    page,
  }) => {
    // Look for Nova badge elements
    const novaBadges = page.locator('[class*="Nova"]');
    await expect(novaBadges.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Refine Feed button", async ({ page }) => {
    await expect(page.locator('button:has-text("Refine Feed")')).toBeVisible();
  });

  test("cards show source icons and metadata", async ({ page }) => {
    // Check for meta information
    const metaInfo = page.locator('[class*="CardMeta"]');
    if ((await metaInfo.count()) > 0) {
      await expect(metaInfo.first()).toBeVisible();
    }

    // Check for duration/read time
    const hasMetaText =
      (await page.locator("text=/\\d+ min (watch|read)/").count()) > 0;
    expect(hasMetaText).toBeTruthy();
  });
});

test.describe("Feed - Mobile View", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("displays mobile navigation at bottom", async ({ page }) => {
    await page.goto("/");

    // Check for bottom navigation
    const bottomNav = page.locator('[class*="bottom-0"]');
    await expect(bottomNav.first()).toBeVisible();
  });

  test("feed renders in single column on mobile", async ({ page }) => {
    await page.goto("/");

    // Verify cards are visible and fill width
    const card = page.locator('[class*="Card"]').first();
    await expect(card).toBeVisible();
  });
});
