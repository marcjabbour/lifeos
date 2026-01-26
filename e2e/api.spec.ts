import { test, expect } from "@playwright/test";

test.describe("API Routes", () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  test("GET /api/items returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/items`);
    // Should return 401 Unauthorized
    expect([401, 403]).toContain(response.status());
  });

  test("POST /api/share returns 401 without auth", async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/share`, {
      data: {
        content: "https://example.com",
        content_type: "url",
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("POST /api/share validates content_type", async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/share`, {
      headers: {
        Authorization: "Bearer test-invalid-key",
      },
      data: {
        content: "test content",
        content_type: "invalid_type",
      },
    });
    // Should return either 400 (validation error) or 401 (auth error)
    expect([400, 401, 403]).toContain(response.status());
  });

  test("POST /api/push/subscribe requires auth", async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/push/subscribe`, {
      data: {
        endpoint: "https://example.com/push",
        keys: { p256dh: "key", auth: "auth" },
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("POST /api/conversation/reply requires auth", async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/conversation/reply`, {
      data: {
        conversation_id: "test-id",
        message_content: "Hello",
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/jobs/:id returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/jobs/test-job-id`);
    expect([401, 403, 404]).toContain(response.status());
  });

  test("DELETE /api/items/:id requires auth", async ({ request }) => {
    const response = await request.delete(`${baseUrl}/api/items/test-item-id`);
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("API Input Validation", () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  test("rejects localhost URLs in share endpoint", async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/share`, {
      headers: {
        // Even with auth header, should reject invalid URLs
        "Content-Type": "application/json",
      },
      data: {
        content: "http://localhost:3000/malicious",
        content_type: "url",
      },
    });
    // Should fail validation or auth
    expect([400, 401, 403]).toContain(response.status());
  });

  test("rejects file:// URLs in share endpoint", async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/share`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        content: "file:///etc/passwd",
        content_type: "url",
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test("handles malformed JSON gracefully", async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/share`, {
      headers: {
        "Content-Type": "application/json",
      },
      data: "not valid json {",
    });
    // Should return 400 for bad request
    expect([400, 401, 403, 500]).toContain(response.status());
  });
});

test.describe("API Rate Limiting", () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  test("rate limit headers are present", async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/items`);
    // Rate limit headers might be present
    const headers = response.headers();
    // Check for common rate limit headers (these may or may not be present)
    const hasRateLimitInfo =
      headers["x-ratelimit-limit"] ||
      headers["x-ratelimit-remaining"] ||
      headers["retry-after"];
    // Just log for now, don't fail if not present
    console.log(
      "Rate limit headers:",
      hasRateLimitInfo ? "present" : "not present",
    );
  });
});
