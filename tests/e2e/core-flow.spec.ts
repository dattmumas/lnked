import { test, expect } from "@playwright/test";

const UI_URL = process.env.PLAYWRIGHT_UI_URL || "http://localhost:3000";
const TEST_USER_EMAIL = `testuser_${Date.now()}@example.com`;
const TEST_USER_PASSWORD = "password123";
const TEST_COLLECTIVE_NAME = `Test Collective ${Date.now()}`;
const TEST_COLLECTIVE_SLUG = `test-collective-${Date.now()}`;
const TEST_POST_TITLE = "My First E2E Post";
const TEST_POST_CONTENT = "This is the content of the first E2E post.";

test.describe("Core User Flow: Signup, Create Collective, Publish Post", () => {
  test("should allow a user to sign up, create a collective, and publish a post", async ({
    page,
  }) => {
    // 1. Sign Up
    await page.goto(`${UI_URL}/sign-up`);
    await page.fill("input[id=fullName]", "Test User");
    await page.fill("input[id=email]", TEST_USER_EMAIL);
    await page.fill("input[id=password]", TEST_USER_PASSWORD);
    await page.click("button[type=submit]");
    // Wait for successful signup message or redirect to a page that indicates success (e.g., dashboard or verify email page)
    // For now, we'll assume a redirect to dashboard indicates success or auto-verification for test users.
    await expect(page).toHaveURL(`${UI_URL}/`, { timeout: 10000 }); // Or dashboard, or specific landing after signup
    // It might be better to check for a specific element on the dashboard page
    // await expect(page.locator("h1:has-text('Management Dashboard')")).toBeVisible();

    // 2. Create a Collective
    // Navigate to the dashboard if not already there
    if (page.url() !== `${UI_URL}/dashboard`) {
      await page.goto(`${UI_URL}/dashboard`);
    }
    await expect(
      page.locator("h1:has-text('Management Dashboard')")
    ).toBeVisible();
    await page.click("a[href='/dashboard/collectives/new']");

    await expect(
      page.locator("h1:has-text('Create New Collective')")
    ).toBeVisible();
    await page.fill("input[id=name]", TEST_COLLECTIVE_NAME);
    // Slug should auto-fill or be manually entered. For this test, assume manual or check auto-fill behavior.
    // await page.fill("input[id=slug]", TEST_COLLECTIVE_SLUG);
    await page.fill(
      "textarea[id=description]",
      "A test collective created by Playwright."
    );
    await page.click("button[type=submit]");

    // Expect to be redirected to the dashboard or the new collective's page.
    // For now, check for dashboard and presence of the new collective.
    await expect(
      page.locator("h1:has-text('Management Dashboard')")
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator(`h3:has-text("${TEST_COLLECTIVE_NAME}")`)
    ).toBeVisible();

    // 3. Publish a Post to the Collective
    // Find the "Add Post to Collective" button for the newly created collective.
    // This requires a more specific selector if multiple collectives exist.
    // For simplicity, we assume it's the first or only one matching.
    const collectiveCard = page
      .locator('div.grid > div > div:has-text("' + TEST_COLLECTIVE_NAME + '")')
      .first();
    // This selector might need adjustment based on the actual DOM structure of collective cards on dashboard
    // A more robust way is to add data-testid attributes.
    // For now, let's assume the link can be found within the card or there's a unique href.
    // Click the "Add Post to Collective" button for the new collective.
    // The href would be like /dashboard/[collectiveId]/new-post
    // We need to get the collectiveId or have a more direct link.
    // Simpler: click the card, then click add post. Or directly go to new post page if URL is predictable.
    // For now, we will look for the specific link within the card that contains the collective name.
    const newPostLink = collectiveCard.locator(
      "a:has-text('Add Post to Collective')"
    );
    await newPostLink.click();

    await expect(
      page.locator("h1:has-text('Create New Post for')")
    ).toBeVisible(); // Page title should indicate new post for the collective
    await page.fill("input[id=title]", TEST_POST_TITLE);
    // For the Tiptap editor, direct fill might not work. Need to target the contenteditable area.
    await page.locator(".ProseMirror").fill(TEST_POST_CONTENT);
    await page.click("button[type=submit]:has-text('Publish')"); // Or 'Create Post' if that's the text

    // 4. Verify Post
    // After publishing, user might be redirected to the post page or collective page.
    // We expect to see the post title on the collective's page.
    await page.goto(`${UI_URL}/${TEST_COLLECTIVE_SLUG}`); // Assuming slug is predictable or obtained
    await expect(page.locator(`h2:has-text("${TEST_POST_TITLE}")`)).toBeVisible(
      { timeout: 10000 }
    );
    await expect(
      page.locator(`p:has-text("${TEST_POST_CONTENT.substring(0, 50)}")`)
    ).toBeVisible(); // Check for truncated content

    // Clean up (optional - depends on test environment strategy)
    // For example, delete the user or the collective/post if the backend supports it via API for tests.
  });
});
