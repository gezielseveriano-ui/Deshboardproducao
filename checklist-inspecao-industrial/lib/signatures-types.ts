/**
 * Tipos para o sistema de Banco de Assinaturas
 * Gerencia Executantes, Líderes e Inspetores
 */

export interface Person {
  id: string;
  matricula: string;
  nomeCompleto: string;
  email?: string;
  tipo: "executante" | "lider" | "inspetor";
  dataCadastro: string;
}

export interface CompanyEmail {
  id: string;
  email: string;
  dataCadastro: string;
}

export interface SignatureData {
  matricula: string;
  nomeCompleto: string;
  tipo: "executante" | "lider" | "inspetor";
}

export interface SignaturesContextType {
  // Executantes
  executantes: Person[];
  adicionarExecutante: (nomeCompleto: string, matricula: string, email?: string) => Promise<void>;
  removerExecutante: (id: string) => Promise<void>;
  buscarExecutantePorMatricula: (matricula: string) => Person | undefined;

  // Líderes
  lideres: Person[];
  adicionarLider: (nomeCompleto: string, matricula: string, email?: string) => Promise<void>;
  removerLider: (id: string) => Promise<void>;
  buscarLiderPorMatricula: (matricula: string) => Person | undefined;

  // Inspetores
  inspetores: Person[];
  adicionarInspetor: (nomeCompleto: string, matricula: string, email?: string) => Promise<void>;
  removerInspetor: (id: string) => Promise<void>;
  buscarInspetorPorMatricula: (matricula: string) => Person | undefined;

  // E-mails da Empresa
  emails?: CompanyEmail[];
  adicionarEmail: (email: string) => Promise<void>;
  removerEmail: (id: string) => Promise<void>;

  // Utilitários
  buscarPessoaPorMatricula: (matricula: string, tipo: Person["tipo"]) => Person | undefined;
  obterNomePorMatricula: (matricula: string, tipo: Person["tipo"]) => string;
}
