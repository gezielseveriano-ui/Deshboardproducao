import * as MailComposer from "expo-mail-composer";
import { Platform } from "react-native";

/**
 * Interface para opções de envio de email via Gmail
 */
export interface SendGmailOptions {
  recipients: string[];
  subject: string;
  body: string;
  attachments?: string[];
}

/**
 * Verifica se o dispositivo suporta envio de emails
 */
export async function isMailAvailable(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  return await MailComposer.isAvailableAsync();
}

/**
 * Envia um email usando a conta de Gmail do celular
 * Abre o aplicativo de email nativo do dispositivo
 *
 * @param options Opções de envio do email
 * @returns true se o email foi enviado, false caso contrário
 */
export async function sendEmailViaGmail(
  options: SendGmailOptions
): Promise<boolean> {
  try {
    // Verifica se o dispositivo suporta envio de emails
    const available = await isMailAvailable();
    if (!available) {
      console.warn("[Gmail] Email not available on this device");
      return false;
    }

    // Prepara as opções de composição do email
    const mailOptions: MailComposer.MailComposerOptions = {
      recipients: options.recipients,
      subject: options.subject,
      body: options.body,
      isHtml: true,
      attachments: options.attachments || [],
    };

    // Abre o compositor de email
    const result = await MailComposer.composeAsync(mailOptions);

    // Verifica se o email foi enviado (result.status === 'sent')
    if (result.status === "sent") {
      console.log("[Gmail] Email sent successfully");
      return true;
    } else if (result.status === "saved") {
      console.log("[Gmail] Email saved as draft");
      return false;
    } else {
      console.log("[Gmail] Email cancelled by user");
      return false;
    }
  } catch (error) {
    console.error("[Gmail] Failed to send email:", error);
    return false;
  }
}

/**
 * Gera HTML para email de relatório de checklist
 */
export function generateChecklistEmailHTML(data: {
  checklistName: string;
  modelo: string;
  resultado: string;
  executante: string;
  dataRecuperacao: string;
  totalEtapas: number;
  etapasOK: number;
  etapasNaoOK: number;
  etapasNaoAplicavel: number;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .header {
            background-color: #0a7ea4;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .content {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .section {
            margin-bottom: 15px;
          }
          .label {
            font-weight: bold;
            color: #0a7ea4;
          }
          .resultado {
            padding: 10px;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 10px;
          }
          .resultado.ok {
            background-color: #d4edda;
            color: #155724;
          }
          .resultado.nao-ok {
            background-color: #f8d7da;
            color: #721c24;
          }
          .resultado.nao-aplicavel {
            background-color: #e2e3e5;
            color: #383d41;
          }
          .stats {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
          }
          .stat-box {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #0a7ea4;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Relatório de Checklist</h1>
            <p>MRS - Manutenção de Vagões</p>
          </div>

          <div class="content">
            <div class="section">
              <span class="label">Checklist:</span>
              <p>${data.checklistName}</p>
            </div>

            <div class="section">
              <span class="label">Modelo:</span>
              <p>${data.modelo}</p>
            </div>

            <div class="section">
              <span class="label">Executante:</span>
              <p>${data.executante}</p>
            </div>

            <div class="section">
              <span class="label">Data da Recuperação:</span>
              <p>${data.dataRecuperacao}</p>
            </div>

            <div class="section">
              <span class="label">Resultado:</span>
              <div class="resultado ${
                data.resultado === "OK"
                  ? "ok"
                  : data.resultado === "NÃO OK"
                    ? "nao-ok"
                    : "nao-aplicavel"
              }">
                ${data.resultado}
              </div>
            </div>

            <div class="section">
              <span class="label">Estatísticas:</span>
              <div class="stats">
                <div class="stat-box">
                  <div class="stat-number">${data.etapasOK}</div>
                  <div class="stat-label">OK</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.etapasNaoOK}</div>
                  <div class="stat-label">NÃO OK</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.etapasNaoAplicavel}</div>
                  <div class="stat-label">NÃO APLICÁVEL</div>
                </div>
              </div>
              <p style="margin-top: 10px; font-size: 12px; color: #666;">
                Total de etapas: ${data.totalEtapas}
              </p>
            </div>
          </div>

          <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
            <p>© 2026 MRS - Manutenção de Vagões. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
