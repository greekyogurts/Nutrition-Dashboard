/**
 * Full (non-compact) axis styling — the vanilla's makeScales(false, extra).
 * Shared by every expanded chart across Micros/Activity/Sleep/Trends so the
 * "zoomed" look is one definition, not four near-copies.
 */
export function fullScales(yExtra: Record<string, unknown> = {}) {
  return {
    x: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
      ...yExtra,
    },
  };
}

export const fullLegendLabels = { color: 'rgba(255,255,255,0.7)', boxWidth: 10, font: { size: 11 } };
