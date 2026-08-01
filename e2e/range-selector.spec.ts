import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('Profile and goals')).toBeVisible();
});

/** Paced like a real drag — a single fast jump doesn't register as one. */
async function dragHorizontal(page: Page, yAtStart: number, xStart: number, xEnd: number) {
  await page.mouse.move(xStart, yAtStart);
  await page.mouse.down();
  await page.waitForTimeout(50);
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(xStart + ((xEnd - xStart) / steps) * i, yAtStart, { steps: 2 });
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
}

test('tapping a range tab still selects it directly', async ({ page }) => {
  // The tabs are pointer-events:none -- every pointer gesture (tap or drag)
  // is handled once, on the container, so the two input modes can't
  // double-fire. `force` bypasses Playwright's actionability check (which
  // insists the locator itself be the hit target), but still dispatches a
  // real click at that position, same as an actual user tap would land.
  const tablist = page.getByRole('tablist', { name: 'Time range' });
  await tablist.getByRole('tab', { name: '30 Day' }).click({ force: true });
  await expect(tablist.getByRole('tab', { name: '30 Day' })).toHaveAttribute('aria-selected', 'true');
  await expect(tablist.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'false');
});

test('dragging across the range bar previews and then commits the tab under release', async ({ page }) => {
  const tablist = page.getByRole('tablist', { name: 'Time range' });
  const box = await tablist.boundingBox();
  if (!box) throw new Error('tablist not found');

  // 5 tabs: Today, Last 7, 30 Day, YTD, All. Start on Today, drag to the
  // 4th slot (YTD) and release there -- the tab that was under the pointer
  // at release should win, same as the pill previewed while dragging.
  const tabWidth = box.width / 5;
  const y = box.y + box.height / 2;
  const startX = box.x + tabWidth * 0.5;
  const endX = box.x + tabWidth * 3.5;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(endX, y, { steps: 8 });
  await page.waitForTimeout(50);

  // Still mid-drag: the preview should already show YTD highlighted, before
  // the pointer is released and the selection actually commits.
  await expect(tablist.getByRole('tab', { name: 'YTD' })).toHaveClass(/text-white(?!\/)/);

  await page.mouse.up();
  await expect(tablist.getByRole('tab', { name: 'YTD' })).toHaveAttribute('aria-selected', 'true');
});

test('a short drag below the tap threshold still selects the tab under the pointer', async ({ page }) => {
  const tablist = page.getByRole('tablist', { name: 'Time range' });
  const lastTab = tablist.getByRole('tab', { name: 'All' });
  const box = await lastTab.boundingBox();
  if (!box) throw new Error('tab not found');
  await dragHorizontal(page, box.y + box.height / 2, box.x + box.width / 2, box.x + box.width / 2 + 2);
  await expect(lastTab).toHaveAttribute('aria-selected', 'true');
});
