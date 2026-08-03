import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";
export interface SMTPConfig {
  email: string;
  servidor: string;
  porta: string;
  senha: string;
}

export interface NetworkConfig {
  url: string;
  usuario: string;
  senha: string;
  host?: string;
  port?: string;
  database?: string;
}

export interface AdminConfig {
  smtp: SMTPConfig;
  network: NetworkConfig;
  linkGerencial: string;
  emailsRecebimento: string[];
}

interface AdminConfigContextType {
  config: AdminConfig | null;
  updateSMTPConfig: (smtp: SMTPConfig) => Promise<void>;
  updateNetworkConfig: (network: NetworkConfig) => Promise<void>;
  addEmailRecebimento: (email: string) => Promise<void>;
  removeEmailRecebimento: (email: string) => Promise<void>;
  generateManagerLink: () => string;
  loadConfig: () => Promise<void>;
}

const AdminConfigContext = createContext<AdminConfigContextType | undefined>(undefined);

// Sem credenciais reais aqui: isso é enviado no bundle do app para qualquer
// dispositivo. Preencha email/senha/servidor pela tela de Configurações do
// app (fica salvo apenas localmente via AsyncStorage), nunca no código-fonte.
const DEFAULT_CONFIG: AdminConfig = {
  smtp: {
    email: "",
    servidor: "smtp.gmail.com",
    porta: "587",
    senha: "",
  },
  network: {
    url: "",
    usuario: "",
    senha: "",
    host: "",
    port: "4000",
    database: "",
  },
  linkGerencial: "",
  emailsRecebimento: [],
};

export function AdminConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AdminConfig | null>(null);

  const loadConfig = async () => {
    try {
      const stored = await AsyncStorage.getItem("admin_config");
      if (stored) {
        setConfig(JSON.parse(stored));
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de admin:", error);
      setConfig(DEFAULT_CONFIG);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const updateSMTPConfig = async (smtp: SMTPConfig) => {
    try {
      const updated = { ...config, smtp, linkGerencial: generateManagerLink() } as AdminConfig;
      setConfig(updated);
      await AsyncStorage.setItem("admin_config", JSON.stringify(updated));
    } catch (error) {
      console.error("Erro ao salvar configurações SMTP:", error);
    }
  };

  const updateNetworkConfig = async (network: NetworkConfig) => {
    try {
      const updated = { ...config, network, linkGerencial: generateManagerLink() } as AdminConfig;
      setConfig(updated);
      await AsyncStorage.setItem("admin_config", JSON.stringify(updated));
    } catch (error) {
      console.error("Erro ao salvar configurações de rede:", error);
    }
  };

  const addEmailRecebimento = async (email: string) => {
    try {
      if (!config) return;
      const emails = config.emailsRecebimento || [];
      if (!emails.includes(email) && email.trim()) {
        const updated = { ...config, emailsRecebimento: [...emails, email] } as AdminConfig;
        setConfig(updated);
        await AsyncStorage.setItem("admin_config", JSON.stringify(updated));
      }
    } catch (error) {
      console.error("Erro ao adicionar e-mail:", error);
    }
  };

  const removeEmailRecebimento = async (email: string) => {
    try {
      if (!config) return;
      const emails = config.emailsRecebimento || [];
      const updated = { ...config, emailsRecebimento: emails.filter((e) => e !== email) } as AdminConfig;
      setConfig(updated);
      await AsyncStorage.setItem("admin_config", JSON.stringify(updated));
    } catch (error) {
      console.error("Erro ao remover e-mail:", error);
    }
  };

  const generateManagerLink = (): string => {
    // Gerar hash base64 do email
    const emailToUse = config?.smtp?.email || "gezielseveriano@gmail.com";
    const hash = btoa(emailToUse);
    
    // Usar URL dinâmica do servidor (funciona em Expo Go e produção)
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) {
      return `${apiBaseUrl}/api/dashboard/link/${hash}`;
    }
    
    // Fallback para URL permanente se getApiBaseUrl() retornar vazio
    return `https://3000-ifo069dj8gxjvi9sf0p70-e0c47854.us1.manus.computer/api/dashboard/link/${hash}`;
  };

  return (
    <AdminConfigContext.Provider
      value={{
        config,
        updateSMTPConfig,
        updateNetworkConfig,
        addEmailRecebimento,
        removeEmailRecebimento,
        generateManagerLink,
        loadConfig,
      }}
    >
      {children}
    </AdminConfigContext.Provider>
  );
}

export function useAdminConfig() {
  const context = useContext(AdminConfigContext);
  if (!context) {
    throw new Error("useAdminConfig deve ser usado dentro de AdminConfigProvider");
  }
  return context;
}
