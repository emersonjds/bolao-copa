import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** true enquanto a sessão inicial ainda está sendo carregada. */
  loading: boolean;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);
