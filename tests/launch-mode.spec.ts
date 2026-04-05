import { expect, test } from "@playwright/test";

test.describe("AstraOps Launch Mode Wizard", () => {
  test("should complete full autonomous launch flow", async ({ page }) => {
    await page.route("**/api/cloud/connect", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connection: {
            id: "conn-1",
            provider: "aws",
            status: "connected",
            validatedAt: new Date().toISOString(),
          },
        }),
      });
    });
    await page.route("**/api/org/organizations", async (route) => {
      const req = route.request().postDataJSON() as { name?: string };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ organization: { id: "org-1", name: req?.name ?? "Acme" } }),
      });
    });
    await page.route("**/api/org/projects", async (route) => {
      const req = route.request().postDataJSON() as { name?: string; orgId?: string };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ project: { id: "proj-1", name: req?.name ?? "Payments", organizationId: req?.orgId ?? "org-1" } }),
      });
    });
    await page.route("**/api/org/environments", async (route) => {
      const req = route.request().postDataJSON() as { name?: string; projectId?: string };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ environment: { id: "env-1", name: req?.name ?? "prod-eu", projectId: req?.projectId ?? "proj-1" } }),
      });
    });
    await page.route("**/api/environment-policy/current", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          policy: {
            orgId: "org-1",
            projectId: "proj-1",
            envId: "env-1",
            tier: "staging",
            approvalRequired: false,
            maxActionsPerHour: 40,
            monthlyBudgetUsd: 5000,
            blastRadius: "medium",
            sloAvailabilityTarget: 99.9,
            autoRollback: true,
            complianceTags: ["internal", "soc2"],
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("quantumops_jwt", "astraops_e2e_token");
      window.localStorage.setItem("astraops_e2e_bypass_auth", "1");
    });
    await page.goto("/launch-setup");

    const continueBtn = page.getByTestId("continue-btn");
    await expect(continueBtn).toBeEnabled();

    await page.getByTestId("org-input").fill("");
    await page.getByTestId("project-input").fill("");
    await page.getByTestId("env-input").fill("");
    await expect(continueBtn).toBeDisabled();

    await page.getByTestId("org-input").fill("Acme");
    await page.getByTestId("project-input").fill("Payments");
    await page.getByTestId("env-input").fill("prod-eu");
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    await expect(page.getByText("Step 2 · Cloud Connect")).toBeVisible();
    await page.getByTestId("connect-aws").click();
    await expect(page.getByTestId("cloud-connected-state")).toHaveText("Connected");

    await page.getByTestId("continue-btn").click();

    await expect(page.getByText("Step 3 · AI Guardrails")).toBeVisible();
    await page.getByRole("button", { name: "balanced" }).click();

    const launchBtn = page.getByTestId("launch-btn");
    await expect(launchBtn).toBeEnabled();
    await launchBtn.click();

    await expect(page.getByText("Launch Summary")).toBeVisible();
    await expect(page.getByText(/Organization: Acme/i)).toBeVisible();
    await expect(page.getByText(/Project: Payments/i)).toBeVisible();
    await expect(page.getByText(/Environment: prod-eu/i)).toBeVisible();
  });
});
