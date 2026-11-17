/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_PROFILE, type Profile } from './data/clinic'

/*
 * Clinic profile, editable from the Clinic profile page.
 * Saved in this browser until the profile API exists.
 */

const KEY = 'prb.profile'

function readProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    const stored = raw ? (JSON.parse(raw) as Profile) : {}
    return { ...DEFAULT_PROFILE, ...stored }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

type ProfileValue = { profile: Profile; saveProfile: (p: Profile) => void }
const ProfileContext = createContext<ProfileValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(readProfile)

  const saveProfile = useCallback((p: Profile) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(p))
    } catch {
      /* storage unavailable: keep for this session only */
    }
    setProfile(p)
  }, [])

  const value = useMemo(() => ({ profile, saveProfile }), [profile, saveProfile])
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>')
  return ctx
}
