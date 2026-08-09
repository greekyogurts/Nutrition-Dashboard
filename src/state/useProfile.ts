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
 * where a weight typed in once overrode every later weigh-in. A save from
 * before `title`/`subtitle`/`avatar_data_url` replaced `name` carries `name`
 * instead — read once as a starting title, same as the other legacy fields
 * this function already absorbs.
 */
function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Profile> & { name?: string | null };
    return {
      title: parsed.title ?? (parsed.name ? `${parsed.name}'s Health Dashboard` : null),
      subtitle: parsed.subtitle ?? null,
      avatar_data_url: parsed.avatar_data_url ?? null,
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

/**
 * The pre-multi-user profile has no user in its key. The first account to
 * read a namespaced key with nothing of its own inherits it, and the legacy
 * key is deleted in the same step -- so it is claimed exactly once, rather
 * than being re-read as a fallback by every later account that also lacks a
 * namespaced profile of its own. A namespaced key that already has a value
 * short-circuits before ever touching the legacy key.
 */
function readProfile(key: string): Profile | null {
  try {
    const own = parseProfile(localStorage.getItem(key));
    if (own) return own;
    const legacy = parseProfile(localStorage.getItem(LEGACY_PROFILE_KEY));
    if (!legacy) return null;
    localStorage.setItem(key, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    return legacy;
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
