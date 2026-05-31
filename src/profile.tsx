import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Gender = 'M' | 'F';

export interface UserProfile {
  firstName: string;
  gender: Gender;
}

const KEY = 'hyrox.profile.v1';

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as UserProfile;
    if (!p?.firstName || (p.gender !== 'M' && p.gender !== 'F')) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProfile(p: UserProfile): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

interface ProfileCtx {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  dialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

const Ctx = createContext<ProfileCtx>({
  profile: null,
  setProfile: () => {},
  dialogOpen: false,
  openDialog: () => {},
  closeDialog: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(() => loadProfile());
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!profile) setDialogOpen(true);
  }, [profile]);

  const setProfile = (p: UserProfile) => {
    saveProfile(p);
    setProfileState(p);
  };

  return (
    <Ctx.Provider
      value={{
        profile,
        setProfile,
        dialogOpen,
        openDialog: () => setDialogOpen(true),
        closeDialog: () => setDialogOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useProfile = () => useContext(Ctx);
