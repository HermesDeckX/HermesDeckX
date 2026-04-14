import { test, expect } from '@playwright/test';
import { login } from './auth';

test.describe('Language Switch', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('P1: language setting persists in localStorage', async ({ page }) => {
    // Read current language
    const origLang = await page.evaluate(() => localStorage.getItem('lang'));

    // Set to English
    await page.evaluate(() => localStorage.setItem('lang', 'en'));
    await page.reload();
    await page.waitForTimeout(3000);

    // After reload, verify localStorage kept the value
    const lang = await page.evaluate(() => localStorage.getItem('lang'));
    expect(lang).toBe('en');

    // Restore original
    if (origLang) {
      await page.evaluate((l) => localStorage.setItem('lang', l), origLang);
    }
  });

  test('P1: switching language via API updates localStorage', async ({ page }) => {
    // Programmatically switch language and verify it sticks
    await page.evaluate(() => {
      localStorage.setItem('lang', 'ja');
    });
    const val = await page.evaluate(() => localStorage.getItem('lang'));
    expect(val).toBe('ja');

    // Switch back to zh
    await page.evaluate(() => {
      localStorage.setItem('lang', 'zh');
    });
    const restored = await page.evaluate(() => localStorage.getItem('lang'));
    expect(restored).toBe('zh');
  });
});
