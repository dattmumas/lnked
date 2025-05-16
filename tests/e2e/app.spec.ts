import { test, expect } from "@playwright/test";

// Base URL is set in playwright.config.ts

test.describe("Lnked E2E Flow", () => {
  const collectiveSlug = `e2e-test-collective-${Date.now()}`;
  const collectiveName = `E2E Test Collective ${Date.now()}`;
  const postTitle = `My First E2E Post - ${Date.now()}`;

  test("Sign-up, create collective, publish post", async ({ page }) => {
    // 1. Sign-up Flow
    await page.goto("/sign-up");
    await page.fill("input[id=fullName]", "E2E Test User");
    const uniqueEmail = `e2e_testuser_${Date.now()}@example.com`;
    await page.fill("input[id=email]", uniqueEmail);
    await page.fill("input[id=password]", "Password123!"); // Use a slightly more complex password
    await page.click("button[type=submit]");

    await expect(
      page.getByText(
        /Sign up successful! Redirecting...|Dashboard|Please check your email to confirm your account/
      )
    ).toBeVisible({ timeout: 15000 });

    // Handle potential email confirmation step by navigating to dashboard.
    // In a real scenario, this would involve email interaction or a test-specific bypass.
    if (!page.url().includes("/dashboard")) {
      console.log(
        "Sign-up completed, attempting to navigate to dashboard. Email confirmation might be pending."
      );
      await page.goto("/dashboard");
    }
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible(
      { timeout: 10000 }
    );
    console.log("Successfully signed up and navigated to Dashboard.");

    // 2. Create Collective Flow
    // Assuming a link/button on the dashboard to create a new collective
    // Replace with actual selectors
    await page
      .getByRole("link", { name: /New Collective|Create Collective/i })
      .click();
    await expect(page).toHaveURL(/.*\/dashboard\/collectives\/new/, {
      timeout: 10000,
    });
    console.log("Navigated to New Collective page.");

    await page.fill("input[id=name]", collectiveName); // Assuming id=name for collective name input
    // Slug might be auto-generated or require manual input. Assuming auto or prefilled for now.
    // If manual: await page.fill('input[id=slug]', collectiveSlug);
    await page.fill(
      "textarea[id=description]",
      "This is an E2E test collective description."
    ); // Assuming id=description
    // Tags might be a more complex input
    // await page.fill('input[id=tags]', 'e2e, test');
    await page
      .getByRole("button", { name: /Create Collective|Save Collective/i })
      .click();

    // Wait for redirection to the collective's page or a success message
    // This URL will depend on your routing for new collectives
    // await expect(page).toHaveURL(new RegExp(`.*\/${collectiveSlug}`), { timeout: 20000 }); // Or check for heading
    // Corrected: Check for heading first as URL might not be stable or exact immediately.
    await expect(
      page.getByRole("heading", { name: collectiveName })
    ).toBeVisible({ timeout: 20000 });
    // Then, optionally assert parts of the URL if needed and stable.
    // await expect(page.url()).toMatch(new RegExp(`.*\/${collectiveSlug}`));
    console.log(`Collective "${collectiveName}" created successfully.`);

    // 3. Publish Post Flow
    // Assuming there's a button/link on the collective page to create a new post
    // Replace with actual selectors
    await page.getByRole("link", { name: /New Post|Create Post/i }).click();
    await expect(page).toHaveURL(
      new RegExp(`.*\/${collectiveSlug}\/new-post`),
      { timeout: 10000 }
    );
    console.log("Navigated to New Post page for the collective.");

    await page.fill("input[id=title]", postTitle); // Assuming id=title for post title input
    // Filling Tiptap editor content - the selector '.ProseMirror' is common
    await page
      .locator(".ProseMirror")
      .fill("This is the content of the first E2E post.");
    await page.getByRole("button", { name: /Publish|Create Post/i }).click();

    // Wait for redirection to the post's page or a success message
    // This URL will depend on your routing for new posts
    // Example: await expect(page).toHaveURL(new RegExp(`.*\/posts\/[^\/]+`), { timeout: 20000 });
    await expect(page.getByRole("heading", { name: postTitle })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText("This is the content of the first E2E post.")
    ).toBeVisible();
    console.log(`Post "${postTitle}" published successfully.`);

    console.log(
      "E2E flow: Sign-up, create collective, publish post completed successfully."
    );
  });
});
