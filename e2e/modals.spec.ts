import { dragDown, expect, mockSupabase, test } from './fixtures';

/**
 * Covers the three bottom-sheet shells (ExpandModal, ExplainerSheet,
 * ProfileModal) — their shared animated open/close, drag-to-dismiss, and
 * Escape handling, plus the two mobile-Safari regressions from the prior
 * two PRs (unreachable close button on a long list; dead-feeling exit).
 */

// A spring transition doesn't reach a pixel-stable rest position on any
// fixed schedule, and boundingBox() reads the *current* (possibly still
// mid-transform) position rather than waiting for it to settle. Long enough
// for the `stiffness: 380, damping: 34` springs used throughout to be
// visually at rest before a drag test measures where to grab the header.
const SPRING_SETTLE = 500;

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('Profile and goals')).toBeVisible();
});

test('Escape closes the topmost sheet, not the one beneath it', async ({ page }) => {
  await page.getByLabel('Profile and goals').click();
  const profileDialog = page.getByRole('dialog', { name: 'Profile & Goals' });
  await expect(profileDialog).toBeVisible();

  // Open an explainer from inside the profile modal -- it should sit on top,
  // and Escape should close *it* first, leaving the profile modal open. Not
  // `page`-wide: "TDEE" also appears in the Overview card underneath.
  await profileDialog.getByText('TDEE', { exact: true }).click();
  await expect(page.locator('#explainTitle')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#explainTitle')).toHaveCount(0);
  await expect(profileDialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(profileDialog).toHaveCount(0);
});

test('Save routes ProfileModal through the same animated close as every other path', async ({ page }) => {
  await page.getByLabel('Profile and goals').click();
  const profileDialog = page.getByRole('dialog', { name: 'Profile & Goals' });
  await expect(profileDialog).toBeVisible();
  await profileDialog.getByRole('button', { name: 'Save profile' }).click();
  await expect(profileDialog).toHaveCount(0);
});

test('dragging the ProfileModal header down past the threshold dismisses it', async ({ page }) => {
  await page.getByLabel('Profile and goals').click();
  const profileDialog = page.getByRole('dialog', { name: 'Profile & Goals' });
  await expect(profileDialog).toBeVisible();
  await page.waitForTimeout(SPRING_SETTLE);

  const header = profileDialog.getByRole('heading', { name: 'Profile & Goals' }).locator('..');
  const box = await header.boundingBox();
  if (!box) throw new Error('header not found');
  await dragDown(page, box.x + box.width / 2, box.y + 15);
  await expect(profileDialog).toHaveCount(0);
});

test('dragging the ExplainerSheet handle down past the threshold dismisses it', async ({ page }) => {
  await page.getByText('TDEE', { exact: true }).first().click();
  await expect(page.locator('#explainTitle')).toBeVisible();
  await page.waitForTimeout(SPRING_SETTLE);

  const panel = page.locator('#explainTitle').locator('..');
  const box = await panel.boundingBox();
  if (!box) throw new Error('panel not found');
  await dragDown(page, box.x + box.width / 2, box.y + 12);
  await expect(page.locator('#explainTitle')).toHaveCount(0);
});

test('dragging an ExpandModal header down past the threshold dismisses it', async ({ page }) => {
  await page.getByText('Fiber', { exact: true }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(SPRING_SETTLE);

  const header = dialog.locator('h2').first().locator('..');
  const box = await header.boundingBox();
  if (!box) throw new Error('header not found');
  await dragDown(page, box.x + box.width / 2, box.y + 15);
  await expect(dialog).toHaveCount(0);
});

test('long list: close button stays reachable and clickable after scrolling to the bottom', async ({ page }) => {
  // Regression test for the bug where the close button lived inside the
  // same scrolling container as the list, so a long list (Plant Diversity,
  // Baseline Calibration) scrolled it out of reach entirely.
  const today = new Date().toISOString().slice(0, 10);
  const manyPlants = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1, log_date: today, plant_name: `Plant ${i}`, category: 'vegetable',
  }));
  await mockSupabase(page, { plants_log: manyPlants });
  await page.reload();

  await page.getByText('Plant Diversity', { exact: true }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  await dialog.locator('div.overflow-y-auto').first().evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  const closeBtn = dialog.getByLabel('Close');
  await expect(closeBtn).toBeInViewport();
  await closeBtn.click();
  await expect(dialog).toHaveCount(0);
});
