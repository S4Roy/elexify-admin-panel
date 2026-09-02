import { test, expect, Page, Route } from "@playwright/test";

// The Data Operations backend (`admin/data-operations*`) is being built in
// a parallel repo and did not exist yet when this spec was written — there
// is no seed script to reseed a real registry against. Every endpoint in
// this file is therefore served via page.route() interception rather than
// a live backend, following the same pattern already used in
// admin-security-regression.spec.ts for the 401-interceptor test. Login
// still goes through the real seeded backend (see phase2-notifications.spec.ts
// / admin-security-regression.spec.ts), since auth is unrelated to this
// feature and already works. Once the real backend lands, these
// page.route() mocks should be replaced by (or run alongside) a proper
// reseed-based flow the way the other specs in this folder do.

const SUPERADMIN_EMAIL = "e2e.admin@example.com";
const STAFF_EMAIL = "e2e.staff@example.com";
const ADMIN_PASSWORD = "ElexifyAdminE2E!2026";

async function login(page: Page, email: string) {
  await page.goto("/auth/login");
  await page.locator('input[formcontrolname="email"]').fill(email);
  await page.locator('input[formcontrolname="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

function jsonBody(data: unknown) {
  return JSON.stringify({ status: true, message: "ok", data });
}

const EMAIL_TEMPLATES_OP = {
  key: "email-templates",
  name: "Email Templates Seed",
  description: "Seeds default email template actions.",
  type: "SEEDER",
  category: "Content",
  version: "1",
  required: true,
  idempotent: true,
  risk: "LOW",
  allowedEnvironments: ["development", "staging", "production"],
  dependencies: [],
  supportsDryRun: true,
  requiresConfirmation: false,
  health: { status: "HEALTHY", expected: 12, valid: 12, missing: 0 },
  lastExecution: { status: "SUCCESS", completed_at: "2026-08-01T00:00:00Z", result: { inserted: 12 } },
};

const TEST_ONLY_OP = {
  key: "dev-fixtures",
  name: "Dev Fixtures Loader",
  description: "Loads sample fixtures for local development only.",
  type: "SEEDER",
  category: "Dev Tools",
  version: "1",
  required: false,
  idempotent: true,
  risk: "MEDIUM",
  allowedEnvironments: ["development"],
  dependencies: [],
  supportsDryRun: false,
  requiresConfirmation: false,
  health: { status: "NOT_APPLICABLE" },
  lastExecution: null,
};

const OPERATIONS_LIST = [EMAIL_TEMPLATES_OP, TEST_ONLY_OP];

/** Wires every admin/data-operations* endpoint used by the feature. */
async function mockDataOperationsApi(
  page: Page,
  opts: {
    runBehavior?: "success" | "already-running" | "env-restricted";
    executionStatusSequence?: string[];
  } = {},
) {
  const executionId = "exec-e2e-1";
  let pollCount = 0;
  const statusSequence = opts.executionStatusSequence ?? ["RUNNING", "SUCCESS"];
  let secondRunCalled = false;

  await page.route("**/api/v1/admin/data-operations", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: jsonBody({ environment: "staging", operations: OPERATIONS_LIST }),
    });
  });

  await page.route("**/api/v1/admin/data-operations/email-templates", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: jsonBody({ ...EMAIL_TEMPLATES_OP, previousExecutions: [] }),
    });
  });

  await page.route("**/api/v1/admin/data-operations/email-templates/health", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: jsonBody(EMAIL_TEMPLATES_OP.health) });
  });

  await page.route("**/api/v1/admin/data-operations/email-templates/dry-run", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: jsonBody({
        execution_id: "dry-run-1",
        result: { wouldInsert: 2, wouldUpdate: 1, wouldSkip: 9, wouldDelete: 0 },
        logs: [
          { level: "INFO", message: "Dry run started", timestamp: "2026-08-01T00:00:00Z" },
          { level: "INFO", message: "Would insert 2 templates", timestamp: "2026-08-01T00:00:01Z" },
        ],
      }),
    });
  });

  await page.route("**/api/v1/admin/data-operations/email-templates/run", async (route: Route) => {
    if (opts.runBehavior === "env-restricted") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ code: "OPERATION_NOT_ALLOWED_IN_ENVIRONMENT", message: "Not allowed in this environment" }),
      });
      return;
    }
    if (opts.runBehavior === "already-running") {
      if (!secondRunCalled) {
        secondRunCalled = true;
        await route.fulfill({ status: 200, contentType: "application/json", body: jsonBody({ execution_id: executionId, status: "QUEUED" }) });
      } else {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ code: "OPERATION_ALREADY_RUNNING", message: "Already running" }),
        });
      }
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: jsonBody({ execution_id: executionId, status: "QUEUED" }) });
  });

  await page.route(`**/api/v1/admin/data-operations/executions/${executionId}/logs`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: jsonBody({
        logs: [
          { level: "INFO", message: "Execution started", timestamp: "2026-08-01T00:00:00Z" },
          { level: "WARN", message: "Skipped a duplicate row", timestamp: "2026-08-01T00:00:01Z" },
        ],
      }),
    });
  });

  await page.route(`**/api/v1/admin/data-operations/executions/${executionId}`, async (route: Route) => {
    const status = statusSequence[Math.min(pollCount, statusSequence.length - 1)];
    pollCount++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: jsonBody({
        execution_id: executionId,
        operation_key: "email-templates",
        operation_name: "Email Templates Seed",
        operation_type: "SEEDER",
        operation_version: "1",
        environment: "staging",
        status,
        trigger_source: "admin-ui",
        triggered_by: SUPERADMIN_EMAIL,
        started_at: "2026-08-01T00:00:00Z",
        completed_at: status === "SUCCESS" ? "2026-08-01T00:01:00Z" : null,
        duration_ms: status === "SUCCESS" ? 60000 : null,
        dry_run: false,
        result: status === "SUCCESS" ? { inserted: 2, updated: 1, skipped: 9, deleted: 0, warnings: 0 } : null,
        error: null,
      }),
    });
  });

  await page.route("**/api/v1/admin/data-operations/executions*", async (route: Route) => {
    if (route.request().url().includes(`/executions/${executionId}`)) {
      return route.fallback();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: jsonBody({
        items: [
          {
            execution_id: executionId,
            operation_key: "email-templates",
            operation_name: "Email Templates Seed",
            status: "SUCCESS",
            started_at: "2026-08-01T00:00:00Z",
            completed_at: "2026-08-01T00:01:00Z",
            duration_ms: 60000,
            trigger_source: "admin-ui",
            triggered_by: SUPERADMIN_EMAIL,
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
      }),
    });
  });
}

test.describe("Data Operations (mocked backend — real endpoints not live yet)", () => {
  test("nav opens Data Operations and the operations list is filterable by type", async ({ page }) => {
    await login(page, SUPERADMIN_EMAIL);
    await mockDataOperationsApi(page);

    await page.getByText("Settings").first().click();
    await page.getByText("Data Operations").click();
    await expect(page).toHaveURL(/\/settings\/data-operations/);

    await page.goto("/settings/data-operations/operations");
    await expect(page.getByText("Email Templates Seed")).toBeVisible();
    await expect(page.getByText("Dev Fixtures Loader")).toBeVisible();

    await page.getByRole("button", { name: "Seeders" }).click();
    await expect(page.getByText("Email Templates Seed")).toBeVisible();
    await expect(page.getByText("Dev Fixtures Loader")).toBeVisible();

    await page.getByRole("button", { name: "Migrations" }).click();
    await expect(page.getByText("Email Templates Seed")).not.toBeVisible();
  });

  test("operation detail shows health, dry run, run, logs, and execution history", async ({ page }) => {
    await login(page, SUPERADMIN_EMAIL);
    await mockDataOperationsApi(page);

    await page.goto("/settings/data-operations/operations/email-templates");
    await expect(page.getByText("Email Templates Seed")).toBeVisible();
    await expect(page.getByText("HEALTHY")).toBeVisible();

    await page.getByRole("button", { name: "Dry Run" }).click();
    await expect(page.getByText(/Insert: 2/)).toBeVisible();

    await page.getByRole("button", { name: "Run" }).click();
    await expect(page.getByText(/Run "Email Templates Seed"/)).toBeVisible();
    await page.getByRole("button", { name: "Run" }).last().click();

    await expect(page).toHaveURL(/\/settings\/data-operations\/executions\/exec-e2e-1/);
    await expect(page.getByText(/RUNNING|SUCCESS/)).toBeVisible();

    // Eventually the polled status flips to SUCCESS and shows result counts.
    await expect(page.getByText("SUCCESS")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Inserted: 2/)).toBeVisible();

    await expect(page.getByText("Execution started")).toBeVisible();

    await page.goto("/settings/data-operations/executions");
    await expect(page.getByText("Email Templates Seed")).toBeVisible();
  });

  test("a role without seeder-execute (staff) cannot see the Run action", async ({ page }) => {
    await login(page, STAFF_EMAIL);
    await mockDataOperationsApi(page);

    await page.goto("/settings/data-operations/operations");
    await expect(page.getByText("Email Templates Seed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Run" })).toHaveCount(0);
  });

  test("a TEST_ONLY-classified operation targeting production is rejected with 403", async ({ page }) => {
    await login(page, SUPERADMIN_EMAIL);
    await mockDataOperationsApi(page, { runBehavior: "env-restricted" });

    await page.goto("/settings/data-operations/operations/email-templates");
    await page.getByRole("button", { name: "Run" }).click();
    await page.getByRole("button", { name: "Run" }).last().click();

    await expect(page.getByText(/not allowed in this environment/i)).toBeVisible({ timeout: 10_000 });
  });

  test("firing two runs back-to-back surfaces the second as already-running (409)", async ({ page }) => {
    await login(page, SUPERADMIN_EMAIL);
    await mockDataOperationsApi(page, { runBehavior: "already-running" });

    await page.goto("/settings/data-operations/operations/email-templates");

    await page.getByRole("button", { name: "Run" }).click();
    await page.getByRole("button", { name: "Run" }).last().click();
    await expect(page).toHaveURL(/\/settings\/data-operations\/executions\/exec-e2e-1/);

    await page.goto("/settings/data-operations/operations/email-templates");
    await page.getByRole("button", { name: "Run" }).click();
    await page.getByRole("button", { name: "Run" }).last().click();

    await expect(page.getByText(/already running/i)).toBeVisible({ timeout: 10_000 });
  });
});
