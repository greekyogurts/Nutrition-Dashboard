import { test as base, expect, type Page } from '@playwright/test';

export const DEFAULT_LOG = Array.from({ length: 10 }, (_, i) => {
  const d = new Date(2026, 6, 20 + i);
  return {
    log_date: d.toISOString().slice(0, 10),
    calories: '2200', protein_g: '150', carbs_g: '220', fat_g: '70', fiber_g: '30',
    weight_lb: '180', tdee: '2400', sleep_hours: '7.5', sleep_quality: '8',
  };
});

/**
 * Stands in for Supabase's REST API. `overrides` replaces individual tables
 * for tests that need specific data (e.g. a long list to scroll); anything
 * not overridden defaults to an empty array, except `daily_log` which
 * defaults to `DEFAULT_LOG` so most tests get a populated Overview card for
 * free.
 *
 * `byToken` is for account-isolation tests only: a request's `Authorization:
 * Bearer <token>` picks a whole separate table map, so two accounts signed
 * into the same tab get genuinely different rows back rather than both
 * reading the one shared `overrides` regardless of who's asking -- real RLS
 * does exactly this keying, just server-side.
 */
export async function mockSupabase(
  page: Page,
  overrides: Record<string, unknown[]> = {},
  byToken: Record<string, Record<string, unknown[]>> = {},
) {
  await page.route('**/rest/v1/**', async (route) => {
    const table = route.request().url().match(/rest\/v1\/([a-z_]+)/)?.[1] ?? '';
    const token = route.request().headers().authorization?.replace(/^Bearer /, '');
    const map: Record<string, unknown[]> = {
      daily_log: DEFAULT_LOG,
      tdee_baseline: [],
      supplements: [],
      lab_results: [],
      activities: [],
      micronutrients: [],
      meal_items: [],
      meals: [],
      plants_log: [],
      ...overrides,
      ...(token ? byToken[token] : undefined),
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(map[table] ?? []) });
  });
}

/** Real pointer events, paced like an actual drag — a single fast jump from
 * start to end doesn't register as a drag gesture in the browser at all. */
export async function dragDown(page: Page, x: number, yStart: number, distance = 220) {
  await page.mouse.move(x, yStart);
  await page.mouse.down();
  await page.waitForTimeout(50);
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, yStart + (distance / steps) * i, { steps: 2 });
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
}

export const TEST_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.invalid' };

/**
 * Seeds a signed-in session before any app code runs. The dashboard is gated
 * behind auth now, so without this every test would land on the sign-in screen.
 * Written straight to localStorage under the key `sessionStore` reads, with an
 * expiry far enough out that no refresh is attempted mid-test.
 */
export async function signIn(page: Page, user = TEST_USER) {
  await page.addInitScript(
    ([key, session]) => { window.localStorage.setItem(key as string, session as string); },
    ['nutrition-dashboard-session', JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      user,
    })] as const,
  );
}

/**
 * Mocks GoTrue so sign-in/sign-up flows can be driven without a real backend.
 *
 * `usersByEmail` lets a same-tab account-switch test drive the real sign-in
 * form as a second, distinct account -- the email/password actually
 * submitted picks the returned user and token, rather than every sign-in
 * resolving to the one fixed `TEST_USER`. Unmatched (or omitted) emails keep
 * the original single-account behavior.
 */
export async function mockAuth(
  page: Page,
  opts: { signupError?: string; usersByEmail?: Record<string, { user: typeof TEST_USER; accessToken: string }> } = {},
) {
  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/signup') && opts.signupError) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: `Database error saving new user: ${opts.signupError}` }),
      });
      return;
    }
    if (url.includes('/logout')) {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    const email = (route.request().postDataJSON?.() as { email?: string } | undefined)?.email;
    const matched = email ? opts.usersByEmail?.[email] : undefined;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: matched?.accessToken ?? 'fresh-access-token',
        refresh_token: 'fresh-refresh-token',
        expires_in: 3600,
        user: matched?.user ?? TEST_USER,
      }),
    });
  });
}

export const test = base.extend<{ autoMock: void }>({
  autoMock: [
    async ({ page }, use) => {
      await mockSupabase(page);
      await mockAuth(page);
      await signIn(page);
      await use();
    },
    { auto: true },
  ],
});

/** Same mocks, but no session seeded — lands on the sign-in screen. */
export const testSignedOut = base.extend<{ autoMockAnon: void }>({
  autoMockAnon: [
    async ({ page }, use) => {
      await mockSupabase(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
