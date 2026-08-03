import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Client do Supabase com a service role key (uso exclusivo do servidor —
 * essa chave ignora RLS, nunca deve ser exposta ao app/cliente).
 * Retorna null se as credenciais não estiverem configuradas, para que quem
 * chamar possa degradar graciosamente em vez de derrubar o processo.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  _client = createClient(url, serviceKey);
  return _client;
}
