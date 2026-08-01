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

test("the app shell's height tracks the live viewport, not just CSS dvh, and the dots sit flush with it", async ({ page }) => {
  // Regression test for the swipe dots (and everything above them) sitting
  // too high on the screen in a standalone/installed PWA: `body { height:
  // 100dvh }` is the instant CSS fallback, but standalone-mode iOS has a
  // real history of `dvh` computing unreliably short there -- there's no
  // browser toolbar to dynamically track in standalone mode in the first
  // place. App.tsx overrides body's height from `visualViewport.height`
  // once JS runs, so the dots row -- which sits in normal document flow
  // right after the swipe area, not pinned by its own CSS -- always ends
  // up flush with however tall the app shell actually is.
  const dots = page.locator('[role="tablist"][aria-label="Cards"]');

  const height1 = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
  await expect(page.locator('body')).toHaveJSProperty('style.height', `${height1}px`);
  await expect
    .poll(() => dots.evaluate((el) => el.getBoundingClientRect().bottom))
    .toBeCloseTo(height1, 0);

  // The mechanism has to keep working if the viewport changes after the
  // initial render, not just get it right once at load.
  const page2Viewport = { width: 390, height: 700 };
  await page.setViewportSize(page2Viewport);
  const height2 = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
  await expect(page.locator('body')).toHaveJSProperty('style.height', `${height2}px`);
  await expect
    .poll(() => dots.evaluate((el) => el.getBoundingClientRect().bottom))
    .toBeCloseTo(height2, 0);
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
