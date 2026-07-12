"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./client";

type AuthState = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    // Without Firebase env config (fresh checkout, design review) the app
    // still renders public pages as signed-out instead of crashing at boot.
    if (!isFirebaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ user: null, loading: false });
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      setState({ user, loading: false });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
