import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase-client";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      setSession(newSession);
      setIsLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? traduzErro(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email: string) => {
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin + "/reset-password" : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error ? traduzErro(error.message) : null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? traduzErro(error.message) : null };
  };

  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isPasswordRecovery,
        signIn,
        signOut,
        requestPasswordReset,
        updatePassword,
        clearPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function traduzErro(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Email ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Email ainda não confirmado.";
  if (/password.*at least/i.test(message)) return "A senha precisa ter pelo menos 6 caracteres.";
  return message;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
