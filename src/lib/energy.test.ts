import { describe, expect, it } from 'vitest';
import { normalizeBaselines, normalizeLog } from './baseline';
import { computeEnergy } from './energy';
import { BASELINES_RAW, BEN, LEGACY_PROFILE, LOG_RAW } from './fixtures';
import { currentWeightLb, profileAge } from './profile';

const baselines = normalizeBaselines(BASELINES_RAW);
const log = normalizeLog(LOG_RAW);

describe('computeEnergy', () => {
  it('resolves baseline + today\'s burn', () => {
    const e = computeEnergy({ profile: BEN, log, baselines })!;
    expect(e.source).toBe('calibrated');
    expect(e.baselineCal).toBe(2555);
    expect(e.burn).toBe(242);
    expect(e.tdee).toBe(2797); // matches production daily_log.tdee exactly
  });

  it('applies the goal delta to get the target, leaving tdee alone', () => {
    const e = computeEnergy({ profile: BEN, log, baselines })!; // goal: lose, -500
    expect(e.tdee).toBe(2797);
    expect(e.target).toBe(2297);

    const maintain = computeEnergy({ profile: { ...BEN, goal: 'maintain' }, log, baselines })!;
    expect(maintain.target).toBe(2797);

    const gain = computeEnergy({ profile: { ...BEN, goal: 'gain' }, log, baselines })!;
    expect(gain.target).toBe(3097);
  });

  it('falls back to a logged tdee when there is no calibration yet', () => {
    const e = computeEnergy({ profile: BEN, log, baselines: [] })!;
    expect(e.source).toBe('logged');
    expect(e.tdee).toBe(2797);
    expect(e.baselineCal).toBeNull();
  });

  it('returns null when there is neither a calibration nor a logged tdee', () => {
    const bare = normalizeLog([{ log_date: '2026-07-29', calories: 1240, weight_lb: '174.0' }]);
    expect(computeEnergy({ profile: BEN, log: bare, baselines: [] })).toBeNull();
    expect(computeEnergy({ profile: BEN, log: [], baselines: [] })).toBeNull();
  });

  it('works with no profile at all, defaulting to maintain', () => {
    const e = computeEnergy({ profile: null, log, baselines })!;
    expect(e.tdee).toBe(2797);
    expect(e.target).toBe(2797);
  });

  it('reads weight from the log, never from the profile', () => {
    // LEGACY_PROFILE carries a stale weight_lb of 999 from before the field was
    // removed. The old code preferred it over every later weigh-in, which
    // anchored the protein target to a stale figure indefinitely.
    const e = computeEnergy({ profile: LEGACY_PROFILE, log, baselines })!;
    expect(e.weightLb).toBe(174);
    expect(e.weightLb).not.toBe(999);
  });
});

describe('currentWeightLb', () => {
  it('takes the most recent weigh-in', () => {
    expect(currentWeightLb(log)).toBe(174);
  });

  it('walks backwards past days with no weight', () => {
    const withGap = normalizeLog([
      { log_date: '2026-07-27', weight_lb: '176.2' },
      { log_date: '2026-07-28' },
      { log_date: '2026-07-29', weight_lb: null },
    ]);
    expect(currentWeightLb(withGap)).toBe(176.2);
  });

  it('returns null when nothing has ever been weighed', () => {
    expect(currentWeightLb(normalizeLog([{ log_date: '2026-07-29' }]))).toBeNull();
    expect(currentWeightLb([])).toBeNull();
  });
});

describe('profileAge', () => {
  it('computes whole years from birth_year', () => {
    expect(profileAge(BEN, new Date('2026-07-29'))).toBe(32);
  });
  it('returns null when unset', () => {
    expect(profileAge({ ...BEN, birth_year: null })).toBeNull();
    expect(profileAge(null)).toBeNull();
  });
});
