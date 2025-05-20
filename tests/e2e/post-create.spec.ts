import { test, expect } from '@playwright/test'

test.describe('Create Post flow', () => {
  test('redirects unauthenticated user to sign-in', async ({ page }) => {
    await page.goto('/posts/new')
    await expect(page).toHaveURL(/sign-in/)
  })
})
