"use client";

import { useContext } from "react";
import { AuthContext, type AuthState } from "./auth-context";

/** Estado completo de auth. Lança se usado fora do AuthProvider. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }
  return ctx;
}

export function useUser() {
  return useAuth().user;
}

export function useSession() {
  return useAuth().session;
}
