import { test, expect } from '@playwright/test';

test.describe('Post Editor E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is authenticated (could add login steps if needed)
    await page.goto('/posts/new');
  });

  test('can create and publish a post with rich text', async ({ page }) => {
    // Fill in title
    await page.fill(
      'input[placeholder="Post title..."]',
      'My First TipTap Post',
    );

    // Click into the editor
    const editor = page.locator('[aria-label="Post content"]');
    await editor.click();

    // Type some text with formatting
    await editor.type('This is my post with ');

    // Use keyboard shortcut for bold
    await page.keyboard.press('Control+b');
    await editor.type('bold text');
    await page.keyboard.press('Control+b');

    await editor.type(' and regular text.');

    // Click Publish
    await page.click('text=Publish');

    // Expect to be redirected to posts list or the new post's page
    await page.waitForURL(/\/posts/);

    // Verify that the new content appears on the page with formatting
    const contentHTML = await page.innerHTML('.prose');
    expect(contentHTML).toContain('<strong>bold text</strong>');
    expect(contentHTML).toContain('and regular text.');
  });

  test('can use slash commands', async ({ page }) => {
    // Fill in title
    await page.fill('input[placeholder="Post title..."]', 'Slash Command Test');

    // Click into the editor
    const editor = page.locator('[aria-label="Post content"]');
    await editor.click();

    // Type slash to trigger menu
    await editor.type('/');

    // Wait for slash command menu to appear
    await page.waitForSelector('text=Heading 1');

    // Click on Heading 1
    await page.click('text=Heading 1');

    // Type heading text
    await editor.type('My Heading');

    // Press Enter to go to next line
    await page.keyboard.press('Enter');

    // Type regular paragraph
    await editor.type('This is a regular paragraph.');

    // Use slash command for bullet list
    await page.keyboard.press('Enter');
    await editor.type('/bullet');
    await page.waitForSelector('text=Bullet List');
    await page.click('text=Bullet List');

    // Type list items
    await editor.type('First item');
    await page.keyboard.press('Enter');
    await editor.type('Second item');

    // Save as draft
    await page.click('text=Save Draft');

    // Verify content structure
    const content = await editor.innerHTML();
    expect(content).toContain('<h1');
    expect(content).toContain('My Heading');
    expect(content).toContain('<ul>');
    expect(content).toContain('<li>');
  });

  test('collaboration: two users see each other edits', async ({ browser }) => {
    // Launch two browser contexts to simulate two users
    const userA = await browser.newContext();
    const userB = await browser.newContext();
    const pageA = await userA.newPage();
    const pageB = await userB.newPage();

    // Both open the same post edit page
    await pageA.goto('/posts/123/edit');
    await pageB.goto('/posts/123/edit');

    // User A types something
    await pageA
      .getByRole('textbox', { name: /post content/i })
      .type('Hello from User A');

    // User B should see the text appear (wait for Yjs update propagation)
    await pageB.waitForFunction(() => {
      const element = document.querySelector(
        '[aria-label="Post content"]',
      ) as HTMLElement;
      return element && element.innerText.includes('Hello from User A');
    });

    // User B types something
    await pageB
      .getByRole('textbox', { name: /post content/i })
      .type(' and hello from User B!');

    // User A should see User B's text
    await pageA.waitForFunction(() => {
      const element = document.querySelector(
        '[aria-label="Post content"]',
      ) as HTMLElement;
      return element && element.innerText.includes('and hello from User B!');
    });

    await userA.close();
    await userB.close();
  });
});
