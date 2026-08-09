import { describe, expect, it } from 'vitest';
import { BEN } from './fixtures';
import { goalDeltaFor } from './profile';

describe('goalDeltaFor', () => {
  it('is 0 for maintain, negative for lose, positive for gain', () => {
    expect(goalDeltaFor({ ...BEN, goal: 'maintain' })).toBe(0);
    expect(goalDeltaFor({ ...BEN, goal: 'lose' })).toBe(-500);
    expect(goalDeltaFor({ ...BEN, goal: 'gain' })).toBe(300);
  });

  it('defaults to maintain (0) with no profile', () => {
    expect(goalDeltaFor(null)).toBe(0);
  });
});
