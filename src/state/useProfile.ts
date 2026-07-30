import { useCallback, useEffect, useState } from 'react';
import { PROFILE_KEY, type Profile } from '../lib/profile';

/**
 * The profile lives in localStorage and is shaped like a future `profiles` table
 * row, so moving it behind auth later is a lift rather than a rewrite.
 *
 * Unknown keys on a stored profile are ignored rather than migrated. Older saves
 * still carry `height_cm`, `weight_lb`, `activity_level` and `body_fat_pct` from
 * before those fields were removed; reading them back would resurrect the bug
 * where a weight typed in once overrode every later weigh-in.
 */
function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      name: parsed.name ?? null,
      sex: parsed.sex ?? null,
      birth_year: parsed.birth_year ?? null,
      goal: parsed.goal ?? 'maintain',
      diet: parsed.diet ?? 'balanced',
      custom_protein_g: parsed.custom_protein_g ?? null,
      custom_fat_g: parsed.custom_fat_g ?? null,
      restrictions: Array.isArray(parsed.restrictions) ? parsed.restrictions : [],
    };
  } catch {
    return null; // private mode, or corrupt JSON
  }
}

export function useProfile() {
  const [profile, setProfileState] = useState<Profile | null>(readProfile);

  const setProfile = useCallback((next: Profile | null) => {
    setProfileState(next);
    try {
      if (next) localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      else localStorage.removeItem(PROFILE_KEY);
    } catch {
      /* private mode — keep the in-memory value */
    }
  }, []);

  // Keep two open tabs consistent.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_KEY) setProfileState(readProfile());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { profile, setProfile };
}
