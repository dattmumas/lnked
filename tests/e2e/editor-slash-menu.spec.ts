import { test, expect } from '@playwright/test';

test.describe('Editor slash menu', () => {
  test('opens component picker on /', async ({ page }) => {
    await page.goto('/test-editor');
    const editor = page.locator('.editor [contenteditable="true"]');
    await editor.click();
    await page.keyboard.type('/');
    const menu = page.locator('.component-picker-menu');
    await expect(menu).toBeVisible();
    await expect(menu).toContainText('Paragraph');
    await expect(menu).toContainText('Heading 1');
  });
});
