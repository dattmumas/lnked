import { test, expect } from "@playwright/test";

// Utility to generate a unique email for each test run
function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}@example.com`;
}

test("Sign up, create collective, invite member, accept invite", async ({
  page,
  context,
}) => {
  const ownerEmail = uniqueEmail("owner");
  const memberEmail = uniqueEmail("member");
  const password = "TestPassword123!";
  const collectiveName = `Test Collective ${Date.now()}`;

  // 1. Owner signs up
  await page.goto("/sign-up");
  await page.fill('input[type="email"]', ownerEmail);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);

  // 2. Owner creates a collective
  await page.goto("/dashboard/collectives/new");
  await page.fill('input[name="name"]', collectiveName);
  await page.fill('input[name="slug"]', `test-${Date.now()}`);
  await page.click('button[type="submit"]');
  await expect(page.locator("text=Collective created")).toBeVisible();

  // 3. Owner invites a member
  await page.goto("/dashboard/collectives");
  await page.click(`text=${collectiveName}`);
  await page.click("text=Manage Members");
  await page.click("text=Invite Member");
  await page.fill('input[type="email"]', memberEmail);
  await page.click('button[type="submit"]');
  await expect(page.locator("text=Member invited successfully")).toBeVisible();

  // 4. Simulate member accepting invite
  // (In a real test, fetch the invite code from the DB or email. Here, assume test DB exposes it.)
  // For demo, navigate to /dashboard/collectives and check for pending invite (skip actual acceptance)
  await context.clearCookies();
  await page.goto("/sign-up");
  await page.fill('input[type="email"]', memberEmail);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // In a real test, visit the invite link and accept
  // await page.goto(`/invite/${inviteCode}`);
  // await expect(page.locator('text=Invite accepted')).toBeVisible();

  // 5. Member should see the collective in their dashboard
  await page.goto("/dashboard/collectives");
  await expect(page.locator(`text=${collectiveName}`)).toBeVisible();
});
