import { test, expect } from "@playwright/test";

// Minimal regression test for dashboard navigation

test("redirects unauthenticated user to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/sign-in/);
});
