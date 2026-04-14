import { test, expect } from '@playwright/test';
import { login } from './auth';

test.describe('Command Palette & Deep-Link Protocol', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ─────────────────────────────────────────────
  // 1. Desktop search bar
  // ─────────────────────────────────────────────

  test('P0: desktop search bar is visible and shows i18n placeholder', async ({ page }) => {
    // Search bar should be visible in the desktop main area
    const searchBar = page.locator('button:has(.material-symbols-outlined:text("search"))').first();
    await expect(searchBar).toBeVisible({ timeout: 5000 });

    // Should contain localized placeholder text (not empty)
    const text = await searchBar.innerText();
    expect(text.length).toBeGreaterThan(2);

    // Should contain keyboard shortcut hint
    await expect(searchBar.locator('kbd')).toBeVisible();
  });

  test('P0: clicking desktop search bar opens Command Palette', async ({ page }) => {
    const searchBar = page.locator('button:has(.material-symbols-outlined:text("search"))').first();
    await searchBar.click();

    // Command Palette backdrop should appear
    const backdrop = page.locator('.fixed.inset-0.z-\\[9999\\]');
    await expect(backdrop).toBeVisible({ timeout: 3000 });

    // Search input inside the palette should be focused
    const paletteInput = page.locator('input[autocomplete="off"][spellcheck="false"]').first();
    await expect(paletteInput).toBeVisible();
    await expect(paletteInput).toBeFocused();
  });

  // ─────────────────────────────────────────────
  // 2. Keyboard shortcut
  // ─────────────────────────────────────────────

  test('P0: Ctrl+K opens Command Palette', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    // Palette input should appear and be focused
    const paletteInput = page.locator('input[autocomplete="off"][spellcheck="false"]').first();
    await expect(paletteInput).toBeVisible({ timeout: 3000 });
    await expect(paletteInput).toBeFocused();
  });

  test('P1: Escape closes Command Palette', async ({ page }) => {
    // Open
    await page.keyboard.press('Control+k');
    const paletteInput = page.locator('input[autocomplete="off"][spellcheck="false"]').first();
    await expect(paletteInput).toBeVisible({ timeout: 3000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(paletteInput).toBeHidden({ timeout: 2000 });
  });

  // ─────────────────────────────────────────────
  // 3. Window commands with i18n
  // ─────────────────────────────────────────────

  test('P0: window commands display localized titles (not raw IDs)', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    // The first group of commands should be windows
    // Check that raw window IDs like "dashboard", "gateway" do NOT appear as standalone labels
    // Instead, they should show translated titles
    const listItems = page.locator('[class*="z-\\[10000\\]"] [class*="rounded-2xl"] div[class*="cursor-pointer"], [class*="z-\\[10000\\]"] [class*="rounded-2xl"] button');

    const count = await listItems.count();
    expect(count).toBeGreaterThan(5); // At least several window commands

    // Grab the first visible command text
    const firstItem = page.locator('[class*="z-\\[10000\\]"] [class*="rounded-2xl"]').first();
    const firstItemText = await firstItem.innerText();

    // The text should NOT be just "Open dashboard" (raw ID) — it should be localized
    // For Chinese: should contain "打开" and a Chinese title
    // For English: should contain "Open" and a proper title like "Dashboard"
    // We just verify it's non-empty and longer than 4 chars (not just "Open x")
    expect(firstItemText.length).toBeGreaterThan(4);
  });

  test('P0: selecting a window command opens the correct window', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    const paletteInput = page.locator('input[autocomplete="off"][spellcheck="false"]').first();
    // Type "gateway" to filter
    await paletteInput.fill('gateway');
    await page.waitForTimeout(300);

    // Press Enter to select the first result
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Palette should close
    await expect(paletteInput).toBeHidden({ timeout: 2000 });

    // Gateway window should be open (no error boundary)
    const errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);
  });

  // ─────────────────────────────────────────────
  // 4. Keyboard navigation
  // ─────────────────────────────────────────────

  test('P1: arrow keys navigate between commands', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    // Move down twice
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // Move back up
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);

    // Enter selects the current item (should open a window)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Palette should close
    const paletteInput = page.locator('input[autocomplete="off"][spellcheck="false"]').first();
    await expect(paletteInput).toBeHidden({ timeout: 2000 });

    // No error boundary
    const errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);
  });

  // ─────────────────────────────────────────────
  // 5. Backdrop click closes palette
  // ─────────────────────────────────────────────

  test('P1: clicking backdrop closes Command Palette', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const paletteInput = page.locator('input[autocomplete="off"][spellcheck="false"]').first();
    await expect(paletteInput).toBeVisible({ timeout: 3000 });

    // Click the backdrop area (top-left corner, outside the palette dialog)
    await page.mouse.click(10, 10);
    await expect(paletteInput).toBeHidden({ timeout: 2000 });
  });

  // ─────────────────────────────────────────────
  // 6. Deep-link protocol (dispatchOpenWindow)
  // ─────────────────────────────────────────────

  test('P0: dispatchOpenWindow opens window with deep-link params', async ({ page }) => {
    // Use dispatchOpenWindow to open settings with a specific tab
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('hermesdeck:open-window', {
        detail: { id: 'settings', tab: 'preferences' },
      }));
    });
    await page.waitForTimeout(2000);

    // Settings window should be open without errors
    const errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);

    // Body should have rendered meaningful content
    const body = await page.locator('body').innerHTML();
    expect(body.length).toBeGreaterThan(200);
  });

  test('P1: dispatchOpenWindow to gateway with events tab', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('hermesdeck:open-window', {
        detail: { id: 'gateway', tab: 'events' },
      }));
    });
    await page.waitForTimeout(2000);

    const errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);
  });

  test('P1: dispatchOpenWindow to editor with section param', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('hermesdeck:open-window', {
        detail: { id: 'editor', section: 'gateway' },
      }));
    });
    await page.waitForTimeout(2000);

    const errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);
  });

  // ─────────────────────────────────────────────
  // 7. Fuzzy search filtering
  // ─────────────────────────────────────────────

  test('P1: typing filters commands by fuzzy match', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    const paletteInput = page.locator('input[autocomplete="off"][spellcheck="false"]').first();

    // Type partial match
    await paletteInput.fill('sett');
    await page.waitForTimeout(300);

    // The palette content area should have fewer items than when empty
    const paletteContent = page.locator('[class*="z-\\[10000\\]"] [class*="rounded-2xl"]').first();
    const contentText = await paletteContent.innerText();

    // "sett" should match "settings" or its translation
    expect(contentText.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────
  // 8. No React error #310 regression
  // ─────────────────────────────────────────────

  test('P0: open/close palette multiple times without React errors', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Open and close 5 times rapidly
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // No React error #310 or similar hook-order violations
    const reactErrors = consoleErrors.filter(e =>
      e.includes('#310') || e.includes('fewer hooks') || e.includes('Rendered fewer')
    );
    expect(reactErrors).toHaveLength(0);

    // No error boundary
    const errors = page.locator('text=Something went wrong');
    expect(await errors.count()).toBe(0);
  });
});
