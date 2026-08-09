import {
  DEFAULT_LOG, expect, mockAuth, mockSupabase, signIn, test, testSignedOut,
} from './fixtures';

/**
 * The dashboard is gated behind a session, and the gate is not decorative: the
 * database denies the anonymous role outright, so a signed-out client gets
 * nothing even if it asks. These cover the parts the browser owns -- that the
 * gate renders, that invite errors are legible, and that one account's cached
 * data is never handed to the next account on a shared device.
 */

testSignedOut('signed out, the dashboard is not rendered at all', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  // Not merely hidden behind a modal -- the app shell itself is absent.
  await expect(page.locator('.swipe-container')).toHaveCount(0);
  await expect(page.getByLabel('Profile and goals')).toHaveCount(0);
});

testSignedOut('the invite field only appears when creating an account', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('Invite code')).toHaveCount(0);
  await page.getByRole('button', { name: /create an account/i }).click();
  await expect(page.getByLabel('Invite code')).toBeVisible();
});

testSignedOut('a rejected invite code surfaces as a readable message, not a raw database error', async ({ page }) => {
  // The check lives in a trigger on auth.users, so GoTrue reports it as a
  // generic 500 with the sentinel buried in the body. The app maps the
  // sentinel back to something a person can act on.
  await mockAuth(page, { signupError: 'invite_exhausted' });
  await page.goto('./');

  await page.getByRole('button', { name: /create an account/i }).click();
  await page.getByLabel('Email').fill('someone@example.invalid');
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByLabel('Invite code').fill('ZZZZ-ZZZZ');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('alert')).toHaveText('That invite code has already been used.');
  await expect(page.getByRole('alert')).not.toContainText('Database error');
});

testSignedOut('signing in replaces the sign-in screen with the dashboard', async ({ page }) => {
  await mockAuth(page);
  await page.goto('./');

  await page.getByLabel('Email').fill('test@example.invalid');
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator('.swipe-container')).toBeVisible();
  await expect(page.getByLabel('Profile and goals')).toBeVisible();
});

test('signing out returns to the gate and leaves no readable data behind', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.swipe-container')).toBeVisible();

  // Let the cache populate and persist before signing out, so the assertion
  // below is about eviction rather than about it never having been written.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('nutrition-dashboard-query-cache')?.includes('daily_log') ?? false))
    .toBe(true);

  await page.getByLabel('Profile and goals').click();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('.swipe-container')).toHaveCount(0);
  await expect(page.evaluate(() => localStorage.getItem('nutrition-dashboard-session'))).resolves.toBeNull();
});

test("a different account never restores the previous account's cached rows", async ({ page }) => {
  // The persisted cache is keyed by a buster set to the account id, so a
  // second person signing in on the same browser gets an empty cache rather
  // than the first person's meals and lab results rehydrated from disk.
  await page.goto('./');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('nutrition-dashboard-query-cache')?.includes('daily_log') ?? false))
    .toBe(true);

  const firstBuster = await page.evaluate(() => {
    const raw = localStorage.getItem('nutrition-dashboard-query-cache');
    return raw ? (JSON.parse(raw) as { buster?: string }).buster : null;
  });
  expect(firstBuster).toBe('00000000-0000-4000-8000-000000000001');

  // Same browser, different account.
  const other = { id: '00000000-0000-4000-8000-0000000000ff', email: 'other@example.invalid' };
  await signIn(page, other);
  await page.reload();
  await expect(page.locator('.swipe-container')).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => {
      const raw = localStorage.getItem('nutrition-dashboard-query-cache');
      return raw ? (JSON.parse(raw) as { buster?: string }).buster : null;
    }))
    .toBe(other.id);
});

test('switching accounts within one page lifetime shows the new account\'s rows, not the previous account\'s cached ones', async ({ page }) => {
  // The test above covers the *persisted* (localStorage) half of account
  // isolation, which only actually exercises after a reload rebuilds the
  // QueryClient from scratch either way. This covers the half that mattered:
  // a singleton QueryClient shared across the remounted provider would still
  // be holding the first account's rows in memory, and would hand them to
  // the second account's render with no network request or reload involved
  // to "fix" it. There is deliberately no page.reload() anywhere below.
  const other = { id: '00000000-0000-4000-8000-0000000000ff', email: 'other@example.invalid' };
  const otherToken = 'other-account-access-token';
  const otherLog = [{ ...DEFAULT_LOG[DEFAULT_LOG.length - 1], calories: '1234' }];

  await mockSupabase(page, {}, { [otherToken]: { daily_log: otherLog } });
  await mockAuth(page, { usersByEmail: { [other.email]: { user: other, accessToken: otherToken } } });

  await page.goto('./');
  await expect(page.getByText('2,200', { exact: false }).first()).toBeVisible();

  await page.getByLabel('Profile and goals').click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  await page.getByLabel('Email').fill(other.email);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator('.swipe-container')).toBeVisible();
  await expect(page.getByText('1,234', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('2,200', { exact: false })).toHaveCount(0);
});
