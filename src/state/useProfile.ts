import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { LEGACY_PROFILE_KEY, profileKey, type Profile } from '../lib/profile';
import { getSession, subscribe } from './sessionStore';

/**
 * The profile is shaped like a future `profiles` table row (that table now
 * exists), so moving it server-side later is a lift rather than a rewrite.
 * Until then it stays in localStorage but is keyed per user, so two family
 * members on the same browser don't inherit each other's goals and macro
 * targets.
 *
 * Unknown keys on a stored profile are ignored rather than migrated. Older saves
 * still carry `height_cm`, `weight_lb`, `activity_level` and `body_fat_pct` from
 * before those fields were removed; reading them back would resurrect the bug
 * where a weight typed in once overrode every later weigh-in.
 */
function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
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

function readProfile(key: string): Profile | null {
  try {
    // The pre-multi-user profile has no user in its key. Fall back to it once
    // so the person who set the dashboard up keeps their settings; it is
    // rewritten under the namespaced key on the next save.
    return parseProfile(localStorage.getItem(key)) ?? parseProfile(localStorage.getItem(LEGACY_PROFILE_KEY));
  } catch {
    return null;
  }
}

export function useProfile() {
  const session = useSyncExternalStore(subscribe, getSession, getSession);
  const key = profileKey(session?.user.id ?? null);

  const [profile, setProfileState] = useState<Profile | null>(() => readProfile(key));

  // Switching accounts has to re-read from the new namespace, otherwise the
  // previous user's profile stays on screen.
  useEffect(() => {
    setProfileState(readProfile(key));
  }, [key]);

  const setProfile = useCallback((next: Profile | null) => {
    setProfileState(next);
    try {
      if (next) localStorage.setItem(key, JSON.stringify(next));
      else localStorage.removeItem(key);
    } catch {
      /* private mode — keep the in-memory value */
    }
  }, [key]);

  // Keep two open tabs consistent.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setProfileState(readProfile(key));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return { profile, setProfile };
}
