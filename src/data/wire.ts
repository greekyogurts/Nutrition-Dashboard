import type { Tables } from './database.types';

/**
 * THE WIRE FORMAT
 *
 * Supabase's generated types describe Postgres's *logical* types, so every
 * `numeric` column comes out as `number`. PostgREST does not send them that way:
 * it serializes `numeric` as a JSON **string** to avoid the precision loss of an
 * IEEE double. Integers and bigints do arrive as JSON numbers.
 *
 * So the generated types are correct about the database and wrong about the
 * payload, for exactly the columns listed below. That gap is not theoretical —
 * `damping_k: "0.5"`, `rate_lb_per_day: "-0.1616"` and `weight_lb: "174.0"` are
 * verbatim from production. Consuming them as numbers passes typecheck and then
 * silently concatenates: `"174.0" + 1` is `"174.01"`.
 *
 * This module widens precisely those columns back to what the wire actually
 * carries. Because the widening is derived from the generated Row types rather
 * than hand-written, a renamed or dropped column becomes a type error here
 * instead of a runtime surprise.
 *
 * The list came from:
 *   select table_name, column_name from information_schema.columns
 *   where table_schema='public' and data_type in ('numeric','double precision','real');
 */

/** A numeric column as it arrives: string, or number if the driver coerced it. */
type Wire<T> = null extends T ? string | number | null : string | number;

/** Widen the named keys of a generated Row to the wire representation. */
type WireRow<Row, NumericKeys extends keyof Row> = {
  [K in keyof Row]: K extends NumericKeys ? Wire<Row[K]> : Row[K];
};

// ---------------------------------------------------------------------------
// Per-table wire shapes. The key union is checked against the generated Row, so
// a typo or a dropped column fails to compile.
// ---------------------------------------------------------------------------

export type DailyLogWire = WireRow<Tables<'daily_log'>, 'sleep_hours' | 'weight_lb'>;

export type TdeeBaselineWire = WireRow<
  Tables<'tdee_baseline'>,
  'damping_k' | 'early_avg_lb' | 'late_avg_lb' | 'rate_lb_per_day'
>;

export type ActivityWire = WireRow<
  Tables<'activities'>,
  'avg_hr' | 'avg_watts' | 'distance_mi' | 'duration_min' | 'elevation_gain_ft' | 'max_hr'
>;

export type MicronutrientWire = WireRow<Tables<'micronutrients'>, 'amount'>;

export type MealItemWire = WireRow<
  Tables<'meal_items'>,
  'carbs_g' | 'fat_g' | 'fiber_g' | 'protein_g' | 'quantity_g'
>;

export type FoodPresetWire = WireRow<
  Tables<'food_presets'>,
  | 'boron_mg' | 'calcium_mg' | 'carbs_g' | 'fat_g' | 'fiber_g' | 'folate_mcg'
  | 'iron_mg' | 'magnesium_mg' | 'potassium_mg' | 'protein_g' | 'serving_size_g'
  | 'sodium_mg' | 'vitamin_a_mcg' | 'vitamin_b12_mcg' | 'vitamin_c_mg'
  | 'vitamin_d_mcg' | 'vitamin_e_mg' | 'vitamin_k_mcg' | 'zinc_mg'
>;

export type WeightTrendWire = WireRow<
  Tables<'weight_trend'>,
  'calories_14d_avg' | 'calories_7d_avg' | 'weight_14d_avg' | 'weight_7d_avg' | 'weight_lb'
>;

/** These carry no numeric columns, so the generated Row is already accurate. */
export type MealWire = Tables<'meals'>;
export type PlantLogWire = Tables<'plants_log'>;
export type SupplementWire = Tables<'supplements'>;
export type SupplementLogWire = Tables<'supplement_log'>;
export type LabResultWire = Tables<'lab_results'>;
