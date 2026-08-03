import { expect, testSignedOut } from './fixtures';

/**
 * `useBodyViewportHeight` pins `body` to `visualViewport.height` so
 * standalone-PWA `dvh` bugs don't leave dead space at the bottom of the
 * screen (see the hook's own doc comment). That same `visualViewport.height`
 * also shrinks the instant the on-screen keyboard opens, in a plain browser
 * tab too, and iOS already scrolls a focused field above the keyboard on its
 * own -- applying the body-height override on top of that fought the
 * browser's own adjustment, reported on real devices as the sign-in card
 * (and `ProfileModal`'s fields, which share this same app-wide hook) getting
 * yanked upward with a dead gap opening beneath it the moment a field was
 * focused.
 *
 * A real iOS keyboard can't be driven from here, but the fix is a guard on
 * focus state, not on keyboard presence specifically -- so this drives the
 * same mechanism (a real `visualViewport` resize from an actual viewport
 * size change, not a synthesized event) while a field is and isn't focused,
 * which is exactly what the guard branches on.
 */
testSignedOut('body height ignores a viewport shrink while a field is focused, and catches up after blur', async ({ page }) => {
  await page.goto('./');
  const password = page.getByLabel('Password');
  await expect(password).toBeVisible();

  const tallSize = { width: 390, height: 844 };
  const shortSize = { width: 390, height: 500 };
  const anotherSize = { width: 390, height: 700 };
  await page.setViewportSize(tallSize);
  await expect
    .poll(() => page.evaluate(() => document.body.style.height))
    .toBe(`${tallSize.height}px`);

  await password.focus();
  await page.setViewportSize(shortSize);
  // Give the resize event a moment to propagate if the guard were absent --
  // asserting a negative right after the resize would pass even with a
  // broken guard, if the effect just hadn't run yet.
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.body.style.height)).toBe(`${tallSize.height}px`);

  // Resize to a third, previously-unseen height so the next assertion can
  // only pass if blur genuinely re-armed the override, not because this
  // value happened to already be sitting there from before focus.
  await password.blur();
  await page.setViewportSize(anotherSize);
  await expect
    .poll(() => page.evaluate(() => document.body.style.height))
    .toBe(`${anotherSize.height}px`);
});
