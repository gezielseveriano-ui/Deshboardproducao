import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ Supabase credentials not configured. Cross-device sync will not work."
  );
}

// createClient() throws synchronously if the URL is empty, which would crash
// the whole app at import time (not just disable sync) whenever the
// EXPO_PUBLIC_SUPABASE_* env vars aren't injected — e.g. a failed/partial
// deploy. Fall back to a harmless placeholder URL so the client always
// constructs; real calls just fail gracefully later (caught by supabase-sync.ts)
// when isSupabaseConfigured is false.
export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Database = {
  public: {
    Tables: {
      completed_checklists: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          device_id: string;
          checklist_type: string;
          resultado: Record<string, any>;
          pdf_url: string | null;
          sync_status: "pending" | "synced" | "failed";
          employee_name: string;
          employee_matricula: string;
          signatures: Record<string, any>;
          observations: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          device_id: string;
          checklist_type: string;
          resultado: Record<string, any>;
          pdf_url?: string | null;
          sync_status?: "pending" | "synced" | "failed";
          employee_name: string;
          employee_matricula: string;
          signatures: Record<string, any>;
          observations: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          device_id?: string;
          checklist_type?: string;
          resultado?: Record<string, any>;
          pdf_url?: string | null;
          sync_status?: "pending" | "synced" | "failed";
          employee_name?: string;
          employee_matricula?: string;
          signatures?: Record<string, any>;
          observations?: string;
        };
      };
    };
  };
};
