/**
 * GENERATED from the live Supabase schema — do not hand-edit.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --project-id coyvxupbwxhfzfoxgnzv > src/data/database.types.ts
 *
 * IMPORTANT CAVEAT, see ./wire.ts: this file declares every `numeric` column as
 * `number`, but PostgREST serializes `numeric` as a JSON *string* to preserve
 * precision. Do not consume these Row types directly for numeric columns —
 * consume the widened wire types instead.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          avg_hr: number | null; avg_watts: number | null; calories: number | null;
          created_at: string; distance_mi: number | null; duration_min: number;
          elevation_gain_ft: number | null; id: number; log_date: string;
          max_hr: number | null; name: string; relative_effort: number | null;
          source: string; sport_type: string;
        };
      };
      daily_log: {
        Row: {
          burn_cal: number | null; calories: number; carbs_g: number; created_at: string;
          fat_g: number; fiber_g: number; hrv: number; id: number; is_complete: boolean;
          log_date: string; protein_g: number; rhr: number; score: number;
          sleep_hours: number; surplus_deficit: number | null; tdee: number;
          weight_lb: number | null; workout: string;
        };
      };
      food_presets: {
        Row: {
          boron_mg: number | null; brand: string | null; calcium_mg: number | null;
          calories: number; carbs_g: number; created_at: string; fat_g: number;
          fiber_g: number; folate_mcg: number | null; id: number; iron_mg: number | null;
          magnesium_mg: number | null; name: string; notes: string | null;
          potassium_mg: number | null; protein_g: number; serving_size_g: number;
          sodium_mg: number | null; vitamin_a_mcg: number | null;
          vitamin_b12_mcg: number | null; vitamin_c_mg: number | null;
          vitamin_d_mcg: number | null; vitamin_e_mg: number | null;
          vitamin_k_mcg: number | null; zinc_mg: number | null;
        };
      };
      lab_results: {
        Row: {
          category: string; id: number; recommendation: string; result: string;
          sort_order: number; status: string; test: string; test_date: string;
        };
      };
      meal_items: {
        Row: {
          calories: number | null; carbs_g: number | null; created_at: string;
          fat_g: number | null; fiber_g: number | null; food_name: string; id: number;
          is_estimate: boolean; log_date: string; meal_id: number | null;
          preset_id: number | null; protein_g: number | null;
          quantity_desc: string | null; quantity_g: number | null;
        };
      };
      meals: {
        Row: {
          calories: number; carbs_g: number; description: string; fat_g: number;
          fiber_g: number; id: number; log_date: string; logged_at: string;
          meal_type: string; protein_g: number;
        };
      };
      micronutrients: {
        Row: {
          amount: number; id: number; log_date: string; logged_at: string;
          nutrient: string; source: string; source_detail: string | null; unit: string;
        };
      };
      plants_log: {
        Row: {
          created_at: string; id: number; log_date: string;
          plant_name: string; source_food: string;
        };
      };
      supplement_log: {
        Row: {
          id: number; log_date: string; supplement_name: string;
          taken_at: string; time_of_day: string;
        };
      };
      supplements: {
        Row: { dosage: string; id: number; name: string; purpose: string; sort_order: number };
      };
      tdee_baseline: {
        Row: {
          baseline_cal: number; burn_method: string | null; created_at: string;
          damping_k: number; early_avg_lb: number | null; effective_date: string;
          id: number; implied_baseline: number | null; late_avg_lb: number | null;
          mean_burn: number | null; mean_intake: number | null; note: string | null;
          prior_baseline: number | null; rate_lb_per_day: number | null;
          window_days: number | null; window_end: string | null; window_start: string | null;
        };
      };
    };
    Views: {
      /**
       * Server-side rolling averages. The dashboard currently recomputes these
       * client-side; this view already provides them, including how many
       * weigh-ins actually fell inside each window.
       */
      weight_trend: {
        Row: {
          calories: number | null; calories_14d_avg: number | null;
          calories_7d_avg: number | null; log_date: string | null;
          surplus_deficit: number | null; tdee: number | null;
          weight_14d_avg: number | null; weight_7d_avg: number | null;
          weight_days_in_14d_window: number | null;
          weight_days_in_7d_window: number | null; weight_lb: number | null;
        };
      };
    };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never;

export type TableName = keyof PublicSchema['Tables'];
export type ViewName = keyof PublicSchema['Views'];
