/** "7h05m" — zero-padded so single-digit minutes don't read as "7h5m". */
export function sleepDurationLabel(hours: number): string {
  if (!hours) return '–';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${String(m).padStart(2, '0')}m`;
}
