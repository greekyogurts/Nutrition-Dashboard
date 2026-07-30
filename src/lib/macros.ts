import type { Energy } from './energy';
import { LB_PER_KG, type Profile } from './profile';

/**
 * Macro profiles anchor protein to BODYWEIGHT (g/kg) rather than a percentage
 * of calories, because that is how protein needs actually scale — a 200lb and a
 * 120lb person on the same calories need very different protein. Carbs and fat
 * then fill the remaining energy.
 *
 * The `kind` discriminant replaces what used to be duck-typing on which fields
 * happened to exist (`diet.carbCap != null`, `diet.custom`). With a union the
 * compiler enforces that every branch is handled, so adding a diet style cannot
 * silently fall through to the wrong arithmetic.
 */
export type Diet =
  /** Fat is a share of calories; carbs take the remainder. */
  | { kind: 'percent'; label: string; proteinPerKg: number; fatPct: number }
  /** Carbs are a hard ceiling (NET carbs); fat takes the remainder. */
  | {
      kind: 'carbCap';
      label: string;
      proteinPerKg: number;
      carbCap: number;
      sodiumTarget: number;
      fiberTarget: number;
    }
  /** The user supplies protein (and optionally fat) directly in grams. */
  | { kind: 'custom'; label: string };

export const DIETS: Record<string, Diet> = {
  balanced: { kind: 'percent', label: 'Balanced', proteinPerKg: 1.6, fatPct: 0.3 },
  high_protein: { kind: 'percent', label: 'High protein / cutting', proteinPerKg: 2.2, fatPct: 0.28 },
  mediterranean: { kind: 'percent', label: 'Mediterranean', proteinPerKg: 1.5, fatPct: 0.38 },
  high_carb: { kind: 'percent', label: 'High carb — endurance athlete', proteinPerKg: 1.8, fatPct: 0.22 },
  // Fiber is set explicitly for these two: the default 14g/1000kcal formula
  // would hand keto a ~39g fiber target against a 30g net-carb cap, and since
  // fiber IS a carbohydrate that target is arithmetically unreachable.
  keto: {
    kind: 'carbCap', label: 'Keto', proteinPerKg: 1.6,
    carbCap: 30, sodiumTarget: 5000, fiberTarget: 25,
  },
  carnivore: {
    kind: 'carbCap', label: 'Carnivore', proteinPerKg: 2.0,
    carbCap: 10, sodiumTarget: 5000, fiberTarget: 0,
  },
  custom: { kind: 'custom', label: 'Custom' },
};

export const BALANCED: Diet = DIETS.balanced!;

export function dietFor(p: Profile | null): Diet {
  return (p && DIETS[p.diet]) || BALANCED;
}

export interface MacroTargets {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  /** False when there wasn't enough data to derive anything. */
  derived: boolean;
}

const UNAVAILABLE: MacroTargets = {
  protein_g: null, carbs_g: null, fat_g: null, fiber_g: null, derived: false,
};

/** 14g per 1000 kcal is the actual DRI basis for fiber. */
function defaultFiber(kcal: number): number {
  return Math.round((14 * kcal) / 1000);
}

/**
 * Derive macro targets from the energy picture and the profile's diet style.
 *
 * Returns all-null when either input is missing: protein scales with bodyweight
 * and the rest with calories, so both are required before any number here means
 * anything. Callers must handle null rather than being handed a plausible-looking
 * fabrication.
 */
export function macroTargetsFor(p: Profile | null, energy: Energy | null): MacroTargets {
  if (!energy || !energy.weightLb) return UNAVAILABLE;

  const diet = dietFor(p);
  const kg = energy.weightLb / LB_PER_KG;
  const kcal = energy.target;

  switch (diet.kind) {
    case 'custom': {
      // Protein (and optionally fat) are user-entered grams, not derived from
      // bodyweight. Carbs are whatever is left to hit the calorie target, so
      // "just set a protein floor" still yields a calorie-accurate plan.
      const protein = Math.max(0, Math.round(p?.custom_protein_g ?? 0));
      const fat = p?.custom_fat_g
        ? Math.max(0, Math.round(p.custom_fat_g))
        : Math.round((kcal * 0.3) / 9);
      const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
      return {
        protein_g: protein,
        carbs_g: Math.max(0, carbs),
        fat_g: fat,
        fiber_g: defaultFiber(kcal),
        derived: true,
      };
    }

    case 'carbCap': {
      const protein = Math.round(diet.proteinPerKg * kg);
      const carbs = diet.carbCap;
      const fat = Math.round((kcal - protein * 4 - carbs * 4) / 9);
      return {
        protein_g: protein,
        carbs_g: Math.max(0, carbs),
        fat_g: Math.max(0, fat),
        fiber_g: diet.fiberTarget,
        derived: true,
      };
    }

    case 'percent': {
      const protein = Math.round(diet.proteinPerKg * kg);
      const fat = Math.round((kcal * diet.fatPct) / 9);
      const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
      return {
        protein_g: protein,
        carbs_g: Math.max(0, carbs),
        fat_g: Math.max(0, fat),
        fiber_g: defaultFiber(kcal),
        derived: true,
      };
    }
  }
}
