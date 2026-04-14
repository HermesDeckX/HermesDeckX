import { test, expect } from '@playwright/test';
import { login, openWindow } from './auth';

// Helper: open Editor window and wait for config to load
async function openEditor(page: import('@playwright/test').Page) {
  await openWindow(page, 'editor');
  // Wait for the editor sidebar to appear (section buttons inside <aside>)
  await page.locator('aside button').first().waitFor({ state: 'visible', timeout: 10_000 });
  // Wait for config to finish loading
  await page.waitForTimeout(2000);
}

// Helper: click a sidebar section by its material icon name
async function clickSection(page: import('@playwright/test').Page, iconName: string) {
  const btn = page.locator(`aside button:has(.material-symbols-outlined:text("${iconName}"))`);
  await btn.click();
  await page.waitForTimeout(800);
}

test.describe('Config Editor — Edit & Save', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openEditor(page);
  });

  test('P0: editor loads and shows sidebar with section buttons', async ({ page }) => {
    // Sidebar should have the active section highlighted
    const activeBtn = page.locator('aside button[aria-current="page"]');
    await expect(activeBtn).toBeVisible();

    // The editor header should have mode toggle buttons (远程/本地)
    const modeBtn = page.locator('button:has-text("远程"), button:has-text("Remote")');
    await expect(modeBtn.first()).toBeVisible();

    // The save button should exist (disabled by default)
    const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save")');
    await expect(saveBtn.first()).toBeVisible();

    // No error boundary should be visible
    const errorBoundary = page.locator('text=Something went wrong');
    expect(await errorBoundary.count()).toBe(0);
  });

  test('P0: switch between multiple sections without errors', async ({ page }) => {
    const sections = ['dns', 'forum', 'build', 'chat', 'psychology'];

    for (const icon of sections) {
      await clickSection(page, icon);
      // Verify no error boundary
      const errors = page.locator('text=Something went wrong');
      expect(await errors.count(), `Error after switching to section with icon "${icon}"`).toBe(0);
    }
  });

  test('P0: editing a config field makes save button active', async ({ page }) => {
    // Switch to Gateway section (has a port NumberField)
    await clickSection(page, 'dns');
    await page.waitForTimeout(1000);

    // Target the port NumberField input (contains value like '8642')
    // NumberField uses a textbox inside a wrapper with ＋/− buttons
    const portInput = page.locator('button:has-text("−") + input, button:has-text("−") ~ input').first();
    const origVal = await portInput.inputValue();

    // Clear and type a new value
    await portInput.click();
    await portInput.fill('19999');
    // Trigger blur to commit the change
    await portInput.press('Tab');
    await page.waitForTimeout(800);

    // The save button should now be active (bg-primary class present)
    const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save")').first();
    const classes = await saveBtn.getAttribute('class') || '';
    expect(classes).toContain('bg-primary');

    // Restore original value (don't actually save — undo)
    const undoBtn = page.locator('button:has(.material-symbols-outlined:text("undo"))');
    if (await undoBtn.isEnabled()) {
      await undoBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('P1: undo restores previous value after edit', async ({ page }) => {
    // Switch to Gateway section (has port NumberField)
    await clickSection(page, 'dns');
    await page.waitForTimeout(1000);

    // Target the port NumberField input
    const portInput = page.locator('button:has-text("−") + input, button:has-text("−") ~ input').first();
    const origVal = await portInput.inputValue();

    // Edit the field
    await portInput.click();
    await portInput.fill('12345');
    await portInput.press('Tab');
    await page.waitForTimeout(800);

    // Click undo button
    const undoBtn = page.locator('button:has(.material-symbols-outlined:text("undo"))');
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();
    await page.waitForTimeout(500);

    // Value should be restored
    const restored = await portInput.inputValue();
    expect(restored).toBe(origVal);
  });
});
