import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Person, SignaturesContextType, CompanyEmail } from "./signatures-types";
import * as PeopleSync from "./supabase-people-sync";
import { comTentativas } from "./retry";

const SignaturesContext = createContext<SignaturesContextType | undefined>(undefined);

const STORAGE_KEY_EXECUTANTES = "mrs_executantes";
const STORAGE_KEY_LIDERES = "mrs_lideres";
const STORAGE_KEY_INSPETORES = "mrs_inspetores";
const STORAGE_KEY_EMAILS = "mrs_emails";

function mesclarPorId<T extends { id: string }>(local: T[], remoto: T[]): T[] {
  const porId = new Map(local.map((item) => [item.id, item]));
  for (const item of remoto) {
    porId.set(item.id, item);
  }
  return Array.from(porId.values());
}

export function SignaturesProvider({ children }: { children: React.ReactNode }) {
  const [executantes, setExecutantes] = useState<Person[]>([]);
  const [lideres, setLideres] = useState<Person[]>([]);
  const [inspetores, setInspetores] = useState<Person[]>([]);
  const [emails, setEmails] = useState<CompanyEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. Cache local primeiro (rápido, funciona offline).
      const [executantesData, lideresData, inspetoresData, emailsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_EXECUTANTES),
        AsyncStorage.getItem(STORAGE_KEY_LIDERES),
        AsyncStorage.getItem(STORAGE_KEY_INSPETORES),
        AsyncStorage.getItem(STORAGE_KEY_EMAILS),
      ]);

      if (executantesData) setExecutantes(JSON.parse(executantesData));
      if (lideresData) setLideres(JSON.parse(lideresData));
      if (inspetoresData) setInspetores(JSON.parse(inspetoresData));
      if (emailsData) setEmails(JSON.parse(emailsData));
    } catch (error) {
      console.error("Erro ao carregar cache local de assinaturas:", error);
    } finally {
      setIsLoading(false);
    }

    // 2. Busca do Supabase e MESCLA com o que já está local - nunca
    // substitui direto. Um cadastro feito e usado em vários checklists já
    // apareceu como "sumido" antes porque uma resposta vazia (ou parcial)
    // do Supabase - sem nenhum erro, só um resultado vazio por algum
    // motivo - sobrescrevia um cache local que estava correto. Mesclar por
    // id é seguro: exclusões de verdade (removerExecutante/Lider/Inspetor)
    // já atualizam o cache local na hora, então não "ressuscitam" aqui.
    try {
      const [pessoas, emailsRemotos] = await Promise.all([
        comTentativas(() => PeopleSync.loadPeopleFromSupabase()),
        comTentativas(() => PeopleSync.loadEmailsFromSupabase()),
      ]);

      const remotosExecutantes = pessoas.filter((p) => p.tipo === "executante");
      const remotosLideres = pessoas.filter((p) => p.tipo === "lider");
      const remotosInspetores = pessoas.filter((p) => p.tipo === "inspetor");

      const novosExecutantes = mesclarPorId(executantes, remotosExecutantes);
      const novosLideres = mesclarPorId(lideres, remotosLideres);
      const novosInspetores = mesclarPorId(inspetores, remotosInspetores);
      const novosEmails = mesclarPorId(emails, emailsRemotos);

      setExecutantes(novosExecutantes);
      setLideres(novosLideres);
      setInspetores(novosInspetores);
      setEmails(novosEmails);

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY_EXECUTANTES, JSON.stringify(novosExecutantes)),
        AsyncStorage.setItem(STORAGE_KEY_LIDERES, JSON.stringify(novosLideres)),
        AsyncStorage.setItem(STORAGE_KEY_INSPETORES, JSON.stringify(novosInspetores)),
        AsyncStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(novosEmails)),
      ]);
    } catch (error) {
      console.warn(
        "[Signatures] Não foi possível sincronizar cadastros com o servidor, usando cache local:",
        error
      );
    }
  };

  const adicionarExecutante = async (nomeCompleto: string, matricula: string, email?: string) => {
    const pessoa = await PeopleSync.savePersonToSupabase(nomeCompleto, matricula, "executante", email);
    const updated = [...executantes, pessoa];
    setExecutantes(updated);
    await AsyncStorage.setItem(STORAGE_KEY_EXECUTANTES, JSON.stringify(updated));
  };

  const removerExecutante = async (id: string) => {
    await PeopleSync.deletePersonFromSupabase(id);
    const updated = executantes.filter((p) => p.id !== id);
    setExecutantes(updated);
    await AsyncStorage.setItem(STORAGE_KEY_EXECUTANTES, JSON.stringify(updated));
  };

  const buscarExecutantePorMatricula = (matricula: string) => {
    return executantes.find((p) => p.matricula === matricula);
  };

  const adicionarLider = async (nomeCompleto: string, matricula: string, email?: string) => {
    const pessoa = await PeopleSync.savePersonToSupabase(nomeCompleto, matricula, "lider", email);
    const updated = [...lideres, pessoa];
    setLideres(updated);
    await AsyncStorage.setItem(STORAGE_KEY_LIDERES, JSON.stringify(updated));
  };

  const removerLider = async (id: string) => {
    await PeopleSync.deletePersonFromSupabase(id);
    const updated = lideres.filter((p) => p.id !== id);
    setLideres(updated);
    await AsyncStorage.setItem(STORAGE_KEY_LIDERES, JSON.stringify(updated));
  };

  const buscarLiderPorMatricula = (matricula: string) => {
    return lideres.find((p) => p.matricula === matricula);
  };

  const adicionarInspetor = async (nomeCompleto: string, matricula: string, email?: string) => {
    const pessoa = await PeopleSync.savePersonToSupabase(nomeCompleto, matricula, "inspetor", email);
    const updated = [...inspetores, pessoa];
    setInspetores(updated);
    await AsyncStorage.setItem(STORAGE_KEY_INSPETORES, JSON.stringify(updated));
  };

  const removerInspetor = async (id: string) => {
    await PeopleSync.deletePersonFromSupabase(id);
    const updated = inspetores.filter((p) => p.id !== id);
    setInspetores(updated);
    await AsyncStorage.setItem(STORAGE_KEY_INSPETORES, JSON.stringify(updated));
  };

  const buscarInspetorPorMatricula = (matricula: string) => {
    return inspetores.find((p) => p.matricula === matricula);
  };

  const buscarPessoaPorMatricula = (matricula: string, tipo: Person["tipo"]) => {
    switch (tipo) {
      case "executante":
        return buscarExecutantePorMatricula(matricula);
      case "lider":
        return buscarLiderPorMatricula(matricula);
      case "inspetor":
        return buscarInspetorPorMatricula(matricula);
    }
  };

  const obterNomePorMatricula = (matricula: string, tipo: Person["tipo"]) => {
    const pessoa = buscarPessoaPorMatricula(matricula, tipo);
    return pessoa?.nomeCompleto || "";
  };

  const adicionarEmail = async (email: string) => {
    const novoEmail = await PeopleSync.saveEmailToSupabase(email);
    const updated = [...emails, novoEmail];
    setEmails(updated);
    await AsyncStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(updated));
  };

  const removerEmail = async (id: string) => {
    await PeopleSync.deleteEmailFromSupabase(id);
    const updated = emails.filter((e) => e.id !== id);
    setEmails(updated);
    await AsyncStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(updated));
  };

  const value: SignaturesContextType = {
    executantes,
    adicionarExecutante,
    removerExecutante,
    buscarExecutantePorMatricula,
    lideres,
    adicionarLider,
    removerLider,
    buscarLiderPorMatricula,
    inspetores,
    adicionarInspetor,
    removerInspetor,
    buscarInspetorPorMatricula,
    emails,
    adicionarEmail,
    removerEmail,
    buscarPessoaPorMatricula,
    obterNomePorMatricula,
  };

  if (isLoading) {
    return null; // Ou um loading screen
  }

  return <SignaturesContext.Provider value={value}>{children}</SignaturesContext.Provider>;
}

export function useSignatures() {
  const context = useContext(SignaturesContext);
  if (!context) {
    throw new Error("useSignatures deve ser usado dentro de SignaturesProvider");
  }
  return context;
}
