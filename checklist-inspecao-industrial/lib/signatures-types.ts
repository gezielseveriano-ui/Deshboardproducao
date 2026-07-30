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
  adicionarExecutante: (nomeCompleto: string, matricula: string, email?: string) => void;
  removerExecutante: (id: string) => void;
  buscarExecutantePorMatricula: (matricula: string) => Person | undefined;

  // Líderes
  lideres: Person[];
  adicionarLider: (nomeCompleto: string, matricula: string, email?: string) => void;
  removerLider: (id: string) => void;
  buscarLiderPorMatricula: (matricula: string) => Person | undefined;

  // Inspetores
  inspetores: Person[];
  adicionarInspetor: (nomeCompleto: string, matricula: string, email?: string) => void;
  removerInspetor: (id: string) => void;
  buscarInspetorPorMatricula: (matricula: string) => Person | undefined;

  // E-mails da Empresa
  emails?: CompanyEmail[];
  adicionarEmail: (email: string) => void;
  removerEmail: (id: string) => void;

  // Utilitários
  buscarPessoaPorMatricula: (matricula: string, tipo: Person["tipo"]) => Person | undefined;
  obterNomePorMatricula: (matricula: string, tipo: Person["tipo"]) => string;
}
