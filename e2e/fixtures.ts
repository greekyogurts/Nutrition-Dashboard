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
 */
export async function mockSupabase(page: Page, overrides: Record<string, unknown[]> = {}) {
  await page.route('**/rest/v1/**', async (route) => {
    const table = route.request().url().match(/rest\/v1\/([a-z_]+)/)?.[1] ?? '';
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

export const test = base.extend<{ autoMock: void }>({
  autoMock: [
    async ({ page }, use) => {
      await mockSupabase(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
