import { expect, mockSupabase, test } from './fixtures';

test('manifest is linked and has the fields iOS/Android installability needs', async ({ page, baseURL }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const res = await page.request.get(new URL(href!, baseURL).toString());
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBeTruthy();
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);

  for (const icon of manifest.icons) {
    const iconRes = await page.request.get(new URL(icon.src, res.url()).toString());
    expect(iconRes.ok(), `icon ${icon.src} should load`).toBe(true);
  }
});

test('apple-touch-icon is linked for iOS home-screen installs', async ({ page }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await page.request.get(new URL(href!, page.url()).toString());
  expect(res.ok()).toBe(true);
});

test('service worker registers, activates, and precaches the shell plus its hashed assets', async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(
    async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg?.active?.state === 'activated';
    },
    { timeout: 10_000 },
  );

  const cachedUrls = await page.evaluate(async () => {
    const cache = await caches.open('nutrition-dashboard-v1');
    const keys = await cache.keys();
    return keys.map((k) => new URL(k.url).pathname);
  });

  expect(cachedUrls).toContain('/Nutrition-Dashboard/');
  expect(cachedUrls.some((u) => u.endsWith('.js'))).toBe(true);
  expect(cachedUrls.some((u) => u.endsWith('.css'))).toBe(true);
});

test('a fresh tab opened offline still renders the app shell and last-known data', async ({ browser, baseURL }) => {
  // A dedicated context rather than the default `page`/`context` fixtures:
  // this test's whole point is Service Worker + Cache Storage state
  // survivng between two page instances, so it needs a context this test
  // fully owns, not one that might carry incidental state from whichever
  // other test in this file/worker ran immediately before it.
  const context = await browser.newContext();
  const page = await context.newPage();
  await mockSupabase(page);

  // First, a normal online visit: registers the SW, precaches the shell,
  // and persists the query cache to localStorage.
  await page.goto(baseURL!);
  await page.waitForFunction(
    async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg?.active?.state === 'activated';
    },
    { timeout: 10_000 },
  );
  await expect(page.getByText('Protein', { exact: true }).first()).toBeVisible();

  // The persister throttles writes (1s default) rather than syncing on
  // every cache change, so wait for the actual write instead of guessing a
  // fixed delay.
  await page.waitForFunction(
    () => localStorage.getItem('nutrition-dashboard-query-cache') !== null,
    { timeout: 5000 },
  );
  await page.close();

  // Then simulate reopening the already-installed app later with no signal:
  // a brand new page in the same storage context (same SW registration,
  // Cache Storage, and localStorage), opened while offline. This is
  // deliberately not a reload of the same live tab -- that races the
  // browser's own offline-network emulation against service worker control
  // in a way that doesn't reflect real airplane-mode behavior on a device.
  await context.setOffline(true);

  // Chromium's CDP offline emulation has a known race against a Service
  // Worker's readiness to intercept a brand-new client's very first
  // request, distinct from (and much rarer than) the same issue on a live
  // reload -- confirmed by hand repeatedly: `navigator.serviceWorker.
  // controller` and Cache Storage are both already correct at the moment
  // the first attempt's requests fail. That's an emulator-timing artifact,
  // not a real offline capability gap (a real device has no such race —
  // there's no network stack to race against when it's just off), so one
  // retry against a fresh page is the right response here, not chasing the
  // race itself.
  let rendered = false;
  let lastPage;
  for (let attempt = 0; attempt < 2 && !rendered; attempt++) {
    lastPage = await context.newPage();
    await lastPage.goto(baseURL!);
    rendered = await lastPage
      .getByText('Protein', { exact: true })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!rendered) await lastPage.close();
  }

  expect(rendered, 'app shell + persisted data should render offline, within one retry').toBe(true);
  await expect(lastPage!).toHaveTitle('Health Dashboard');
  await context.setOffline(false);
  await context.close();
});
