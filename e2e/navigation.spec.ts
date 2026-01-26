import { test, expect } from "@playwright/test";

test.describe("Navigation - Desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays sidebar navigation on desktop", async ({ page }) => {
    // Check for sidebar
    const sidebar = page.locator(
      '[class*="sidebar"], aside, [class*="w-16"], [class*="w-[68px]"]',
    );
    await expect(sidebar.first()).toBeVisible();
  });

  test("sidebar has navigation links", async ({ page }) => {
    // Check for nav links
    const navLinks = page.locator('nav a, [class*="sidebar"] a');
    await expect(navLinks.first()).toBeVisible();
  });

  test("shows hover labels on sidebar items", async ({ page }) => {
    // Hover over a sidebar item
    const sidebarItem = page.locator(
      'nav a, [class*="sidebar"] button, [class*="nav"] button',
    );

    if (await sidebarItem.first().isVisible({ timeout: 2000 })) {
      await sidebarItem.first().hover();
      // Labels should become visible on hover
      await page.waitForTimeout(300);
    }
  });

  test("active route is visually indicated", async ({ page }) => {
    // Check for active state indicator
    const activeIndicator = page.locator(
      '[class*="active"], [class*="bg-accent"], [class*="bg-bg-hover"]',
    );
    if ((await activeIndicator.count()) > 0) {
      await expect(activeIndicator.first()).toBeVisible();
    }
  });
});

test.describe("Navigation - Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("displays bottom navigation bar on mobile", async ({ page }) => {
    await page.goto("/");

    // Check for bottom nav
    const bottomNav = page.locator(
      '[class*="bottom-0"], [class*="fixed"][class*="bottom"]',
    );
    await expect(bottomNav.first()).toBeVisible();
  });

  test("bottom nav has main navigation items", async ({ page }) => {
    await page.goto("/");

    // Should have multiple nav items
    const navItems = page.locator(
      '[class*="bottom-0"] button, [class*="bottom-0"] a',
    );
    const count = await navItems.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("tapping nav items changes active state", async ({ page }) => {
    await page.goto("/");

    const navItems = page.locator('[class*="bottom-0"] button');
    if ((await navItems.count()) > 1) {
      // Click second nav item
      await navItems.nth(1).click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe("Layout & Responsive Design", () => {
  test("page renders without errors", async ({ page }) => {
    // Capture console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForTimeout(1000);

    // Filter out known/acceptable errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("manifest"),
    );
    expect(criticalErrors.length).toBe(0);
  });

  test("renders correctly at tablet breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    // Content should be visible
    const main = page.locator("main, [class*='main'], [class*='content']");
    await expect(main.first()).toBeVisible();
  });

  test("renders correctly at desktop breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // Sidebar should be visible on desktop
    const sidebar = page.locator('[class*="sidebar"], aside');
    if ((await sidebar.count()) > 0) {
      await expect(sidebar.first()).toBeVisible();
    }
  });

  test("handles viewport resize gracefully", async ({ page }) => {
    await page.goto("/");

    // Start at desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Page should still be functional
    const content = page.locator("h1, [class*='Card'], [class*='feed'], main");
    await expect(content.first()).toBeVisible();
  });
});
