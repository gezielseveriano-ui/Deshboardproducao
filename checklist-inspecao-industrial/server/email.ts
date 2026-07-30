import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

/**
 * Configuração do transporte de email
 * Suporta Outlook (Office365) e outros SMTP
 * Variáveis de ambiente esperadas:
 * - SMTP_HOST: smtp.office365.com (para Outlook)
 * - SMTP_PORT: 587 (para Outlook)
 * - SMTP_USER: caldeiraria@mde.ind.br
 * - SMTP_PASS: senha do email
 * - SMTP_SECURE: false (para Outlook com TLS)
 */
const getTransporter = () => {
  // Se as variáveis de ambiente não estão configuradas, retorna null
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    console.warn("[Email] SMTP not configured. Email sending disabled.");
    console.warn("[Email] Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true" || false, // false para TLS (Outlook)
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
};

export interface SendEmailOptions {
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

/**
 * Envia um email com os dados fornecidos
 * @param options Opções de envio de email
 * @returns true se enviado com sucesso, false caso contrário
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter();

    if (!transporter) {
      console.warn("[Email] Cannot send email: SMTP not configured");
      console.warn("[Email] Please configure Outlook credentials in environment variables");
      return false;
    }

    // Usar email configurado ou padrão
    const from = process.env.SMTP_USER || process.env.SMTP_FROM || "caldeiraria@mde.ind.br";

    const result = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    console.log("[Email] Email sent successfully:", result.messageId);
    console.log("[Email] Recipients:", options.to);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
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
