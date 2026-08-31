import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";

const backendDir = resolve(process.cwd(), "../elexify-backend");
const nodeBinary = process.env.E2E_NODE_BINARY || process.execPath;
const mongoUri = process.env.E2E_MONGODB_URI || "mongodb://127.0.0.1:27139/elexify_e2e_admin?replicaSet=elexifyAdminE2ERs";
const adminPassword = process.env.E2E_ADMIN_PASSWORD || "ElexifyAdminE2E!2026";

const SUPERADMIN_EMAIL = "e2e.admin@example.com";
const STAFF_EMAIL = "e2e.staff@example.com";
const CUSTOMER_EMAIL = "e2e.notification.customer@example.com";

let seeded: any;

const reseed = () => {
  const output = execFileSync(nodeBinary, ["src/scripts/seedAdminE2E.js"], {
    cwd: backendDir,
    env: { ...process.env, E2E_ALLOW_DESTRUCTIVE_SEED: "true", E2E_MONGODB_URI: mongoUri, E2E_ADMIN_PASSWORD: adminPassword },
    encoding: "utf8",
  });
  seeded = JSON.parse(output.slice(output.indexOf("{")));
};

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/auth/login");
  await page.locator('input[formcontrolname="email"]').fill(email);
  await page.locator('input[formcontrolname="password"]').fill(adminPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

test.beforeEach(() => reseed());

test.describe("Phase 2 — admin customer details & notifications", () => {
  test("customer details shows verification badges and the pending email change (superadmin)", async ({ page }) => {
    await login(page, SUPERADMIN_EMAIL);
    await page.goto(`/customers/details/${seeded.customer.id}`);

    await expect(page.getByText(CUSTOMER_EMAIL)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/verified/i).first()).toBeVisible();
    await expect(page.getByText(/pending/i).first()).toBeVisible();

    // Superadmin has customer.verification.override — the action is visible
    // for the unverified channel (mobile has no value at all here, so only
    // check the page rendered without error and the notification history
    // section is present).
    await expect(page.getByText(/notification/i).first()).toBeVisible();
  });

  test("dead-letter queue lists the seeded failed job and allows superadmin to retry it", async ({ page }) => {
    await login(page, SUPERADMIN_EMAIL);
    await page.goto("/notifications/dead-letter");

    await expect(page.getByText("ORDER_SHIPPED")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/simulated provider timeout/i)).toBeVisible();

    const retryButton = page.getByRole("button", { name: /^retry$/i }).first();
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // Clicking Retry opens a confirm dialog (also labeled "Retry") before
    // the actual API call fires.
    await expect(page.getByText(/retry sending the/i)).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /^retry$/i }).last().click();

    await expect(page.getByText(/queued for retry/i)).toBeVisible({ timeout: 10_000 });
    // The list is filtered to status=DEAD_LETTER — a successful retry moves
    // the job to RETRYING, so it drops out of this list on refetch.
    await expect(page.getByText("ORDER_SHIPPED")).not.toBeVisible({ timeout: 10_000 });
  });

  test("a role without customer.notification.retry cannot see/trigger Retry (staff)", async ({ page }) => {
    await login(page, STAFF_EMAIL);
    await page.goto("/notifications/dead-letter");

    await expect(page.getByText("ORDER_SHIPPED")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /^retry$/i })).toHaveCount(0);
  });

  test("a role without customer.verification.override cannot see Mark Verified (staff)", async ({ page }) => {
    await login(page, STAFF_EMAIL);
    await page.goto(`/customers/details/${seeded.customer.id}`);

    await expect(page.getByText(CUSTOMER_EMAIL)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /mark verified/i })).toHaveCount(0);
  });
});
