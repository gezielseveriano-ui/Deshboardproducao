import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ModeloResumoItem {
  modelo: string;
  quantidade: number;
  dataRecuperacao: string;
}

export interface ExecutanteResumoItem {
  executanteName: string;
  quantidadeTotal: number;
  dataExecucao: string;
}

export interface ExportReportsParams {
  modeloResumo: ModeloResumoItem[];
  executanteResumo: ExecutanteResumoItem[];
  periodLabel: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Exporta relatórios de produção em formato Excel
 * Cria duas abas: "Por Modelo" e "Por Executante"
 */
export function exportReportsToExcel({
  modeloResumo,
  executanteResumo,
  periodLabel,
  startDate,
  endDate,
}: ExportReportsParams) {
  // Criar workbook
  const workbook = XLSX.utils.book_new();

  // Formatar datas
  const startDateFormatted = format(startDate, 'dd/MM/yyyy', { locale: ptBR });
  const endDateFormatted = format(endDate, 'dd/MM/yyyy', { locale: ptBR });
  const generatedDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });

  // ===== ABA 1: POR MODELO =====
  const modeloData = [
    ['RELATÓRIO DE PRODUÇÃO - POR MODELO'],
    [],
    ['Período:', periodLabel],
    ['Data Inicial:', startDateFormatted],
    ['Data Final:', endDateFormatted],
    ['Data de Geração:', generatedDate],
    [],
    ['Modelo', 'Quantidade', 'Data de Recuperação'],
    ...modeloResumo.map((item) => [
      item.modelo,
      item.quantidade,
      item.dataRecuperacao,
    ]),
    [],
    ['TOTAL DE PEÇAS:', modeloResumo.reduce((sum, item) => sum + item.quantidade, 0)],
  ];

  const modeloSheet = XLSX.utils.aoa_to_sheet(modeloData);
  
  // Formatar coluna de quantidade
  modeloSheet['!cols'] = [
    { wch: 35 }, // Modelo
    { wch: 15 }, // Quantidade
    { wch: 20 }, // Data
  ];

  // Estilo: negrito para cabeçalho
  if (modeloSheet['A8']) modeloSheet['A8'].s = { font: { bold: true } };
  if (modeloSheet['B8']) modeloSheet['B8'].s = { font: { bold: true } };
  if (modeloSheet['C8']) modeloSheet['C8'].s = { font: { bold: true } };

  XLSX.utils.book_append_sheet(workbook, modeloSheet, 'Por Modelo');

  // ===== ABA 2: POR EXECUTANTE =====
  const executanteData = [
    ['RELATÓRIO DE PRODUÇÃO - POR EXECUTANTE'],
    [],
    ['Período:', periodLabel],
    ['Data Inicial:', startDateFormatted],
    ['Data Final:', endDateFormatted],
    ['Data de Geração:', generatedDate],
    [],
    ['Executante', 'Quantidade Total', 'Data de Execução'],
    ...executanteResumo.map((item) => [
      item.executanteName,
      item.quantidadeTotal,
      item.dataExecucao,
    ]),
    [],
    ['TOTAL DE PEÇAS:', executanteResumo.reduce((sum, item) => sum + item.quantidadeTotal, 0)],
  ];

  const executanteSheet = XLSX.utils.aoa_to_sheet(executanteData);
  
  // Formatar coluna
  executanteSheet['!cols'] = [
    { wch: 25 }, // Executante
    { wch: 18 }, // Quantidade
    { wch: 20 }, // Data
  ];

  // Estilo: negrito para cabeçalho
  if (executanteSheet['A8']) executanteSheet['A8'].s = { font: { bold: true } };
  if (executanteSheet['B8']) executanteSheet['B8'].s = { font: { bold: true } };
  if (executanteSheet['C8']) executanteSheet['C8'].s = { font: { bold: true } };

  XLSX.utils.book_append_sheet(workbook, executanteSheet, 'Por Executante');

  // Gerar nome do arquivo
  const fileName = `Relatorio_Producao_${format(new Date(), 'ddMMyyyy_HHmmss', { locale: ptBR })}.xlsx`;

  // Salvar arquivo
  XLSX.writeFile(workbook, fileName);
}
