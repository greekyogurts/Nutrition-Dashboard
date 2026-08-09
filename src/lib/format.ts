/** "7h05m" — zero-padded so single-digit minutes don't read as "7h5m". */
export function sleepDurationLabel(hours: number): string {
  if (!hours) return '–';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${String(m).padStart(2, '0')}m`;
}

/**
 * Time-of-day greeting for the Overview card. Deliberately name-free: `Profile`
 * has no name field (see profile.ts's doc comment — title/subtitle are free
 * text, and the dashboard is shared with a few other people per PRODUCT.md),
 * so parsing a name out of an arbitrary header string would be a guess
 * dressed up as personalization. This stays honest about what the data
 * model actually knows.
 */
export function greetingForHour(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}

/** "Wednesday, 24 July" — no year, since this greets today specifically. */
export function greetingDateLabel(date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}
