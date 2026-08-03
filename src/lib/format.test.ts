import { describe, expect, it } from 'vitest';
import { greetingForHour, sleepDurationLabel } from './format';

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

describe('greetingForHour', () => {
  it('picks a greeting band for each part of the day', () => {
    expect(greetingForHour(new Date('2026-07-24T03:00:00'))).toBe('Still up');
    expect(greetingForHour(new Date('2026-07-24T08:00:00'))).toBe('Good morning');
    expect(greetingForHour(new Date('2026-07-24T14:00:00'))).toBe('Good afternoon');
    expect(greetingForHour(new Date('2026-07-24T19:00:00'))).toBe('Good evening');
    expect(greetingForHour(new Date('2026-07-24T22:30:00'))).toBe('Winding down');
  });
});
