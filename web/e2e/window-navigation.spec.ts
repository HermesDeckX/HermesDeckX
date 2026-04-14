import { test, expect } from '@playwright/test';
import { login, openWindow } from './auth';

test.describe('Window Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('P0: desktop loads after login without errors', async ({ page }) => {
    // After login, body should be visible and no error boundary
    await expect(page.locator('body')).toBeVisible();
    const errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);

    // The dock area should exist (bottom bar with icons)
    // Dock contains material icon buttons
    const body = await page.locator('body').innerHTML();
    expect(body.length).toBeGreaterThan(100); // page rendered meaningful content
  });

  test('P0: open editor and gateway windows without crash', async ({ page }) => {
    await openWindow(page, 'editor');
    await page.waitForTimeout(2000);

    // Verify no error boundary
    let errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);

    await openWindow(page, 'gateway');
    await page.waitForTimeout(1500);

    errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);
  });

  test('P1: open all main windows without crash', async ({ page }) => {
    const windowIds = ['editor', 'gateway', 'sessions', 'skills', 'agents', 'settings'];

    for (const id of windowIds) {
      await openWindow(page, id);
      await page.waitForTimeout(1500);

      const errors = page.locator('text=Something went wrong');
      expect(await errors.count(), `Window "${id}" triggered error boundary`).toBe(0);
    }
  });
});
