/**
 * Monta o conteúdo (docDefinition do pdfmake) do Relatório de Produção
 * (aba Relatórios > "Gerar Relatório em PDF").
 *
 * Roda no servidor (via pdfmake + PdfKit, sem navegador/Chromium) pelo
 * mesmo motivo do PDF de checklist: no web, expo-print não sabe renderizar
 * HTML pra PDF de verdade - `printToFileAsync` cai pra `window.print()`,
 * que só imprime a página atual (a tela do app), não o conteúdo do
 * relatório. Gerando em pdfmake no servidor, o resultado é sempre o mesmo
 * PDF de verdade, em qualquer plataforma.
 */

export interface CategoriaResumoPdf {
  categoria: string;
  quantidade: number;
}

export interface ModeloResumoPdf {
  categoria: string;
  modelo: string;
  quantidade: number;
  dataRecuperacao: string;
}

export interface ExecutanteCategoriaResumoPdf {
  executanteName: string;
  executanteMatricula: string;
  categoria: string;
  quantidade: number;
  dataExecucao: string;
}

export interface ProductionReportPdfOptions {
  periodo: string;
  dataGeracao: string;
  totalChecklists: number;
  categoriaResumo: CategoriaResumoPdf[];
  modeloResumo: ModeloResumoPdf[];
  executanteCategoriaResumo: ExecutanteCategoriaResumoPdf[];
}

const AZUL = "#0a7ea4";
const CINZA_FUNDO = "#f5f5f5";
const CINZA_SUBTITULO = "#eef4f7";
const CINZA_BORDA = "#e5e7eb";

function sectionTitle(texto: string) {
  return {
    text: texto,
    color: AZUL,
    bold: true,
    fontSize: 13,
    margin: [0, 14, 0, 8] as [number, number, number, number],
  };
}

function subsectionTitle(texto: string) {
  return {
    table: { widths: ["*"], body: [[{ text: texto, bold: true, fontSize: 9, fillColor: CINZA_SUBTITULO, margin: [6, 4, 6, 4] }]] },
    layout: "noBorders" as const,
    margin: [0, 8, 0, 4] as [number, number, number, number],
  };
}

function tabela(cabecalho: string[], linhas: (string | number)[][], widths: (string | number)[]) {
  return {
    table: {
      widths,
      headerRows: 1,
      body: [
        cabecalho.map((texto) => ({ text: texto, style: "th" })),
        ...linhas.map((linha) => linha.map((valor, i) => ({ text: String(valor), alignment: i === 1 ? "center" : "left" }))),
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => CINZA_BORDA,
    },
    margin: [0, 0, 0, 8] as [number, number, number, number],
  };
}

function agruparPor<T, K extends string>(itens: T[], chave: (item: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  itens.forEach((item) => {
    const k = chave(item);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(item);
  });
  return mapa;
}

function buildProductionReportPdfContent(options: ProductionReportPdfOptions) {
  const modelosPorCategoria = agruparPor(options.modeloResumo, (item) => item.categoria);
  const executantesAgrupados = agruparPor(options.executanteCategoriaResumo, (item) => item.executanteName);
  const totalExecutantes = executantesAgrupados.size;

  const modeloSecoes = Array.from(modelosPorCategoria.entries()).flatMap(([categoria, itens]) => [
    subsectionTitle(categoria),
    tabela(
      ["Modelo", "Quantidade", "Data"],
      itens.map((item) => [item.modelo, item.quantidade, item.dataRecuperacao]),
      ["*", 80, 80]
    ),
  ]);

  const executanteSecoes = Array.from(executantesAgrupados.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .flatMap(([executanteName, itens]) => {
      const total = itens.reduce((soma, item) => soma + item.quantidade, 0);
      const matricula = itens[0]?.executanteMatricula || "";
      const ordenados = [...itens].sort((a, b) => b.quantidade - a.quantidade);
      return [
        subsectionTitle(`${executanteName} (Matrícula: ${matricula}) — Total: ${total}`),
        tabela(
          ["Categoria", "Quantidade", "Data"],
          ordenados.map((item) => [item.categoria, item.quantidade, item.dataExecucao]),
          ["*", 80, 80]
        ),
      ];
    });

  return [
    {
      text: "RELATÓRIO DE PRODUÇÃO",
      color: AZUL,
      bold: true,
      fontSize: 20,
      alignment: "center",
      margin: [0, 0, 0, 2] as [number, number, number, number],
    },
    { text: "MRS - Manutenção de Vagões", alignment: "center", color: "#687076", fontSize: 10, margin: [0, 0, 0, 14] as [number, number, number, number] },

    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: [{ text: "Período: ", bold: true }, options.periodo], fontSize: 9 },
                { text: [{ text: "Data de Geração: ", bold: true }, options.dataGeracao], fontSize: 9, margin: [0, 3, 0, 0] },
              ],
              fillColor: CINZA_FUNDO,
              margin: [10, 8, 10, 8],
            },
          ],
        ],
      },
      layout: "noBorders" as const,
      margin: [0, 0, 0, 4] as [number, number, number, number],
    },

    sectionTitle("RESUMO GERAL"),
    tabela(
      ["Total de Checklists", "Total de Modelos", "Total de Executantes"],
      [[options.totalChecklists, options.modeloResumo.length, totalExecutantes]],
      ["*", "*", "*"]
    ),

    sectionTitle("RESUMO POR CATEGORIA"),
    tabela(
      ["Categoria", "Quantidade"],
      options.categoriaResumo.map((item) => [item.categoria, item.quantidade]),
      ["*", 100]
    ),

    sectionTitle("RESUMO POR MODELO"),
    ...modeloSecoes,

    sectionTitle("PRODUÇÃO POR EXECUTANTE"),
    ...executanteSecoes,
  ];
}

export function buildProductionReportPdfDocDefinition(options: ProductionReportPdfOptions) {
  return {
    pageSize: "A4" as const,
    pageMargins: [30, 30, 30, 40] as [number, number, number, number],
    defaultStyle: { font: "DejaVu", fontSize: 9 },
    styles: {
      th: { bold: true, fontSize: 8, color: "white", fillColor: AZUL },
    },
    content: buildProductionReportPdfContent(options),
    footer: (currentPage: number, pageCount: number) => ({
      text: `Gerado pelo sistema de checklists MRS em ${new Date().toLocaleDateString("pt-BR")} — Página ${currentPage} de ${pageCount}`,
      fontSize: 7,
      color: "#666666",
      alignment: "center",
    }),
  };
}
