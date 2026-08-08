/**
 * Tipos para o sistema de relatórios
 */

export interface CompletedChecklistRecord {
  id: string;
  checklistCode: string; // ex: CL-ENG-1029/04.01
  checklistName: string; // ex: CHECKLIST – Inspeção da Lateral do Truque Barba
  categoria: 'Lateral' | 'Travessa' | 'Triângulo'; // ex: Lateral, Travessa ou Triângulo
  modelo: string; // ex: Lateral Barber 6.1/2x12
  resultado: 'OK' | 'NÃO OK' | 'NÃO APLICÁVEL'; // resultado final
  executanteName: string; // ex: André Souza
  executanteMatricula: string; // ex: 10
  dataRecuperacao: string; // ex: 02/02/2026 (DD/MM/YYYY)
  dataFabricacao: string; // ex: 01/02/2026 (DD/MM/YYYY)
  numeroSerie: string; // ex: 456
  numeroOP: string; // ex: 677
  timestamp: number; // timestamp para cálculos de data
  pdfFileName: string; // ex: 456-02022026.pdf
  // Id gerado no aparelho no momento em que o checklist foi finalizado -
  // igual a `id` até o servidor confirmar e trocar `id` pelo id real do
  // Supabase. Usado pra reconhecer que uma linha vinda do Supabase é a
  // mesma que um registro local ainda com o id provisório, evitando
  // duplicar o card no Histórico quando os dois lados ainda não bateram.
  clientChecklistId?: string;
}

/**
 * Resumo por Modelo - Agrupado
 * Exemplo: Ride Master teve 30 checklists
 */
export interface ModeloResumo {
  modelo: string;
  quantidade: number;
  checklistCode: string;
  dataRecuperacao: string; // data mais recente
  categoria: string;
}

/**
 * Resumo por Categoria - Agrupado
 * Exemplo: Triângulo teve 50 checklists, independente do modelo
 */
export interface CategoriaResumo {
  categoria: string;
  quantidade: number;
}

/**
 * Resumo por Executante + Categoria - Agrupado
 * Exemplo: Alex fez 15 Laterais e 8 Triângulos
 */
export interface ExecutanteCategoriaResumo {
  executanteName: string;
  executanteMatricula: string;
  categoria: string;
  quantidade: number;
  dataExecucao: string; // data mais recente
}

/**
 * Resumo por Executante - Agrupado
 * Exemplo: Alex fez 15 checklists
 */
export interface ExecutanteResumoAgrupado {
  executanteName: string;
  executanteMatricula: string;
  quantidadeTotal: number;
  dataExecucao: string; // data mais recente
}

/**
 * Detalhes de um executante - para modal
 * Mostra quais modelos um executante fez
 */
export interface ExecutanteDetalhes {
  executanteName: string;
  executanteMatricula: string;
  modelos: Array<{
    modelo: string;
    quantidade: number;
    dataRecuperacao: string;
  }>;
  quantidadeTotal: number;
}

/**
 * Detalhes de um modelo - para modal
 * Mostra quais executantes fizeram um modelo
 */
export interface ModeloDetalhes {
  modelo: string;
  checklistCode: string;
  executantes: Array<{
    executanteName: string;
    executanteMatricula: string;
    quantidade: number;
    dataRecuperacao: string;
  }>;
  quantidadeTotal: number;
}

export type DateFilterType = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}
