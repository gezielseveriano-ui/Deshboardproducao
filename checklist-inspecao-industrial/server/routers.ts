import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { sendEmail, generateChecklistEmailHTML } from "./email";
import { saveCompletedChecklist, getDashboardStats, getChecklistsForUser, updateChecklistSyncStatus, logSync, getPendingSyncs } from "./db";
import nodemailer from "nodemailer";

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
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await saveCompletedChecklist(input);
          return {
            success: true,
            message: "Checklist salvo com sucesso",
            data: result,
          };
        } catch (error) {
          console.error("[Checklist Router] Erro ao salvar checklist:", error);
          return {
            success: false,
            message: `Erro ao salvar checklist: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
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

    // Sincronização
    getChecklistsForSync: protectedProcedure.query(async ({ ctx }) => {
      try {
        const checklists = await getChecklistsForUser(ctx.user.id);
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

    updateSyncStatus: protectedProcedure
      .input(
        z.object({
          checklistId: z.number(),
          syncStatus: z.enum(["pending", "synced", "failed"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          await updateChecklistSyncStatus(input.checklistId, input.syncStatus);
          await logSync({
            userId: ctx.user.id,
            deviceId: "web",
            checklistId: input.checklistId,
            action: "update",
            status: "success",
          } as any);
          return {
            success: true,
            message: "Status de sincronização atualizado",
          };
        } catch (error) {
          console.error("[Checklist Router] Erro ao atualizar sync status:", error);
          return {
            success: false,
            message: `Erro ao atualizar sync status: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
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
