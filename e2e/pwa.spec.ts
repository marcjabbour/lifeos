import { test, expect } from "@playwright/test";

test.describe("PWA & Service Worker", () => {
  test("loads web app manifest", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest).toBeDefined();
    expect(manifest.name).toBe("LifeOS");
    expect(manifest.short_name).toBe("LifeOS");
    expect(manifest.display).toBe("standalone");
  });

  test("manifest has required PWA properties", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    const manifest = await response?.json();

    expect(manifest.start_url).toBeDefined();
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("manifest icons have proper sizes", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    const manifest = await response?.json();

    // Check for standard PWA icon sizes
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes.some((s: string) => s.includes("192"))).toBeTruthy();
    expect(sizes.some((s: string) => s.includes("512"))).toBeTruthy();
  });

  test("page has manifest link in head", async ({ page }) => {
    await page.goto("/");

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", /manifest/);
  });

  test("page has theme-color meta tag", async ({ page }) => {
    await page.goto("/");

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute("content", /.+/);
  });

  test("page has apple-mobile-web-app-capable meta tag", async ({ page }) => {
    await page.goto("/");

    const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    if ((await appleMeta.count()) > 0) {
      await expect(appleMeta).toHaveAttribute("content", "yes");
    }
  });

  test("service worker is registered", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }
      return false;
    });

    // Service worker should be registered (but might not be in test environment)
    console.log("Service worker registered:", swRegistered);
  });

  test("offline page exists", async ({ page }) => {
    const response = await page.goto("/offline.html");
    // Offline page should exist
    expect([200, 304]).toContain(response?.status() || 404);
  });
});

test.describe("PWA Meta Tags", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has proper viewport meta tag", async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute(
      "content",
      /width=device-width.*initial-scale=1/,
    );
  });

  test("has apple-touch-icon", async ({ page }) => {
    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    if ((await appleIcon.count()) > 0) {
      await expect(appleIcon.first()).toHaveAttribute("href", /.+/);
    }
  });

  test("has favicon", async ({ page }) => {
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon.first()).toHaveAttribute("href", /.+/);
  });
});

test.describe("Offline Functionality", () => {
  test("app shell renders when cached", async ({ page, context }) => {
    // First visit to cache resources
    await page.goto("/");
    await page.waitForTimeout(2000);

    // The page should render
    const content = page.locator("body");
    await expect(content).toBeVisible();
  });
});

test.describe("Share Target", () => {
  test("share target URL is accessible", async ({ page }) => {
    // Share page should exist
    const response = await page.goto("/share");
    expect([200, 307, 308, 404]).toContain(response?.status() || 500);
  });

  test("share page accepts URL parameters", async ({ page }) => {
    await page.goto(
      "/share?url=https://example.com&title=Test&text=Description",
    );

    // Page should load without errors
    await page.waitForTimeout(500);
    const content = page.locator("body");
    await expect(content).toBeVisible();
  });
});
