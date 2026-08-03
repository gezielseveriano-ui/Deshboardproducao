import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { sendEmail, generateChecklistEmailHTML } from "./email";
import { saveCompletedChecklist, getDashboardStats, getChecklistsForUser, updateChecklistSyncStatus, logSync, getPendingSyncs } from "./db";
import nodemailer from "nodemailer";
import { getChecklistConfig } from "../lib/checklist-configs";
import { buildChecklistPdfDocDefinition } from "../shared/checklist-pdf-content";
import { renderPdfBuffer } from "./pdf";
import { getSupabaseAdmin } from "./supabase-admin";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user) as any,
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }) as any,
  }),

  // Checklist router
  checklist: router({
    saveCompleted: publicProcedure
      .input(
        z.object({
          userId: z.number().or(z.string()).transform(v => typeof v === 'string' ? parseInt(v, 10) : v),
          checklistCode: z.string(),
          checklistName: z.string(),
          categoria: z.string(),
          modelo: z.string(),
          resultado: z.enum(["OK", "NAO_OK", "NAO_APLICAVEL"]),
          executanteName: z.string(),
          executanteMatricula: z.string(),
          liderName: z.string().optional(),
          liderMatricula: z.string().optional(),
          inspectorName: z.string().optional(),
          inspectorMatricula: z.string().optional(),
          dataFabricacao: z.string().optional(),
          dataRecuperacao: z.string(),
          numeroOP: z.string().optional(),
          numeroSerie: z.string().optional(),
          totalEtapas: z.number(),
          etapasOK: z.number(),
          etapasNaoOK: z.number(),
          etapasNaoAplicavel: z.number(),
          pdfFileName: z.string().optional(),
          email: z.string().email().optional(),
          deviceId: z.string().optional(),
          syncStatus: z.enum(["pending", "synced", "failed"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          console.log('[Router] saveCompleted recebeu:', {
            categoria: input.categoria,
            checklistCode: input.checklistCode,
            checklistName: input.checklistName,
            userId: input.userId,
            timestamp: new Date().toISOString(),
          });
          
          const result = await saveCompletedChecklist(input);
          console.log('[Router] Checklist salvo com sucesso:', result);
          return {
            success: true,
            message: "Checklist salvo com sucesso",
            data: result,
          };
        } catch (error) {
          console.error('[Router] ERRO ao salvar checklist:', error);
          return {
            success: false,
            message: `Erro ao salvar checklist: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),

    getDashboardStats: publicProcedure
      .input(
        z.object({
          email: z.string().email().optional(),
          dataInicio: z.string().optional(),
          dataFim: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const stats = await getDashboardStats(input.email, input.dataInicio, input.dataFim);
          return {
            success: true,
            data: stats,
          };
        } catch (error) {
          console.error("[Checklist Router] Erro ao recuperar estatísticas:", error);
          return {
            success: false,
            message: `Erro ao recuperar estatísticas: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          };
        }
      }),

    getChecklistsForUser: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
        })
      )
      .query(async ({ input }) => {
        try {
          const checklists = await getChecklistsForUser(input.email);
          return {
            success: true,
            data: checklists,
          };
        } catch (error) {
          console.error("[Checklist Router] Erro ao recuperar checklists:", error);
          return {
            success: false,
            message: `Erro ao recuperar checklists: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          };
        }
      }),

    updateSyncStatus: publicProcedure
      .input(
        z.object({
          checklistId: z.string(),
          syncStatus: z.enum(["pending", "synced", "failed"]),
          syncError: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await updateChecklistSyncStatus(input.checklistId, input.syncStatus, input.syncError);
          return {
            success: true,
            data: result,
          };
        } catch (error) {
          console.error("[Checklist Router] Erro ao atualizar status de sincronização:", error);
          return {
            success: false,
            message: `Erro ao atualizar status: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          };
        }
      }),

    logSync: publicProcedure
      .input(
        z.object({
          checklistId: z.string(),
          deviceId: z.string(),
          syncStatus: z.enum(["pending", "synced", "failed"]),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await logSync(input.checklistId, input.deviceId, input.syncStatus);
          return {
            success: true,
            data: result,
          };
        } catch (error) {
          console.error("[Checklist Router] Erro ao registrar sincronização:", error);
          return {
            success: false,
            message: `Erro ao registrar sincronização: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          };
        }
      }),

    getPendingSyncs: protectedProcedure.query(async ({ ctx }) => {
      try {
        const pendingSyncs = await getPendingSyncs(ctx.user.id);
        return {
          success: true,
          data: pendingSyncs,
        };
      } catch (error) {
        console.error("[Checklist Router] Erro ao recuperar syncs pendentes:", error);
        return {
          success: false,
          message: `Erro ao recuperar syncs pendentes: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        };
      }
    }),

    uploadPDF: publicProcedure
      .input(
        z.object({
          fileName: z.string(),
          pdfBase64: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          console.log("[PDF Upload] Recebido upload de:", input.fileName);
          
          const { createClient } = await import("@supabase/supabase-js");
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON;
          
          if (!supabaseUrl || !supabaseKey) {
            throw new Error("Supabase credentials not configured");
          }
          
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          const buffer = Buffer.from(input.pdfBase64, "base64");
          
          const { data, error } = await supabase.storage
            .from("checklist-pdfs")
            .upload(`pdfs/${input.fileName}`, buffer, {
              contentType: "application/pdf",
              upsert: true,
            });
          
          if (error) {
            console.error("[PDF Upload] Erro ao fazer upload:", error);
            throw error;
          }
          
          console.log("[PDF Upload] Upload concluido:", data);
          
          const { data: publicData } = supabase.storage
            .from("checklist-pdfs")
            .getPublicUrl(`pdfs/${input.fileName}`);
          
          const pdfUrl = publicData?.publicUrl;
          console.log("[PDF Upload] URL publica:", pdfUrl);
          
          return {
            success: true,
            pdfUrl,
          };
        } catch (error) {
          console.error("[PDF Upload] Erro:", error);
          return {
            success: false,
            message: `Erro ao fazer upload de PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          };
        }
      }),

    // Gera o PDF inteiro no servidor (sem depender do expo-print do
    // dispositivo, que só funciona em Android/iOS nativo) e já salva o
    // resultado direto no Supabase Storage + tabela completed_checklists.
    // Isso garante que o checklist fica disponível pra qualquer
    // aparelho/PC assim que o usuário termina de preencher, mesmo que o
    // dispositivo que preencheu não consiga gerar/enviar o arquivo sozinho.
    generateAndUploadPDF: publicProcedure
      .input(
        z.object({
          checklistType: z.string(),
          numeroSerie: z.string().optional().default(""),
          numeroOP: z.string().optional().default(""),
          dataFabricacao: z.string().optional().default(""),
          dataRecuperacao: z.string().optional().default(""),
          modeloSelecionado: z.string().nullable().optional(),
          verificacoesIniciais: z
            .object({
              trinca: z.enum(["APROVADO", "REPROVADO"]).nullable().optional(),
              empenos: z.enum(["APROVADO", "REPROVADO"]).nullable().optional(),
            })
            .optional(),
          inspetorPM: z
            .object({
              nome: z.string().optional(),
              matricula: z.string().optional(),
              numeroRelatorio: z.string().optional(),
            })
            .optional(),
          perguntasFinais: z
            .object({
              substituicaoChapaColuna: z.enum(["SIM", "NAO"]).nullable().optional(),
              substituicaoChapaGuia: z.enum(["SIM", "NAO"]).nullable().optional(),
            })
            .optional(),
          etapas: z.array(
            z.object({
              resultado: z.enum(["OK", "NAO_OK", "NAO_APLICAVEL"]).nullable().optional(),
              medidas: z
                .array(
                  z.object({
                    label: z.string().optional(),
                    valor: z.string().nullable().optional(),
                    unidade: z.string().nullable().optional(),
                  })
                )
                .optional(),
            })
          ),
          assinaturas: z
            .object({
              executante: z.object({ nome: z.string().optional(), matricula: z.string().optional() }).nullable().optional(),
              liderMRS: z.object({ nome: z.string().optional(), matricula: z.string().optional() }).nullable().optional(),
              inspectorTecnico: z.object({ nome: z.string().optional(), matricula: z.string().optional() }).nullable().optional(),
            })
            .optional(),
          categoria: z.string().optional().default("Geral"),
          resultadoGeral: z.string().optional().default("OK"),
          deviceId: z.string().optional().default("desconhecido"),
          // Id gerado no aparelho (checklist.id) - usado como chave de
          // idempotência: evita criar uma linha duplicada se essa mutation
          // for chamada de novo pro mesmo checklist (double-tap no botão,
          // retry automático depois de uma resposta perdida por internet
          // instável em fábrica, etc.).
          clientChecklistId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const supabase = getSupabaseAdmin();
          if (!supabase) {
            return { success: false, message: "Supabase não configurado no servidor (EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)." };
          }

          // Se esse checklist já foi gerado antes de verdade (mesmo
          // clientChecklistId E já com um PDF salvo), reaproveita a linha
          // existente em vez de gerar tudo de novo - isso é o que garante
          // que uma tentativa repetida nunca duplica. Importante: só
          // considera "já feito" se a linha existente TEM pdf_url - uma
          // linha sem PDF (inserida por um caminho diferente, como o de
          // sincronização de metadados) não pode travar esse checklist pra
          // sempre sem nunca gerar o PDF de verdade.
          let idParaAtualizar: string | null = null;
          if (input.clientChecklistId) {
            const { data: existing } = await supabase
              .from("completed_checklists")
              .select("id, pdf_url")
              .eq("client_checklist_id", input.clientChecklistId)
              .maybeSingle();
            if (existing?.pdf_url) {
              return { success: true, pdfUrl: existing.pdf_url, id: existing.id };
            }
            if (existing) {
              idParaAtualizar = existing.id;
            }
          }

          const config = getChecklistConfig(input.checklistType as any);

          const docDefinition = buildChecklistPdfDocDefinition({
            config,
            etapas: input.etapas,
            dataFabricacao: input.dataFabricacao,
            dataRecuperacao: input.dataRecuperacao,
            numeroOP: input.numeroOP,
            numeroSerie: input.numeroSerie,
            modeloSelecionado: input.modeloSelecionado,
            verificacoesIniciais: input.verificacoesIniciais,
            inspetorPM: input.inspetorPM,
            perguntasFinais: input.perguntasFinais,
            assinaturas: input.assinaturas,
          });

          const pdfBuffer = await renderPdfBuffer(docDefinition);

          const dataSemBarras = (input.dataRecuperacao || "sem-data").replace(/\//g, "");
          const fileName = `${input.numeroSerie || "sem-serie"}-${dataSemBarras}-${Date.now()}.pdf`;
          const storagePath = `pdfs/${fileName}`;

          const { error: uploadError } = await supabase.storage.from("checklist-pdfs").upload(storagePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });
          if (uploadError) {
            console.error("[generateAndUploadPDF] Erro no upload:", uploadError);
            return { success: false, message: `Erro ao enviar PDF para o Supabase Storage: ${uploadError.message}` };
          }

          const { data: publicData } = supabase.storage.from("checklist-pdfs").getPublicUrl(storagePath);
          const pdfUrl = publicData?.publicUrl;

          const rowData = {
            device_id: input.deviceId,
            checklist_code: config.codigo,
            checklist_name: config.titulo,
            categoria: input.categoria,
            modelo: input.modeloSelecionado || "Não especificado",
            resultado: input.resultadoGeral,
            executante_name: input.assinaturas?.executante?.nome || "",
            executante_matricula: input.assinaturas?.executante?.matricula || "",
            lider_name: input.assinaturas?.liderMRS?.nome || "",
            lider_matricula: input.assinaturas?.liderMRS?.matricula || "",
            inspector_name: input.assinaturas?.inspectorTecnico?.nome || "",
            inspector_matricula: input.assinaturas?.inspectorTecnico?.matricula || "",
            data_recuperacao: input.dataRecuperacao,
            data_fabricacao: input.dataFabricacao,
            numero_serie: input.numeroSerie,
            numero_op: input.numeroOP,
            resultado_detalhado: { etapas: input.etapas, verificacoesIniciais: input.verificacoesIniciais, inspetorPM: input.inspetorPM, perguntasFinais: input.perguntasFinais },
            signatures: input.assinaturas || {},
            pdf_url: pdfUrl,
            pdf_file_name: fileName,
            sync_status: "synced",
            synced_at: new Date().toISOString(),
            timestamp: Date.now(),
            client_checklist_id: input.clientChecklistId ?? null,
          };

          // Já existia uma linha pra esse checklist (sem PDF, inserida por
          // outro caminho, como o de sincronização de metadados) - atualiza
          // ela com os dados completos e o PDF de verdade, em vez de inserir
          // uma linha nova (que violaria o índice único de
          // client_checklist_id).
          if (idParaAtualizar) {
            const { data: updatedRow, error: updateError } = await supabase
              .from("completed_checklists")
              .update(rowData)
              .eq("id", idParaAtualizar)
              .select()
              .single();
            if (updateError) {
              console.error("[generateAndUploadPDF] Erro ao atualizar linha existente:", updateError);
              return { success: true, pdfUrl, id: idParaAtualizar, message: `PDF salvo, mas houve erro ao atualizar o registro no banco: ${updateError.message}` };
            }
            return { success: true, pdfUrl, id: updatedRow?.id ?? idParaAtualizar };
          }

          const { data: row, error: insertError } = await supabase
            .from("completed_checklists")
            .insert([rowData])
            .select()
            .single();

          if (insertError) {
            // Violação do índice único de client_checklist_id: outra tentativa
            // pro mesmo checklist inseriu a linha entre o check inicial e
            // esse insert (corrida). Atualiza essa linha com o PDF que
            // acabamos de gerar, em vez de só devolver o que já tinha lá
            // (que pode estar sem PDF ainda, se a outra tentativa também
            // ainda não tiver terminado).
            if (insertError.code === "23505" && input.clientChecklistId) {
              const { data: existing } = await supabase
                .from("completed_checklists")
                .select("id, pdf_url")
                .eq("client_checklist_id", input.clientChecklistId)
                .maybeSingle();
              if (existing?.pdf_url) {
                return { success: true, pdfUrl: existing.pdf_url, id: existing.id };
              }
              if (existing) {
                const { data: updatedRow } = await supabase
                  .from("completed_checklists")
                  .update(rowData)
                  .eq("id", existing.id)
                  .select()
                  .single();
                return { success: true, pdfUrl, id: updatedRow?.id ?? existing.id };
              }
            }
            console.error("[generateAndUploadPDF] Erro ao salvar linha:", insertError);
            // O PDF já subiu com sucesso; devolve a URL mesmo que o registro na tabela falhe.
            return { success: true, pdfUrl, id: null, message: `PDF salvo, mas houve erro ao registrar no banco: ${insertError.message}` };
          }

          return { success: true, pdfUrl, id: row?.id ?? null };
        } catch (error) {
          console.error("[generateAndUploadPDF] Erro:", error);
          return {
            success: false,
            message: `Erro ao gerar/enviar PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          };
        }
      }),
  }),

  // Email router
  email: router({
    sendChecklistReport: publicProcedure
      .input(
        z.object({
          to: z.array(z.string().email()).min(1),
          checklistName: z.string(),
          modelo: z.string(),
          resultado: z.string(),
          executante: z.string(),
          dataRecuperacao: z.string(),
          totalEtapas: z.number(),
          etapasOK: z.number(),
          etapasNaoOK: z.number(),
          etapasNaoAplicavel: z.number(),
          pdfBuffer: z.string().optional(),
          pdfFileName: z.string().optional(),
          // Configuracao SMTP do app
          smtpEmail: z.string().email(),
          smtpServidor: z.string(),
          smtpPorta: z.string(),
          smtpSenha: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          
          // Criar transporter com configuracao do app
          const transporter = nodemailer.createTransport({
            host: input.smtpServidor,
            port: parseInt(input.smtpPorta),
            secure: input.smtpPorta === "465", // true para 465, false para 587
            auth: {
              user: input.smtpEmail,
              pass: input.smtpSenha,
            },
          });
          
          const htmlContent = generateChecklistEmailHTML({
            checklistName: input.checklistName,
            modelo: input.modelo,
            resultado: input.resultado,
            executante: input.executante,
            dataRecuperacao: input.dataRecuperacao,
            totalEtapas: input.totalEtapas,
            etapasOK: input.etapasOK,
            etapasNaoOK: input.etapasNaoOK,
            etapasNaoAplicavel: input.etapasNaoAplicavel,
          });

          const attachments = input.pdfBuffer
            ? [
                {
                  filename: input.pdfFileName || `checklist-${Date.now()}.pdf`,
                  content: Buffer.from(input.pdfBuffer, "base64"),
                  contentType: "application/pdf",
                },
              ]
            : undefined;

          const result = await transporter.sendMail({
            from: input.smtpEmail,
            to: input.to,
            subject: `Relatorio de Checklist - ${input.checklistName}`,
            html: htmlContent,
            attachments,
          });
          
          console.log("[Email] Email enviado com sucesso:", result.messageId);

          return {
            success: true,
            message: "Email enviado com sucesso",
          };
        } catch (error) {
          console.error("[Email Router] Erro ao enviar email:", error);
          return {
            success: false,
            message: `Falha ao enviar email: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
