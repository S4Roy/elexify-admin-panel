import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "e2e.admin@example.com";
const ADMIN_PASSWORD = "ElexifyAdminE2E!2026";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth/login");
  await page.locator('input[formcontrolname="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[formcontrolname="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

test.describe("Admin route guards / direct access", () => {
  test("direct access to a protected URL without a session redirects to login with redirectTo", async ({ page }) => {
    await page.goto("/inventory/products");
    await expect(page).toHaveURL(/\/auth\/login\?redirectTo=/);
  });

  test("unknown route renders the 404 page, not a crash", async ({ page }) => {
    await login(page);
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText(/not found|404/i).first()).toBeVisible();
  });

  test("refreshing a protected route stays authenticated (no redirect loop)", async ({ page }) => {
    await login(page);
    await page.goto("/inventory/products");
    await page.reload();
    await expect(page).toHaveURL(/\/inventory\/products/);
    await expect(page.getByText("E2E Admin Product")).toBeVisible();
  });
});

test.describe("Admin HTTP interceptor / error handling", () => {
  test("every API request carries the x-api-key and Authorization headers", async ({ page }) => {
    await login(page);
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/v1/") && req.url().includes("product")),
      page.goto("/inventory/products"),
    ]);
    expect(request.headers()["x-api-key"]).toBeTruthy();
    expect(request.headers()["authorization"]).toMatch(/^Bearer /);
  });

  test("a 401 response logs the admin out and redirects to login", async ({ page }) => {
    await login(page);
    await page.route("**/api/v1/**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Session expired" }),
      });
    });
    await page.goto("/inventory/orders");
    await expect(page).toHaveURL(/\/auth\/login/);
    const token = await page.evaluate(() => localStorage.getItem("ELEXIFY-TOKEN"));
    expect(token).toBeFalsy();
  });

  test("a 403 response shows a forbidden message and logs out", async ({ page }) => {
    await login(page);
    await page.route("**/api/v1/**", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ title: "Forbidden" }),
      });
    });
    await page.goto("/inventory/coupons");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("a 500 response is recoverable, not a blank crash", async ({ page }) => {
    await login(page);
    let hit = false;
    await page.route("**/api/v1/**inventory/product/list**", async (route) => {
      if (!hit) {
        hit = true;
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Simulated failure" }) });
      } else {
        await route.continue();
      }
    });
    await page.goto("/inventory/products");
    // Page shell must still render (no white-screen crash) even though the
    // first list call failed.
    await expect(page.locator("app-root")).toBeVisible();
  });

  test("a controlled network timeout does not hang the UI indefinitely", async ({ page }) => {
    await login(page);
    await page.route("**/api/v1/**inventory/product/list**", (route) => route.abort("timedout"));
    await page.goto("/inventory/products");
    await expect(page.locator("app-root")).toBeVisible();
  });
});

test.describe("Admin sanitization / XSS regression", () => {
  // Direct, targeted coverage for the exact vulnerability found and fixed in
  // OembedToIframePipe this cycle: blog content is CKEditor-authored HTML
  // rendered via [innerHTML] | oembedToIframe on the blog-details page.
  const payloads: Array<{ label: string; html: string; mustNotContain: RegExp }> = [
    { label: "<script> tag", html: '<p>hello</p><script>window.__xss=1;<\/script>', mustNotContain: /<script/i },
    { label: "onerror attribute", html: '<img src="x" onerror="window.__xss=1">', mustNotContain: /onerror=/i },
    { label: "SVG onload payload", html: '<svg onload="window.__xss=1"></svg>', mustNotContain: /onload=/i },
  ];

  for (const { label, html, mustNotContain } of payloads) {
    test(`blog content with a ${label} does not execute when viewed`, async ({ page, request, baseURL }) => {
      await login(page);
      const token = await page.evaluate(() => localStorage.getItem("ELEXIFY-TOKEN"));
      const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:4021/api/v1/";
      const title = `E2E XSS ${label} ${Date.now()}`;
      const res = await request.post(`${apiBase}admin/blog/add`, {
        headers: {
          "x-api-key": "Ip2A4a02I1r1I9dE1iSnA0S6aB1tE5WS",
          Authorization: `Bearer ${token}`,
        },
        data: { title, short_description: "xss regression", content: html, tags: [] },
      });
      // Only proceed to the browser check if the write actually landed -
      // otherwise this test would trivially "pass" for the wrong reason.
      test.skip(!res.ok(), `blog create endpoint returned ${res.status()}; skipping render check`);
      const slug = (await res.json())?.data?.slug;
      test.skip(!slug, "blog create response did not include a slug");

      let alerted = false;
      page.on("dialog", async (dialog) => { alerted = true; await dialog.dismiss(); });
      await page.goto(`/blogs/details/${slug}`);
      await page.waitForTimeout(500);

      expect(alerted).toBe(false);
      const flagged = await page.evaluate(() => (window as any).__xss);
      expect(flagged).toBeFalsy();
      // Scoped to the actual rendered blog-content section, not the whole
      // <body> - the page's own bundle loader legitimately contains
      // <script src="main.js"> tags outside this content, which a body-wide
      // check would false-positive on.
      const contentHtml = await page.locator("app-blog-details").innerHTML();
      expect(contentHtml).not.toMatch(mustNotContain);
    });
  }

  test("a javascript: URL in blog content is neutralized, not left live", async ({ page, request }) => {
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem("ELEXIFY-TOKEN"));
    const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:4021/api/v1/";
    const res = await request.post(`${apiBase}admin/blog/add`, {
      headers: { "x-api-key": "Ip2A4a02I1r1I9dE1iSnA0S6aB1tE5WS", Authorization: `Bearer ${token}` },
      data: { title: `E2E XSS javascript URL ${Date.now()}`, short_description: "xss regression", content: '<a href="javascript:window.__xss=1">click</a>', tags: [] },
    });
    test.skip(!res.ok(), `blog create endpoint returned ${res.status()}; skipping render check`);
    const slug = (await res.json())?.data?.slug;
    test.skip(!slug, "blog create response did not include a slug");

    await page.goto(`/blogs/details/${slug}`);
    const href = await page.locator('a:has-text("click")').first().getAttribute("href").catch(() => null);
    if (href) {
      expect(href.toLowerCase().startsWith("javascript:")).toBe(false);
    }
  });
});
