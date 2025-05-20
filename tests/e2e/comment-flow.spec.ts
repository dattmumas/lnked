import { test, expect } from '@playwright/test'

test.describe('Comment flow', () => {
  test('requires login to comment', async ({ page }) => {
    await page.goto('/')
    const firstPost = page.locator('article').first()
    await firstPost.getByRole('link', { name: /read more/i }).click()
    await page.getByPlaceholder('Add a comment').click()
    await expect(page).toHaveURL(/sign-in/)
  })
})
