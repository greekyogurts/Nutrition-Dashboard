import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('Profile and goals')).toBeVisible();
});

test('the active swipe dot tracks the container scroll position, not just dot taps', async ({ page }) => {
  const dots = page.locator('[role="tablist"][aria-label="Cards"] [role="tab"]');
  await expect(dots.first()).toHaveAttribute('aria-selected', 'true');

  const container = page.locator('.swipe-container');
  await container.evaluate((el) => { el.scrollLeft = el.clientWidth; });

  await expect(page.locator('[role="tab"][aria-label="Micronutrient Analysis"]')).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('tapping a dot navigates to that card, not just relabels the dot', async ({ page }) => {
  await page.locator('[role="tab"][aria-label="Activity"]').click();
  const container = page.locator('.swipe-container');
  await expect
    .poll(async () => container.evaluate((el) => Math.round(el.scrollLeft / el.clientWidth)))
    .toBe(2);
});

test('the refresh button shows a spinner while a refetch is in flight', async ({ page }) => {
  // Delay the mocked response so isFetching stays true long enough to observe.
  await page.route('**/rest/v1/**', async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  const refreshBtn = page.getByRole('button', { name: /refresh/i });
  await refreshBtn.click();
  await expect(refreshBtn.locator('svg')).toHaveClass(/animate-spin/);
  await expect(refreshBtn.locator('svg')).not.toHaveClass(/animate-spin/, { timeout: 5000 });
});
