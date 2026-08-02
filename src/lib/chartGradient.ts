import type { ScriptableContext } from 'chart.js';

/**
 * Vertical fade from `color` at the top of the plot area to transparent at
 * the bottom — replaces a flat low-opacity fill with real depth on line
 * charts. `chartArea` isn't measured yet on the very first call (before
 * layout), so `fallback` covers that one frame; Chart.js re-invokes this
 * once layout is known.
 */
export function verticalGradient(color: string, fallback: string) {
  return (context: ScriptableContext<'line'>) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return fallback;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    return gradient;
  };
}
