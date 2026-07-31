/**
 * Monta o conteúdo (docDefinition do pdfmake) do PDF de um checklist preenchido.
 *
 * Este módulo é puro TypeScript sem nenhuma dependência de Expo/React Native,
 * de propósito: ele roda no servidor (via pdfmake + PdfKit, sem navegador) para
 * gerar o PDF e já salvar direto no Supabase Storage, independente do
 * dispositivo/plataforma que preencheu o checklist ter conseguido gerar o
 * arquivo localmente ou não.
 *
 * O conteúdo replica o mesmo layout de lib/pdf-generator.ts (a versão em HTML
 * usada para impressão local em Android/iOS via expo-print).
 */

export type ResultadoEtapaPdf = "OK" | "NAO_OK" | "NAO_APLICAVEL" | null | undefined;

export interface MedidaPdf {
  label?: string;
  valor?: string | null;
  unidade?: string | null;
}

export interface EtapaPdf {
  resultado?: ResultadoEtapaPdf;
  medidas?: MedidaPdf[];
}

export interface EtapaConfigPdf {
  numero: number;
  sistema: string;
  subsistema: string;
  atividade: string;
  resultadoEsperado: string;
  medidas: { label: string; unidade: string }[];
}

export interface ChecklistConfigPdf {
  codigo: string;
  versao: string;
  titulo: string;
  dataEmissao: string;
  validadeAte: string;
  procedimentoOrigem: string;
  etapas: EtapaConfigPdf[];
}

export interface AssinaturaPdf {
  nome?: string | null;
  matricula?: string | null;
}

export interface ChecklistPdfContentOptions {
  config: ChecklistConfigPdf;
  etapas: EtapaPdf[];
  dataFabricacao: string;
  dataRecuperacao: string;
  numeroOP: string;
  numeroSerie: string;
  modeloSelecionado?: string | null;
  verificacoesIniciais?: { trinca?: "APROVADO" | "REPROVADO" | null; empenos?: "APROVADO" | "REPROVADO" | null };
  perguntasFinais?: { substituicaoChapaColuna?: "SIM" | "NAO" | null; substituicaoChapaGuia?: "SIM" | "NAO" | null };
  assinaturas?: {
    executante?: AssinaturaPdf | null;
    liderMRS?: AssinaturaPdf | null;
    inspectorTecnico?: AssinaturaPdf | null;
  };
}

const AZUL = "#006699";
const CINZA_FUNDO = "#f9f9f9";
const CINZA_BORDA = "#dddddd";

function checkbox(marcado: boolean): string {
  return marcado ? "☑" : "☐";
}

function resultadoTexto(resultado: ResultadoEtapaPdf): { texto: string; cor: string } {
  if (resultado === "OK") return { texto: "✓ OK", cor: "#16a34a" };
  if (resultado === "NAO_OK") return { texto: "✗ NÃO OK", cor: "#dc2626" };
  if (resultado === "NAO_APLICAVEL") return { texto: "— N/A", cor: "#6b7280" };
  return { texto: "—", cor: "#6b7280" };
}

function sectionTitle(texto: string, pageBreak?: "before") {
  return {
    table: {
      widths: ["*"],
      body: [[{ text: texto, color: "white", fillColor: AZUL, bold: true, fontSize: 10, margin: [6, 5, 6, 5] }]],
    },
    layout: "noBorders" as const,
    margin: [0, 10, 0, 4] as [number, number, number, number],
    ...(pageBreak ? { pageBreak } : {}),
  };
}

function sectionBox(rows: any[]) {
  return {
    table: { widths: ["*"], body: [[{ stack: rows, fillColor: CINZA_FUNDO, margin: [8, 6, 8, 6] }]] },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => CINZA_BORDA,
      vLineColor: () => CINZA_BORDA,
    },
  };
}

function medidasCellContent(etapaConfig: EtapaConfigPdf, etapa: EtapaPdf | undefined, naoAplicavel: boolean) {
  if (etapaConfig.medidas.length === 0) {
    return { text: "Não Aplicável", fontSize: 7, color: "#6b7280" };
  }
  if (naoAplicavel) {
    return { text: "—", fontSize: 7, color: "#6b7280" };
  }
  const medidasComValor = (etapa?.medidas || []).filter((m) => m && m.valor);
  if (medidasComValor.length === 0) {
    return { text: "—", fontSize: 7, color: "#6b7280" };
  }
  return {
    stack: medidasComValor.map((med, i) => {
      const label = etapaConfig.medidas[i]?.label || med.label || `Medida ${i + 1}`;
      const valor = `${med.valor ?? ""}${med.unidade ? " " + med.unidade : ""}`;
      return { text: [{ text: `${label}: `, bold: true }, valor], fontSize: 7, margin: [0, 0, 0, 2] as [number, number, number, number] };
    }),
  };
}

export function buildChecklistPdfContent(options: ChecklistPdfContentOptions) {
  const { config, etapas, dataFabricacao, dataRecuperacao, numeroOP, numeroSerie } = options;
  const trinca = options.verificacoesIniciais?.trinca;
  const empenos = options.verificacoesIniciais?.empenos;
  const perguntasFinais = options.perguntasFinais || {};
  const assinaturas = options.assinaturas || {};

  const tabelaHeader = [
    { text: "ETAPA", style: "th" },
    { text: "SISTEMA", style: "th" },
    { text: "SUBSISTEMA", style: "th" },
    { text: "ATIVIDADE", style: "th" },
    { text: "RESULTADO ESPERADO", style: "th" },
    { text: "RESULTADO", style: "th" },
    { text: "MEDIDAS", style: "th" },
  ];

  const tabelaRows = config.etapas.map((etapaConfig, index) => {
    const etapa = etapas[index];
    const { texto, cor } = resultadoTexto(etapa?.resultado);
    const naoAplicavel = etapa?.resultado === "NAO_APLICAVEL";
    return [
      { text: String(etapaConfig.numero), fontSize: 8, alignment: "center" },
      { text: etapaConfig.sistema, fontSize: 7 },
      { text: etapaConfig.subsistema, fontSize: 7 },
      { text: etapaConfig.atividade, fontSize: 7 },
      { text: etapaConfig.resultadoEsperado, fontSize: 7 },
      { text: texto, fontSize: 7, color: cor, alignment: "center", bold: true },
      medidasCellContent(etapaConfig, etapa, naoAplicavel),
    ];
  });

  return [
    // CABEÇALHO
    { text: "MDE - EQUIPAMENTOS INDUSTRIAIS", bold: true, fontSize: 13, color: AZUL, alignment: "center" },
    { text: `CHECKLIST — ${config.titulo}`, bold: true, fontSize: 10, alignment: "center", margin: [0, 4, 0, 0] as [number, number, number, number] },
    {
      text: `${config.codigo}/${config.versao} — ${config.dataEmissao} — Válido até ${config.validadeAte} — Público`,
      fontSize: 9,
      alignment: "center",
      margin: [0, 2, 0, 0] as [number, number, number, number],
    },
    { text: `Procedimento de origem: ${config.procedimentoOrigem}`, fontSize: 9, alignment: "center" },
    { text: "Contrato de reparacao de componentes: 154/155", fontSize: 9, alignment: "center" },
    { text: "Cliente: MRS LOGISTICA", bold: true, fontSize: 9, alignment: "center", margin: [0, 0, 0, 6] as [number, number, number, number] },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: AZUL }], margin: [0, 0, 0, 4] as [number, number, number, number] },

    // INSPEÇÃO DE TRINCAS E EMPENOS
    sectionTitle("INSPEÇÃO DE TRINCAS E EMPENOS"),
    sectionBox([
      { text: [{ text: "Verificação de Trinca: ", bold: true }, `${checkbox(trinca === "APROVADO")} Aprovado   ${checkbox(trinca === "REPROVADO")} Reprovado`], fontSize: 9, margin: [0, 0, 0, 4] as [number, number, number, number] },
      { text: [{ text: "Verificação de Empenos: ", bold: true }, `${checkbox(empenos === "APROVADO")} Aprovado   ${checkbox(empenos === "REPROVADO")} Reprovado`], fontSize: 9 },
    ]),

    // DADOS ADICIONAIS
    sectionTitle("DADOS ADICIONAIS"),
    sectionBox([
      { columns: [{ width: 160, text: "Data de Fabricação:", bold: true, fontSize: 9 }, { text: dataFabricacao || "—", fontSize: 9 }], margin: [0, 0, 0, 3] as [number, number, number, number] },
      { columns: [{ width: 160, text: "Nº da OP:", bold: true, fontSize: 9 }, { text: numeroOP || "—", fontSize: 9 }], margin: [0, 0, 0, 3] as [number, number, number, number] },
      { columns: [{ width: 160, text: "Nº da Série:", bold: true, fontSize: 9 }, { text: numeroSerie || "—", fontSize: 9 }], margin: [0, 0, 0, 3] as [number, number, number, number] },
      { columns: [{ width: 160, text: "Data da Recuperação:", bold: true, fontSize: 9 }, { text: dataRecuperacao || "—", fontSize: 9 }] },
    ]),

    // MODELO DA LATERAL
    sectionTitle("MODELO DA LATERAL"),
    sectionBox([{ columns: [{ width: 160, text: "Modelo Selecionado:", bold: true, fontSize: 9 }, { text: options.modeloSelecionado || "Não selecionado", fontSize: 9 }] }]),

    // SUBSTITUIÇÃO DE CHAPA
    sectionTitle("HOUVE SUBSTITUIÇÃO DE CHAPA NA COLUNA?"),
    sectionBox([{ text: `${checkbox(perguntasFinais.substituicaoChapaColuna === "SIM")} Sim   ${checkbox(perguntasFinais.substituicaoChapaColuna === "NAO")} Não`, fontSize: 9 }]),
    sectionTitle("HOUVE SUBSTITUIÇÃO DE CHAPA NA GUIA?"),
    sectionBox([{ text: `${checkbox(perguntasFinais.substituicaoChapaGuia === "SIM")} Sim   ${checkbox(perguntasFinais.substituicaoChapaGuia === "NAO")} Não`, fontSize: 9 }]),

    // ETAPAS TÉCNICAS
    sectionTitle("ETAPAS TÉCNICAS", "before"),
    {
      table: {
        headerRows: 1,
        widths: [22, 42, 55, "*", "*", 58, 68],
        body: [tabelaHeader, ...tabelaRows],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => CINZA_BORDA,
        vLineColor: () => CINZA_BORDA,
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    },

    // ASSINATURAS
    sectionTitle("ASSINATURAS"),
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "Executante", bold: true, fontSize: 9, alignment: "center" },
            { canvas: [{ type: "line", x1: 0, y1: 6, x2: 150, y2: 6, lineWidth: 0.5 }] },
            { text: `Nome: ${assinaturas.executante?.nome || "_______________"}`, fontSize: 8, alignment: "center", margin: [0, 4, 0, 0] as [number, number, number, number] },
            { text: `Matrícula: ${assinaturas.executante?.matricula || "_______"}`, fontSize: 8, alignment: "center" },
          ],
        },
        {
          width: "*",
          stack: [
            { text: "Líder", bold: true, fontSize: 9, alignment: "center" },
            { canvas: [{ type: "line", x1: 0, y1: 6, x2: 150, y2: 6, lineWidth: 0.5 }] },
            { text: `Nome: ${assinaturas.liderMRS?.nome || "_______________"}`, fontSize: 8, alignment: "center", margin: [0, 4, 0, 0] as [number, number, number, number] },
            { text: `Matrícula: ${assinaturas.liderMRS?.matricula || "_______"}`, fontSize: 8, alignment: "center" },
          ],
        },
        {
          width: "*",
          stack: [
            { text: "Inspetor Técnico", bold: true, fontSize: 9, alignment: "center" },
            { canvas: [{ type: "line", x1: 0, y1: 6, x2: 150, y2: 6, lineWidth: 0.5 }] },
            { text: `Nome: ${assinaturas.inspectorTecnico?.nome || "_______________"}`, fontSize: 8, alignment: "center", margin: [0, 4, 0, 0] as [number, number, number, number] },
            { text: `Matrícula: ${assinaturas.inspectorTecnico?.matricula || "_______"}`, fontSize: 8, alignment: "center" },
          ],
        },
      ],
      margin: [0, 6, 0, 0] as [number, number, number, number],
    },
  ];
}

export function buildChecklistPdfDocDefinition(options: ChecklistPdfContentOptions) {
  return {
    pageSize: "A4" as const,
    pageMargins: [30, 30, 30, 40] as [number, number, number, number],
    defaultStyle: { font: "DejaVu", fontSize: 9 },
    styles: {
      th: { bold: true, fontSize: 8, color: "white", fillColor: AZUL },
    },
    content: buildChecklistPdfContent(options),
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} — Página ${currentPage} de ${pageCount}`,
          fontSize: 7,
          color: "#666666",
          alignment: "center",
        },
      ],
      margin: [0, 0, 0, 0] as [number, number, number, number],
    }),
  };
}
