/**
 * The tile icon set. Small, restrained, nature-adjacent where that's honest
 * (leaf for plant diversity) and plainly literal where it isn't (a moon
 * means sleep; nothing about sleep is improved by making it a metaphor).
 *
 * Hand-rolled inline SVG rather than an icon dependency: there are seven of
 * them, they're all 12x12 on one stroke weight, and a package would be more
 * bytes and more drift than the markup it replaces. All are `aria-hidden`
 * and sit beside a real text label — never the only carrier of meaning, so
 * nothing here has to survive being read by a screen reader.
 */

export type StatIconName =
  | 'sleep' | 'hrv' | 'rhr' | 'burn' | 'weight' | 'yogurt' | 'plant';

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function StatIcon({ name }: { name: StatIconName }) {
  const common = {
    width: 11, height: 11, viewBox: '0 0 12 12',
    'aria-hidden': true, className: 'shrink-0',
  } as const;

  switch (name) {
    case 'sleep':
      return (
        <svg {...common} fill="none">
          <path d="M9.6 7.3A4.1 4.1 0 0 1 4.7 2.4 4.1 4.1 0 1 0 9.6 7.3Z" {...STROKE} />
        </svg>
      );
    case 'hrv':
      return (
        <svg {...common} fill="none">
          <path d="M1 6.2h2.1L4.4 3.5 6.1 8.9l1.4-2.7H11" {...STROKE} />
        </svg>
      );
    case 'rhr':
      return (
        <svg {...common} fill="none">
          <path d="M6 10.2 2.3 6.6a2.3 2.3 0 0 1 3.7-2.7 2.3 2.3 0 0 1 3.7 2.7L6 10.2Z" {...STROKE} />
        </svg>
      );
    case 'burn':
      return (
        <svg {...common} fill="none">
          <path d="M6 11c1.9 0 3.2-1.2 3.2-3 0-2.4-2.4-3-2.4-5.4-1.2.6-2 1.8-2 3 0 .7-.5 1-.9.6-.3-.3-.4-.8-.4-1.2C2.7 6 2.8 7 2.8 8c0 1.8 1.3 3 3.2 3Z" {...STROKE} />
        </svg>
      );
    case 'weight':
      return (
        <svg {...common} fill="none">
          <path d="M2.4 10.4 3.6 4.3h4.8l1.2 6.1H2.4Z" {...STROKE} />
          <path d="M4.6 4.3a1.4 1.4 0 1 1 2.8 0" {...STROKE} />
        </svg>
      );
    case 'yogurt':
      return (
        <svg {...common} fill="none">
          <path d="M2.6 4.2h6.8l-.8 6.2H3.4l-.8-6.2Z" {...STROKE} />
          <path d="M4.2 4.2c0-1.1.8-2 1.8-2s1.8.9 1.8 2" {...STROKE} />
        </svg>
      );
    case 'plant':
      return (
        <svg {...common} fill="none">
          <path d="M6 10.6V5.8" {...STROKE} />
          <path d="M6 6.4c0-2 1.3-3.4 3.4-3.8.2 2.2-1.1 3.8-3.4 3.8Z" {...STROKE} />
          <path d="M5.8 8.2C5.8 6.7 4.8 5.6 3.2 5.3c-.2 1.7.9 2.9 2.6 2.9Z" {...STROKE} />
        </svg>
      );
  }
}
