import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Person, SignaturesContextType, CompanyEmail } from "./signatures-types";

const SignaturesContext = createContext<SignaturesContextType | undefined>(undefined);

const STORAGE_KEY_EXECUTANTES = "mrs_executantes";
const STORAGE_KEY_LIDERES = "mrs_lideres";
const STORAGE_KEY_INSPETORES = "mrs_inspetores";
const STORAGE_KEY_EMAILS = "mrs_emails";

export function SignaturesProvider({ children }: { children: React.ReactNode }) {
  const [executantes, setExecutantes] = useState<Person[]>([]);
  const [lideres, setLideres] = useState<Person[]>([]);
  const [inspetores, setInspetores] = useState<Person[]>([]);
  const [emails, setEmails] = useState<CompanyEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados do AsyncStorage ao inicializar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
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
      console.error("Erro ao carregar dados de assinaturas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveExecutantes = async (data: Person[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_EXECUTANTES, JSON.stringify(data));
      setExecutantes(data);
    } catch (error) {
      console.error("Erro ao salvar executantes:", error);
    }
  };

  const saveLideres = async (data: Person[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_LIDERES, JSON.stringify(data));
      setLideres(data);
    } catch (error) {
      console.error("Erro ao salvar líderes:", error);
    }
  };

  const saveInspetores = async (data: Person[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_INSPETORES, JSON.stringify(data));
      setInspetores(data);
    } catch (error) {
      console.error("Erro ao salvar inspetores:", error);
    }
  };

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const adicionarExecutante = (nomeCompleto: string, matricula: string, email?: string) => {
    const novaPessoa: Person = {
      id: generateId(),
      matricula,
      nomeCompleto,
      email,
      tipo: "executante",
      dataCadastro: new Date().toISOString(),
    };
    saveExecutantes([...executantes, novaPessoa]);
  };

  const removerExecutante = (id: string) => {
    saveExecutantes(executantes.filter((p) => p.id !== id));
  };

  const buscarExecutantePorMatricula = (matricula: string) => {
    return executantes.find((p) => p.matricula === matricula);
  };

  const adicionarLider = (nomeCompleto: string, matricula: string, email?: string) => {
    const novaPessoa: Person = {
      id: generateId(),
      matricula,
      nomeCompleto,
      email,
      tipo: "lider",
      dataCadastro: new Date().toISOString(),
    };
    saveLideres([...lideres, novaPessoa]);
  };

  const removerLider = (id: string) => {
    saveLideres(lideres.filter((p) => p.id !== id));
  };

  const buscarLiderPorMatricula = (matricula: string) => {
    return lideres.find((p) => p.matricula === matricula);
  };

  const adicionarInspetor = (nomeCompleto: string, matricula: string, email?: string) => {
    const novaPessoa: Person = {
      id: generateId(),
      matricula,
      nomeCompleto,
      email,
      tipo: "inspetor",
      dataCadastro: new Date().toISOString(),
    };
    saveInspetores([...inspetores, novaPessoa]);
  };

  const removerInspetor = (id: string) => {
    saveInspetores(inspetores.filter((p) => p.id !== id));
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

  const saveEmails = async (data: CompanyEmail[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(data));
      setEmails(data);
    } catch (error) {
      console.error("Erro ao salvar e-mails:", error);
    }
  };

  const adicionarEmail = (email: string) => {
    const novoEmail: CompanyEmail = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      dataCadastro: new Date().toISOString(),
    };
    saveEmails([...emails, novoEmail]);
  };

  const removerEmail = (id: string) => {
    saveEmails(emails.filter((e) => e.id !== id));
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
