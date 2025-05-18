import { test, expect } from "@playwright/test";

// Simple smoke test: sign up ➜ sign in ➜ redirect dashboard

test("user can sign-up, sign-in, and reach dashboard", async ({ page }) => {
  // Replace with unique email per run (timestamp)
  const email = `playwright_${Date.now()}@example.com`;
  const password = "pw123456";

  // Sign-up flow
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign up/i }).click();

  // Expect redirect to dashboard or success message
  await page.waitForURL(/dashboard/);
  await expect(page).toHaveURL(/dashboard/);

  // Log out
  await page.getByRole("button", { name: /sign out/i }).click();

  // Sign-in flow
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/);
});
