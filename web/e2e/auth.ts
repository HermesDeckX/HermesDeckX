import { Page } from '@playwright/test';

/**
 * Login helper — authenticates via the LockScreen UI.
 * Reads credentials from env: E2E_USER (default: admin), E2E_PASS (required).
 */
export async function login(page: Page) {
  const pass = process.env.E2E_PASS;
  if (!pass) throw new Error('E2E_PASS env variable is required');

  await page.goto('/');

  // Wait for lock screen password input to appear
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });

  // Fill password and submit the form
  await passwordInput.fill(pass);
  await passwordInput.press('Enter');

  // Wait for lock screen to disappear (form goes away after successful login)
  await passwordInput.waitFor({ state: 'hidden', timeout: 15_000 });

  // Wait for desktop to fully render (icons, dock)
  await page.waitForTimeout(2000);
}

/**
 * Open a window by clicking its dock icon on the Desktop.
 */
export async function openWindow(page: Page, windowId: string) {
  // Desktop app icons contain the window id as text or data attribute
  // The dock uses material-symbols-outlined icons, but the title text is nearby
  // Click on the desktop icon area for the given window
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent('hermesdeck:open-window', { detail: { id } }));
  }, windowId);

  // Wait a bit for the window to render
  await page.waitForTimeout(500);
}

/**
 * Navigate to a specific Editor section by clicking the sidebar.
 */
export async function navigateToEditorSection(page: Page, sectionId: string) {
  // Click the sidebar button for the section (identified by aria-current or section data)
  const sidebarBtn = page.locator(`aside button`).filter({ has: page.locator(`text=${sectionId}`) }).first();
  if (await sidebarBtn.isVisible().catch(() => false)) {
    await sidebarBtn.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Click the Editor save button and wait for save to complete.
 */
export async function saveConfig(page: Page) {
  // The save button has aria-label matching the save text, and is enabled when dirty
  const saveBtn = page.locator('header button').filter({ hasText: /save|保存|儲存|저장|保存して/ }).first();
  await saveBtn.click();
  // Wait for save to complete (button becomes disabled again)
  await page.waitForTimeout(1500);
}
