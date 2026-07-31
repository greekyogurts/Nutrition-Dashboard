import { describe, expect, it } from 'vitest';
import { EXPLAINERS } from './explainers';

describe('EXPLAINERS', () => {
  it('has 23 entries', () => {
    expect(Object.keys(EXPLAINERS)).toHaveLength(23);
  });

  it('every related key points at an entry that actually exists', () => {
    for (const [key, e] of Object.entries(EXPLAINERS)) {
      for (const rel of e.related ?? []) {
        expect(EXPLAINERS, `${key} -> related "${rel}"`).toHaveProperty(rel);
      }
    }
  });

  it('every entry has a term, a short summary, and at least one body paragraph', () => {
    for (const [key, e] of Object.entries(EXPLAINERS)) {
      expect(e.term, key).toBeTruthy();
      expect(e.short, key).toBeTruthy();
      expect(e.body.length, key).toBeGreaterThan(0);
    }
  });

  it('no entry lists itself as related', () => {
    for (const [key, e] of Object.entries(EXPLAINERS)) {
      expect(e.related ?? [], key).not.toContain(key);
    }
  });
});
