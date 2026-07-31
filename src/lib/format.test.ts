import { describe, expect, it } from 'vitest';
import { sleepDurationLabel } from './format';

describe('sleepDurationLabel', () => {
  it('zero-pads single-digit minutes so 7h05m does not read as 7h5m', () => {
    expect(sleepDurationLabel(7 + 5 / 60)).toBe('7h05m');
  });

  it('formats whole and fractional hours', () => {
    expect(sleepDurationLabel(7.5)).toBe('7h30m');
    expect(sleepDurationLabel(8)).toBe('8h00m');
  });

  it('shows a dash rather than 0h00m with no data', () => {
    expect(sleepDurationLabel(0)).toBe('–');
  });
});
