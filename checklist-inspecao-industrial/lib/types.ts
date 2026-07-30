/**
 * Tipos e interfaces para o Checklist de Inspeção Industrial
 * Suporta múltiplos tipos de checklists (8 diferentes - Laterais e Travessas)
 */

import { ChecklistType } from "./checklist-configs";

export type ResultadoEtapa = "OK" | "NAO_OK" | "NAO_APLICAVEL";

export type ResultadoVerificacao = "APROVADO" | "REPROVADO";

export interface DadosIniciais {
  data: string; // YYYY-MM-DD
  dataFabricacao: string;
  numeroOP: string;
  numeroSerie: string;
  dataRecuperacao: string;
  numeroRelatorioPM: string;
}

export interface Etapa {
  numero: number;
  titulo: string;
  descricao: string;
  resultado: ResultadoEtapa | null;
  medidas: MedidaEtapa[];
}

export interface MedidaEtapa {
  id: string;
  label: string;
  valor: string | null;
  unidade: string;
  naoAplicavel: boolean;
}

export interface VerificacoesIniciais {
  trinca: ResultadoVerificacao | null;
  empenos: ResultadoVerificacao | null;
}

export interface Assinatura {
  nome: string;
  matricula: string;
  assinatura: string; // base64 encoded image
}

export interface Assinaturas {
  executante: Assinatura | null;
  liderMRS: Assinatura | null;
  inspectorTecnico: Assinatura | null;
}

export interface PerguntasFinais {
  substituicaoChapaColuna: "SIM" | "NAO" | null;
  substituicaoChapaGuia: "SIM" | "NAO" | null;
}

export interface Checklist {
  id: string;
  timestamp: number;
  checklistType: ChecklistType;
  dadosIniciais: DadosIniciais;
  modeloSelecionado: string | null;
  modelo?: string; // Modelo selecionado para o PDF
  verificacoesIniciais: VerificacoesIniciais;
  verificacoes?: {
    trinca?: "APROVADO" | "REPROVADO";
    empeno?: "APROVADO" | "REPROVADO";
  };
  etapas: Etapa[];
  perguntasFinais: PerguntasFinais;
  assinaturas: Assinaturas;
  status: "INCOMPLETO" | "COMPLETO";
}

// Dados das etapas técnicas (mantido para compatibilidade)
export const ETAPAS_TECNICAS: Omit<Etapa, "resultado" | "medidas">[] = [
  {
    numero: 1,
    titulo: "Distância entre Orelhas do Pedestal",
    descricao: "Medir a distância entre as orelhas do pedestal em dois pontos diferentes.",
  },
  {
    numero: 2,
    titulo: "Altura do Pedestal",
    descricao: "Verificar a altura do pedestal conforme especificação técnica.",
  },
  {
    numero: 3,
    titulo: "Distância entre Centros de Furos",
    descricao: "Medir a distância entre os centros dos furos de fixação.",
  },
  {
    numero: 4,
    titulo: "Alinhamento Lateral",
    descricao: "Verificar o alinhamento lateral da lateral do truque.",
  },
  {
    numero: 5,
    titulo: "Espessura da Lateral",
    descricao: "Medir a espessura da lateral em dois pontos diferentes.",
  },
  {
    numero: 6,
    titulo: "Verificação de Corrosão",
    descricao: "Inspecionar visualmente a presença de corrosão ou oxidação.",
  },
  {
    numero: 7,
    titulo: "Aperto de Parafusos",
    descricao: "Verificar o aperto de todos os parafusos de fixação.",
  },
  {
    numero: 8,
    titulo: "Desgaste de Componentes",
    descricao: "Inspecionar o desgaste geral dos componentes.",
  },
  {
    numero: 9,
    titulo: "Alinhamento Vertical",
    descricao: "Verificar o alinhamento vertical da lateral.",
  },
  {
    numero: 10,
    titulo: "Verificação de Rachaduras",
    descricao: "Inspecionar visualmente a presença de rachaduras ou trincas.",
  },
  {
    numero: 11,
    titulo: "Inspeção Final",
    descricao: "Realizar inspeção final geral da lateral do truque.",
  },
];

// Configuração de medidas por etapa (mantido para compatibilidade)
export const MEDIDAS_POR_ETAPA: Record<number, { label: string; unidade: string }[]> = {
  1: [
    { label: "Ponto 1", unidade: "mm" },
    { label: "Ponto 2", unidade: "mm" },
  ],
  2: [{ label: "Altura", unidade: "mm" }],
  3: [
    { label: "Ponto 1", unidade: "mm" },
    { label: "Ponto 2", unidade: "mm" },
  ],
  4: [{ label: "Desvio", unidade: "mm" }],
  5: [
    { label: "Ponto 1", unidade: "mm" },
    { label: "Ponto 2", unidade: "mm" },
  ],
  6: [],
  7: [{ label: "Torque", unidade: "N.m" }],
  8: [],
  9: [{ label: "Desvio", unidade: "mm" }],
  10: [],
  11: [],
};
