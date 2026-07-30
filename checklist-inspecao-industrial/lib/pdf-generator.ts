import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Checklist } from "./types";
import { getChecklistConfig, ChecklistType } from "./checklist-configs";



interface PDFGeneratorOptions {
  checklist: Checklist;
  checklistType: ChecklistType;
  dataFabricacao: string;
  dataRecuperacao: string;
  numeroOP: string;
  numeroSerie: string;
  assinaturas?: {
    executante?: string;
    liderMRS?: string;
    inspectorTecnico?: string;
  };
}



function generatePDFHTML(options: PDFGeneratorOptions): string {
  const { checklist, checklistType, dataFabricacao, dataRecuperacao, numeroOP, numeroSerie } = options;
  const config = getChecklistConfig(checklistType);

  // Gerar linhas da tabela
  let tabelaHTML = "";
  config.etapas.forEach((etapaConfig, index) => {
    const etapa = checklist.etapas[index];
    const resultado = etapa?.resultado || "";
    // Formatar resultado com quebra de linha para economizar espaço
    let resultadoMarcado = "—";
    let resultadoHTML = "—";
    if (resultado === "OK") {
      resultadoMarcado = "✓ OK";
      resultadoHTML = "✓<br/>OK";
    } else if (resultado === "NAO_OK") {
      resultadoMarcado = "✗ NÃO OK";
      resultadoHTML = "✗<br/>NÃO<br/>OK";
    } else if (resultado === "NAO_APLICAVEL") {
      resultadoMarcado = "— N/A";
      resultadoHTML = "—<br/>N/A";
    } else {
      resultadoHTML = "—";
    }

    // Extrair medidas corretamente com tabela de células divididas
    let medidas = "—";
    
    // Se a etapa não tem campos de medida configurados, mostrar "Não Aplicável"
    if (etapaConfig.medidas.length === 0) {
      medidas = "Não Aplicável";
    } else if (etapa?.medidas && Array.isArray(etapa.medidas)) {
      const medidasComValor = etapa.medidas.filter((med) => med);
      
      if (medidasComValor.length > 0) {
        // Criar tabela com células divididas
        let tabelaMedidas = '<table style="width: 100%; border-collapse: collapse; margin: 0;">';
        
        // Determinar número de colunas (máximo 2 para layout 2x2)
        const numColunas = Math.min(medidasComValor.length, 2);
        const numLinhas = Math.ceil(medidasComValor.length / numColunas);
        
        let indice = 0;
        for (let linha = 0; linha < numLinhas; linha++) {
          tabelaMedidas += '<tr>';
          for (let col = 0; col < numColunas; col++) {
            if (indice < medidasComValor.length) {
              const med = medidasComValor[indice];
              const valor = med.valor || "";
              const unidade = med.unidade || "";
              const label = etapaConfig.medidas[indice]?.label || `Medida ${indice + 1}`;
              
              tabelaMedidas += `
                <td style="border: 1px solid #ddd; padding: 2px; text-align: center; font-size: 7px; width: ${100/numColunas}%;">
                  <div style="font-weight: bold; margin-bottom: 1px;">${label}</div>
                  <div style="font-size: 6px;">${valor}${unidade ? ' ' + unidade : ''}</div>
                </td>
              `;
              indice++;
            } else {
              tabelaMedidas += `<td style="border: 1px solid #ddd; padding: 2px; width: ${100/numColunas}%;"></td>`;
            }
          }
          tabelaMedidas += '</tr>';
        }
        
        tabelaMedidas += '</table>';
        medidas = tabelaMedidas;
      }
    }

    tabelaHTML += `
      <tr>
        <td style="padding: 4px; border: 1px solid #ddd; font-size: 9px; text-align: center; width: 5%;">${etapaConfig.numero}</td>
        <td style="padding: 4px; border: 1px solid #ddd; font-size: 8px; width: 8%;">${etapaConfig.sistema}</td>
        <td style="padding: 4px; border: 1px solid #ddd; font-size: 8px; width: 8%;">${etapaConfig.subsistema}</td>
        <td style="padding: 4px; border: 1px solid #ddd; font-size: 8px; width: 25%;">${etapaConfig.atividade}</td>
        <td style="padding: 4px; border: 1px solid #ddd; font-size: 8px; width: 25%;">${etapaConfig.resultadoEsperado}</td>
        <td style="padding: 4px; border: 1px solid #ddd; font-size: 8px; text-align: center; width: 10%;">${resultadoHTML}</td>
        <td style="padding: 2px; border: 1px solid #ddd; font-size: 8px; width: 19%;">${medidas}</td>
      </tr>
    `;
  });

  // Corrigir verificações: marcar com ☑ ou ☐ conforme selecionado
  // Acessar verificacoesIniciais corretamente
  const trincaAprovadoMarcado = checklist.verificacoesIniciais?.trinca === "APROVADO" ? "☑" : "☐";
  const trincaReprovadoMarcado = checklist.verificacoesIniciais?.trinca === "REPROVADO" ? "☑" : "☐";
  const empenaAprovadoMarcado = checklist.verificacoesIniciais?.empenos === "APROVADO" ? "☑" : "☐";
  const empenaReprovadoMarcado = checklist.verificacoesIniciais?.empenos === "REPROVADO" ? "☑" : "☐";

  const perguntasFinais = (checklist as any).perguntasFinais || {};
  const simColuna = perguntasFinais.substituicaoChapaColuna === "SIM" ? "☑" : "☐";
  const naoColuna = perguntasFinais.substituicaoChapaColuna === "NAO" ? "☑" : "☐";
  const simGuia = perguntasFinais.substituicaoChapaGuia === "SIM" ? "☑" : "☐";
  const naoGuia = perguntasFinais.substituicaoChapaGuia === "NAO" ? "☑" : "☐";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #006699;
            padding-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 14px;
            color: #006699;
          }
          .header p {
            margin: 5px 0;
            font-size: 11px;
          }
          .section {
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .section-title {
            background-color: #006699;
            color: white;
            padding: 8px;
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 10px;
          }
          .section-content {
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 11px;
          }
          .label {
            font-weight: bold;
            width: 40%;
          }
          .value {
            width: 60%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10px;
          }
          table th {
            background-color: #006699;
            color: white;
            padding: 8px;
            text-align: left;
            font-weight: bold;
          }
          table td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .signatures {
            margin-top: 20px;
            display: flex;
            justify-content: space-around;
          }
          .signature-block {
            text-align: center;
            width: 30%;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 30px;
            padding-top: 5px;
            font-size: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          .checkbox {
            margin-right: 5px;
          }
          .verification-row {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 11px;
          }
          .verification-row span {
            margin-right: 15px;
          }
        </style>
      </head>
      <body>
        <!-- CABEÇALHO -->
        <div class="header">
          <h1>MDE - EQUIPAMENTOS INDUSTRIAIS</h1>
          <p><strong>CHECKLIST — ${config.titulo}</strong></p>
          <p>${config.codigo}/${config.versao} — ${config.dataEmissao} — Válido até ${config.validadeAte} — Público</p>
          <p>Procedimento de origem: ${config.procedimentoOrigem}</p>
          <p>Contrato de reparacao de componentes: 154/155</p>
          <p><strong>Cliente: MRS LOGISTICA</strong></p>
        </div>

        <!-- INSPEÇÃO DE TRINCAS E EMPENOS -->
        <div class="section">
          <div class="section-title">INSPEÇÃO DE TRINCAS E EMPENOS</div>
          <div class="section-content">
            <div class="verification-row">
              <span><strong>Verificação de Trinca:</strong></span>
              <span>${trincaAprovadoMarcado} Aprovado</span>
              <span>${trincaReprovadoMarcado} Reprovado</span>
            </div>
            <div class="verification-row">
              <span><strong>Verificação de Empenos:</strong></span>
              <span>${empenaAprovadoMarcado} Aprovado</span>
              <span>${empenaReprovadoMarcado} Reprovado</span>
            </div>
          </div>
        </div>

        <!-- DADOS ADICIONAIS -->
        <div class="section">
          <div class="section-title">DADOS ADICIONAIS</div>
          <div class="section-content">
            <div class="row">
              <span class="label">Data de Fabricação:</span>
              <span class="value"><strong>${dataFabricacao}</strong> <span style="margin-left: 20px;">☐ N/A</span></span>
            </div>
            <div class="row">
              <span class="label">Nº da OP:</span>
              <span class="value"><strong>${numeroOP}</strong> <span style="margin-left: 20px;">☐ N/A</span></span>
            </div>
            <div class="row">
              <span class="label">Nº da Série:</span>
              <span class="value"><strong>${numeroSerie}</strong> <span style="margin-left: 20px;">☐ N/A</span></span>
            </div>
            <div class="row">
              <span class="label">Data da Recuperação:</span>
              <span class="value"><strong>${dataRecuperacao}</strong></span>
            </div>
          </div>
        </div>

        <!-- MODELO DA LATERAL -->
        <div class="section">
          <div class="section-title">MODELO DA LATERAL</div>
          <div class="section-content">
            <div class="row">
              <span class="label">Modelo Selecionado:</span>
              <span class="value"><strong>${(checklist as any).modeloSelecionado ?? "Não selecionado"}</strong></span>
            </div>
          </div>
        </div>

        <!-- HOUVE SUBSTITUIÇÃO DE CHAPA NA COLUNA? -->
        <div class="section">
          <div class="section-title">HOUVE SUBSTITUIÇÃO DE CHAPA NA COLUNA?</div>
          <div class="section-content">
            <div class="verification-row">
              <span>${simColuna} Sim</span>
              <span style="margin-left: 30px;">${naoColuna} Não</span>
            </div>
          </div>
        </div>

        <!-- HOUVE SUBSTITUIÇÃO DE CHAPA NA GUIA? -->
        <div class="section">
          <div class="section-title">HOUVE SUBSTITUIÇÃO DE CHAPA NA GUIA?</div>
          <div class="section-content">
            <div class="verification-row">
              <span>${simGuia} Sim</span>
              <span style="margin-left: 30px;">${naoGuia} Não</span>
            </div>
          </div>
        </div>

        <!-- ETAPAS TÉCNICAS -->
        <div class="section" style="page-break-before: always;">
          <div class="section-title">ETAPAS TÉCNICAS</div>
          <table>
            <thead>
              <tr>
                <th>ETAPA</th>
                <th>SISTEMA</th>
                <th>SUBSISTEMA</th>
                <th>ATIVIDADE</th>
                <th>RESULTADO ESPERADO</th>
                <th>RESULTADO</th>
                <th>MEDIDAS</th>
              </tr>
            </thead>
            <tbody>
              ${tabelaHTML}
            </tbody>
          </table>
        </div>

        <!-- ASSINATURAS (DEPOIS DAS ETAPAS) -->
        <div class="section" style="margin-top: 10px;">
          <div class="section-title">ASSINATURAS</div>
          <div class="signatures">
            <div class="signature-block">
              <div class="signature-line">
                <strong>Executante</strong><br>
                Assinatura: ${(checklist.assinaturas?.executante?.nome ?? "_______________")}<br>
                Matrícula: ${(checklist.assinaturas?.executante?.matricula ?? "_______")}
              </div>
            </div>
            <div class="signature-block">
              <div class="signature-line">
                <strong>Líder</strong><br>
                Assinatura: ${(checklist.assinaturas?.liderMRS?.nome ?? "_______________")}<br>
                Matrícula: ${(checklist.assinaturas?.liderMRS?.matricula ?? "_______")}
              </div>
            </div>
            <div class="signature-block">
              <div class="signature-line">
                <strong>Inspetor Técnico</strong><br>
                Assinatura: ${(checklist.assinaturas?.inspectorTecnico?.nome ?? "_______________")}<br>
                Matrícula: ${(checklist.assinaturas?.inspectorTecnico?.matricula ?? "_______")}
              </div>
            </div>
          </div>
        </div>

        <!-- RODAPÉ -->
        <div class="footer">
          <p>Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
          <p>MRS Checklist & Produção - Sistema de Controle de Qualidade</p>
        </div>
      </body>
    </html>
  `;

  return html;
}

export async function generateChecklistPDF(options: PDFGeneratorOptions): Promise<string> {
  try {
    const html = generatePDFHTML(options);

    // Gerar PDF usando expo-print
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Mover arquivo para DocumentDirectory (espaço persistente)
    try {
      const customFileName = generatePDFFileName(options.numeroSerie, options.dataRecuperacao);
      const documentDir = FileSystem.documentDirectory || "";
      
      // Criar subdiretório para checklists se não existir
      const checklistsDir = `${documentDir}checklists/`;
      try {
        await FileSystem.makeDirectoryAsync(checklistsDir, { intermediates: true });
      } catch (mkdirError) {
        // Diretório já existe, continuar
      }
      
      const newUri = `${checklistsDir}${customFileName}`;
      
      // Mover arquivo para DocumentDirectory
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });
      
      console.log(`[PDF] Salvo em DocumentDirectory: ${newUri}`);
      return newUri;
    } catch (moveError) {
      console.warn("Erro ao mover PDF para DocumentDirectory, usando local temporário:", moveError);
      // Fallback: usar arquivo temporário se falhar
      try {
        const customFileName = generatePDFFileName(options.numeroSerie, options.dataRecuperacao);
        const directory = uri.substring(0, uri.lastIndexOf("/"));
        const newUri = `${directory}/${customFileName}`;
        
        await FileSystem.moveAsync({
          from: uri,
          to: newUri,
        });
        
        return newUri;
      } catch (fallbackError) {
        console.warn("Erro ao renomear PDF, usando nome original:", fallbackError);
        return uri;
      }
    }
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
}

/**
 * Gera um nome de arquivo customizado baseado no Nº da Série e Data da Recuperação
 * Formato: {numeroSerie}-{dataRecuperacao}.pdf
 * Exemplo: 456-02022026.pdf
 */
export function generatePDFFileName(numeroSerie: string, dataRecuperacao: string): string {
  // Remover tracos da data (DD/MM/YYYY -> DDMMYYYY)
  const dataSemTracos = dataRecuperacao.replace(/\//g, "");
  return `${numeroSerie}-${dataSemTracos}.pdf`;
}

/**
 * Converter PDF para base64
 */
export async function pdfToBase64(pdfUri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error("Erro ao converter PDF para base64:", error);
    throw error;
  }
}
