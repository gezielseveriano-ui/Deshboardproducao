import { supabase, isSupabaseConfigured } from "./supabase-client";
import { Person, CompanyEmail } from "./signatures-types";

function mapRowToPerson(row: any): Person {
  return {
    id: row.id,
    matricula: row.matricula,
    nomeCompleto: row.nome_completo,
    email: row.email || undefined,
    tipo: row.tipo,
    dataCadastro: row.data_cadastro,
  };
}

export async function loadPeopleFromSupabase(): Promise<Person[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("registered_people")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Supabase] Erro ao carregar pessoas cadastradas:", error);
    throw error;
  }
  return (data || []).map(mapRowToPerson);
}

export async function savePersonToSupabase(
  nomeCompleto: string,
  matricula: string,
  tipo: Person["tipo"],
  email?: string
): Promise<Person> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes)");
  }
  const { data, error } = await supabase
    .from("registered_people")
    .insert([{ nome_completo: nomeCompleto, matricula, tipo, email: email || null }])
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Erro ao cadastrar pessoa:", error);
    throw error;
  }
  return mapRowToPerson(data);
}

export async function deletePersonFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes)");
  }
  const { error } = await supabase.from("registered_people").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] Erro ao remover pessoa:", error);
    throw error;
  }
}

function mapRowToEmail(row: any): CompanyEmail {
  return {
    id: row.id,
    email: row.email,
    dataCadastro: row.data_cadastro,
  };
}

export async function loadEmailsFromSupabase(): Promise<CompanyEmail[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("company_emails")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Supabase] Erro ao carregar e-mails cadastrados:", error);
    throw error;
  }
  return (data || []).map(mapRowToEmail);
}

export async function saveEmailToSupabase(email: string): Promise<CompanyEmail> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes)");
  }
  const { data, error } = await supabase
    .from("company_emails")
    .insert([{ email }])
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Erro ao cadastrar e-mail:", error);
    throw error;
  }
  return mapRowToEmail(data);
}

export async function deleteEmailFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes)");
  }
  const { error } = await supabase.from("company_emails").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] Erro ao remover e-mail:", error);
    throw error;
  }
}
