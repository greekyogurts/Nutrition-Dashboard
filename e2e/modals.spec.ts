import { DEFAULT_LOG, dragDown, expect, mockSupabase, test } from './fixtures';

// The "today" range resolves to the *latest logged day*, not the real
// calendar date -- DEFAULT_LOG's last entry. Mocked plants_log rows need to
// share that date to actually show up under the default selection; the
// real calendar date almost never matches DEFAULT_LOG's fixed mock dates,
// which silently left these lists empty (and so trivially "short", never
// exercising real scroll/overflow behavior at all).
const MOCK_TODAY = DEFAULT_LOG[DEFAULT_LOG.length - 1]!.log_date;

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

// Real-device report: focusing a text field inside ProfileModal (installed
// PWA and plain Safari tab alike) visibly yanked the modal upward, revealing
// the dashboard behind it through the gap. Root cause: `body` legitimately
// stays taller than the keyboard-shrunk visual viewport while a field is
// focused now (see useBodyViewportHeight's focus guard, added for a
// different real-device report on the sign-in screen), and iOS's own
// "scroll the focused input above the keyboard" behavior ignores `overflow:
// hidden` -- it scrolls the document regardless, and that scroll doesn't
// reliably respect this modal's `position: fixed`. useScrollLock removes
// `body` from the document's scrollable flow entirely while the modal is
// mounted, so there's nothing left for iOS to scroll. A real iOS keyboard
// can't be driven from here, but the fix is tied to the modal's mount
// lifecycle, not to keyboard presence specifically -- so this asserts that
// lifecycle directly: locked while open, released once closed.
test('opening ProfileModal locks the page against scroll, and releases it on close', async ({ page }) => {
  expect(await page.evaluate(() => document.body.style.position)).not.toBe('fixed');

  await page.getByLabel('Profile and goals').click();
  const profileDialog = page.getByRole('dialog', { name: 'Profile & Goals' });
  await expect(profileDialog).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.position))
    .toBe('fixed');

  await profileDialog.getByRole('button', { name: 'Close' }).click();
  await expect(profileDialog).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.position)).not.toBe('fixed');
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

test("the modal's wrapper (backdrop + panel) tracks the real visual viewport and stays clear of the header, reacting if it shrinks after opening", async ({ page }) => {
  // Regression test for charts/lists rendering cut off at the bottom on
  // real iOS Safari: CSS `dvh` is supposed to track the visible viewport as
  // the toolbar shows/hides, but can lag a transition behind -- especially
  // right after the very tap that opens a modal, which is often the same
  // interaction that triggers the toolbar to animate. The wrapper sets its
  // top/height explicitly from `visualViewport.height` and the measured
  // header height in JS as a more reliably-live source than CSS, so a
  // toolbar transition that happens *after* the modal is already open still
  // narrows it -- not just the initial-open value, the live-updating one.
  // Bounding the *wrapper* (not just the panel) is what keeps the backdrop
  // from covering -- and absorbing every tap and swipe over -- the header.
  await page.getByText('Fiber', { exact: true }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  const wrapper = dialog.locator('..');

  const expectedBounds = async () => page.evaluate(() => {
    const header = document.querySelector('header')?.parentElement as HTMLElement | null;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    return { top: headerHeight, height: vh - headerHeight };
  });

  await expect
    .poll(() => wrapper.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height }; }))
    .toEqual(await expectedBounds());

  // Simulate the address bar reappearing (viewport shrinking) while the
  // modal stays open, not just at the moment it was opened.
  await page.setViewportSize({ width: 390, height: 550 });
  await expect
    .poll(() => wrapper.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height }; }))
    .toEqual(await expectedBounds());
});

test('swiping anywhere on a chart-only ExpandModal body closes it, not just the header', async ({ page }) => {
  // A chart never overflows its box, so unlike a list there's no scroll
  // gesture to protect -- the whole body should be a drag-to-dismiss target.
  await page.getByText('Sleep Duration', { exact: false }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(SPRING_SETTLE);

  const body = dialog.locator('div.overflow-y-auto').first();
  const box = await body.boundingBox();
  if (!box) throw new Error('body not found');
  await dragDown(page, box.x + box.width / 2, box.y + 20);
  await expect(dialog).toHaveCount(0);
});

test('swiping a scrollable list ExpandModal body does not close it -- only the header does', async ({ page }) => {
  const today = MOCK_TODAY;
  const manyPlants = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1, log_date: today, plant_name: `Plant ${i}`, category: 'vegetable',
  }));
  await mockSupabase(page, { plants_log: manyPlants });
  await page.reload();

  await page.getByText('Plant Diversity', { exact: true }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(SPRING_SETTLE);

  const body = dialog.locator('div.overflow-y-auto').first();
  const box = await body.boundingBox();
  if (!box) throw new Error('body not found');
  await dragDown(page, box.x + box.width / 2, box.y + 20);
  await expect(dialog).toBeVisible();

  const header = dialog.locator('h2').first().locator('..');
  const headerBox = await header.boundingBox();
  if (!headerBox) throw new Error('header not found');
  await dragDown(page, headerBox.x + headerBox.width / 2, headerBox.y + 15);
  await expect(dialog).toHaveCount(0);
});

test('swiping to the next card closes an ExpandModal left open on the previous one', async ({ page }) => {
  // ExpandModal is `position: fixed`, so it doesn't leave the screen just
  // because its owning card scrolled out of view -- without an explicit
  // close-on-inactive, it stays rendered full-screen on top of whichever
  // card the swipe lands on next, orphaned from the state that owns it.
  await page.getByText('Fiber', { exact: true }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  const container = page.locator('.swipe-container');
  await container.evaluate((el) => { el.scrollLeft = el.clientWidth; });

  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[role="tab"][aria-label="Micronutrient Analysis"]')).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('a horizontal swipe anywhere on an open modal closes it, even over scrollable list content', async ({ page }) => {
  // Distinct from vertical drag-to-dismiss: this exercises the *horizontal*
  // swipe-intent detection on the modal's outer wrapper, added because
  // relying on the swipe-container becoming inactive afterward isn't
  // reliable on real devices -- closing as soon as a gesture is clearly
  // horizontal doesn't depend on that at all. Uses the same long-list setup
  // as the "does not close on vertical drag" test on purpose: that content
  // has dragListener: false (Framer's own drag never attaches to it), so a
  // horizontal close here proves the new mechanism specifically, not the
  // vertical one.
  const today = MOCK_TODAY;
  const manyPlants = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1, log_date: today, plant_name: `Plant ${i}`, category: 'vegetable',
  }));
  await mockSupabase(page, { plants_log: manyPlants });
  await page.reload();

  await page.getByText('Plant Diversity', { exact: true }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(SPRING_SETTLE);

  const body = dialog.locator('div.overflow-y-auto').first();
  const box = await body.boundingBox();
  if (!box) throw new Error('body not found');
  const y = box.y + box.height / 2;
  const startX = box.x + box.width - 30;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX - (80 / steps) * i, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  await page.mouse.up();

  await expect(dialog).toHaveCount(0);
});

test('a long list modal never grows tall enough to cover the fixed header, and the range selector stays reachable', async ({ page }) => {
  const today = MOCK_TODAY;
  const manyPlants = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1, log_date: today, plant_name: `Plant ${i}`, category: 'vegetable',
  }));
  await mockSupabase(page, { plants_log: manyPlants });
  await page.reload();

  await page.getByText('Plant Diversity', { exact: true }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  const headerBottom = await page.locator('header').evaluate((el) => el.getBoundingClientRect().bottom);
  const dialogTop = await dialog.evaluate((el) => el.getBoundingClientRect().top);
  expect(dialogTop).toBeGreaterThanOrEqual(headerBottom - 1);

  // Prove the range selector is actually reachable, not just visually clear
  // of the panel -- click through real screen coordinates (not a locator,
  // which wouldn't catch something invisible-but-still-on-top) and confirm
  // the tap landed.
  const rangeTab = page.getByRole('tablist', { name: 'Time range' }).getByRole('tab', { name: '30 Day' });
  const box = await rangeTab.boundingBox();
  if (!box) throw new Error('range tab not found');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(rangeTab).toHaveAttribute('aria-selected', 'true');
});

test('long list: close button stays reachable and clickable after scrolling to the bottom', async ({ page }) => {
  // Regression test for the bug where the close button lived inside the
  // same scrolling container as the list, so a long list (Plant Diversity,
  // Baseline Calibration) scrolled it out of reach entirely.
  const today = MOCK_TODAY;
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
