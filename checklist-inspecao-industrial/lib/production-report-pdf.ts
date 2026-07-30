import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import { ModeloResumo, ExecutanteResumoAgrupado } from "./reports-types";

interface ProductionReportData {
  periodo: string;
  dataGeracao: string;
  modeloResumo: ModeloResumo[];
  executanteResumo: ExecutanteResumoAgrupado[];
  totalChecklists: number;
}

/**
 * Gera um PDF de relatório de produção com informações de modelos e estatísticas
 */
export async function generateProductionReportPDF(data: ProductionReportData): Promise<string> {
  try {
    // Gerar HTML do relatório
    const htmlContent = generateReportHTML(data);

    // Gerar PDF usando expo-print
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Copiar arquivo para documentDirectory
    const fileName = `relatorio-producao-${Date.now()}.pdf`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    // Ler arquivo gerado e copiar
    const fileContent = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await FileSystem.writeAsStringAsync(filePath, fileContent, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return filePath;
  } catch (error) {
    console.error("Erro ao gerar PDF de relatorio:", error);
    throw error;
  }
}

/**
 * Gera HTML para o relatório de produção
 */
function generateReportHTML(data: ProductionReportData): string {
  const modeloRows = data.modeloResumo
    .map(
      (item) => `
    <tr>
      <td>${item.modelo}</td>
      <td style="text-align: center; font-weight: bold;">${item.quantidade}</td>
      <td>${item.dataRecuperacao}</td>
    </tr>
  `
    )
    .join("");

  const executanteRows = data.executanteResumo
    .map(
      (item) => `
    <tr>
      <td>${item.executanteName}</td>
      <td>${item.executanteMatricula}</td>
      <td style="text-align: center; font-weight: bold;">${item.quantidadeTotal}</td>
      <td>${item.dataExecucao}</td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            color: #11181c;
            line-height: 1.6;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #0a7ea4;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #0a7ea4;
            font-size: 28px;
            margin-bottom: 5px;
          }
          .header p {
            color: #687076;
            font-size: 14px;
          }
          .info-section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
          }
          .info-section p {
            margin: 5px 0;
            font-size: 12px;
          }
          .section-title {
            color: #0a7ea4;
            font-size: 16px;
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
          }
          table thead {
            background-color: #0a7ea4;
            color: white;
          }
          table th {
            padding: 10px;
            text-align: left;
            font-weight: bold;
          }
          table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          table tbody tr:nth-child(even) {
            background-color: #f5f5f5;
          }
          .summary {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .summary-box {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            border-left: 4px solid #0a7ea4;
          }
          .summary-box .number {
            font-size: 24px;
            font-weight: bold;
            color: #0a7ea4;
          }
          .summary-box .label {
            font-size: 12px;
            color: #687076;
            margin-top: 5px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #687076;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RELATORIO DE PRODUCAO</h1>
          <p>MRS - Manutencao de Vagoes</p>
        </div>

        <div class="info-section">
          <p><strong>Periodo:</strong> ${data.periodo}</p>
          <p><strong>Data de Geracao:</strong> ${data.dataGeracao}</p>
        </div>

        <h2 class="section-title">RESUMO GERAL</h2>
        <div class="summary">
          <div class="summary-box">
            <div class="number">${data.totalChecklists}</div>
            <div class="label">Total de Checklists</div>
          </div>
          <div class="summary-box">
            <div class="number">${data.modeloResumo.length}</div>
            <div class="label">Total de Modelos</div>
          </div>
          <div class="summary-box">
            <div class="number">${data.executanteResumo.length}</div>
            <div class="label">Total de Executantes</div>
          </div>
        </div>

        <h2 class="section-title">RESUMO POR MODELO</h2>
        <table>
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Quantidade</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${modeloRows}
          </tbody>
        </table>

        <h2 class="section-title">RESUMO POR EXECUTANTE</h2>
        <table>
          <thead>
            <tr>
              <th>Executante</th>
              <th>Matricula</th>
              <th>Quantidade</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${executanteRows}
          </tbody>
        </table>

        <div class="footer">
          <p>Este relatorio foi gerado automaticamente pelo sistema de checklists MRS.</p>
          <p>© 2026 MRS - Manutencao de Vagoes. Todos os direitos reservados.</p>
        </div>
      </body>
    </html>
  `;
}
