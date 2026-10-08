import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useChecklist } from "@/lib/checklist-context";
import { useReports, getOrCreateDeviceId } from "@/lib/reports-context";
import { useState, useMemo, useRef } from "react";
import { ChecklistType, getChecklistConfig } from "@/lib/checklist-configs";
import * as Sharing from "expo-sharing";
import { CompletedChecklistRecord } from "@/lib/reports-types";
import { useSignatures } from "@/lib/signatures-context";
import { useAdminConfig } from "@/lib/admin-config-context";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { resolveLocalPdfPath } from "@/lib/pdf-local-cache";
import { alertar } from "@/lib/alert";
import { comTimeout } from "@/lib/retry";

// Tempo máximo esperando o servidor responder antes de desistir e tratar
// como "ficou pendente" - sem isso, numa rede ruim ou com o servidor
// demorando pra acordar (Render em plano gratuito), a tela ficava sem
// nenhuma mensagem (nem sucesso, nem "aguardando") por tempo indefinido,
// parecendo travada.
const TIMEOUT_GERAR_PDF_MS = 20000;


export default function CompletionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { checklist } = useChecklist();
  const { emails } = useSignatures();
  const adminConfig = useAdminConfig();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [generatedPDFPath, setGeneratedPDFPath] = useState<string | null>(null);
  // Banner colorido e fixo na tela (em vez de um alerta que passa rápido) -
  // "sucesso" (verde) confirma que o PDF já está sendo gerado/salvo na
  // nuvem; "aguardando" (amarelo) avisa que vai ser gerado assim que a
  // internet voltar, pro executante ficar tranquilo em qualquer um dos casos.
  const [statusBanner, setStatusBanner] = useState<{ tipo: "sucesso" | "aguardando"; mensagem: string } | null>(
    null
  );

  const sendEmailMutation = trpc.email.sendChecklistReport.useMutation({
    onError: () => {
      // Silenciar erros de validação de entrada (SMTP não configurado)
      // O usuário verá um Alert.alert() em vez disso
    },
  });

  // Gera o PDF inteiro no servidor (independente da plataforma do
  // dispositivo) e já sobe direto pro Supabase Storage + tabela de
  // checklists — é isso que garante que qualquer outro aparelho/PC consiga
  // baixar o checklist depois, mesmo que este dispositivo fique offline
  // logo em seguida.
  const generatePdfMutation = trpc.checklist.generateAndUploadPDF.useMutation();

  // Recarregar configuracoes quando a tela for aberta
  useEffect(() => {
    const loadConfigs = async () => {
      if (adminConfig.loadConfig) {
        await adminConfig.loadConfig();
      }
    };
    loadConfigs();
  }, []);

  if (!checklist) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <Text className="text-foreground text-center">Carregando...</Text>
      </ScreenContainer>
    );
  }

  const checklistType = (checklist as any).checklistType as ChecklistType;
  const checklistConfig = getChecklistConfig(checklistType);

  // Contar resultados das etapas
  const countResults = () => {
    let ok = 0;
    let naoOk = 0;
    let naoAplicavel = 0;

    checklist.etapas.forEach((etapa) => {
      if (etapa.resultado === "OK") ok++;
      else if (etapa.resultado === "NAO_OK") naoOk++;
      else if (etapa.resultado === "NAO_APLICAVEL") naoAplicavel++;
    });

    return { ok, naoOk, naoAplicavel };
  };

  // Memoizar results para evitar loop infinito no useEffect
  const results = useMemo(() => countResults(), [checklist.etapas]);
  const totalEtapas = checklist.etapas.length;

  const { addCompletedChecklistLocalOnly, confirmChecklistPdf, queuePdfGeneration, removePendingPdfItem } = useReports();
  const hasBeenSaved = useRef(false);

  // Nota: Salvamento foi movido para handleGerarPDF para evitar contabilização prematura
  // Checklist só será salvo quando usuário clicar em "Gerar PDF" ou "Finalizar"

  const handleGerarPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setStatusBanner(null);

      const deviceId = await getOrCreateDeviceId();
      const dataRecuperacao =
        checklist.dadosIniciais?.dataRecuperacao || new Date().toLocaleDateString("pt-BR");

      const input = {
        checklistType,
        numeroSerie: checklist.dadosIniciais?.numeroSerie || "",
        numeroOP: checklist.dadosIniciais?.numeroOP || "",
        dataFabricacao: checklist.dadosIniciais?.dataFabricacao || "",
        dataRecuperacao,
        modeloSelecionado: checklist.modeloSelecionado,
        verificacoesIniciais: checklist.verificacoesIniciais,
        inspetorPM: checklist.inspetorPM,
        perguntasFinais: checklist.perguntasFinais,
        etapas: checklist.etapas.map((e) => ({ resultado: e.resultado, medidas: e.medidas })),
        assinaturas: checklist.assinaturas,
        categoria: checklistConfig.categoria,
        resultadoGeral: results.naoOk > 0 ? "NAO_OK" : results.ok > 0 ? "OK" : "NAO_APLICAVEL",
        deviceId,
        // Chave de idempotência: garante que o servidor nunca crie uma linha
        // duplicada pra esse checklist, mesmo que essa mutation seja chamada
        // mais de uma vez (double-tap, retry automático depois de uma
        // resposta perdida por internet instável, etc.).
        clientChecklistId: checklist.id,
      };

      // 1. Contabiliza o checklist JÁ, localmente - não pode depender da
      // internet pra "existir". Isso resolve não contar um checklist feito
      // numa hora sem sinal (comum em fábrica com rede instável).
      if (!hasBeenSaved.current) {
        const record: CompletedChecklistRecord = {
          id: checklist.id,
          checklistCode: checklistConfig.codigo,
          checklistName: checklistConfig.titulo,
          categoria: checklistConfig.categoria,
          modelo: checklist.modeloSelecionado || "",
          resultado: results.naoOk > 0 ? "NÃO OK" : results.ok > 0 ? "OK" : "NÃO APLICÁVEL",
          executanteName: checklist.assinaturas?.executante?.nome || "",
          executanteMatricula: checklist.assinaturas?.executante?.matricula || "",
          dataRecuperacao,
          dataFabricacao: checklist.dadosIniciais?.dataFabricacao || "",
          numeroSerie: checklist.dadosIniciais?.numeroSerie || "",
          numeroOP: checklist.dadosIniciais?.numeroOP || "",
          timestamp: checklist.timestamp,
          pdfFileName: "",
        };
        await addCompletedChecklistLocalOnly(record);
        hasBeenSaved.current = true;

        // Enfileira a geração do PDF ANTES de tentar - não só se a tentativa
        // abaixo falhar. Se isso só acontecesse dentro do catch (como era
        // antes) e o app fechasse (aba trocada, tablet apagou a tela,
        // bateria acabou etc.) bem no meio da tentativa de rede - depois do
        // checklist já ter sido contabilizado localmente, mas antes do catch
        // rodar - os dados completos do checklist (etapas, medidas,
        // assinaturas) nunca chegavam a ser guardados em lugar nenhum. Esse
        // checklist ficava "pendente" pra sempre sem que nenhuma tentativa de
        // sincronização automática conseguisse recuperá-lo, porque não havia
        // mais nada pra reenviar. Enfileirando aqui, antes da tentativa, esse
        // checklist sempre tem como ser gerado de novo depois, não importa em
        // que momento o app for fechado.
        await queuePdfGeneration(checklist.id, input);
      }

      // 2. Tenta gerar o PDF de verdade agora (o servidor gera o PDF e já
      // salva a linha completa no Supabase).
      try {
        const result = await comTimeout(
          generatePdfMutation.mutateAsync(input),
          TIMEOUT_GERAR_PDF_MS,
          "Tempo esgotado esperando resposta do servidor"
        );

        if (!result.success || !result.pdfUrl) {
          throw new Error(result.message || "Falha ao gerar o PDF no servidor");
        }

        const pdfUrl = result.pdfUrl;
        console.log("[DEBUG] ✓ PDF gerado e salvo no Supabase:", pdfUrl);
        await confirmChecklistPdf(checklist.id, { id: result.id ?? checklist.id, pdfUrl });
        // Já deu certo na tentativa direta - não precisa mais da entrada que
        // foi enfileirada como precaução acima.
        await removePendingPdfItem(checklist.id);
        setStatusBanner({
          tipo: "sucesso",
          mensagem: "✅ PDF gerado com sucesso! Já está salvo na nuvem e disponível em Histórico.",
        });

        // Baixa uma cópia local só para permitir compartilhar/visualizar na
        // hora (o servidor já é a fonte de verdade — isso é só conveniência).
        const localPath = await resolveLocalPdfPath(pdfUrl);
        setGeneratedPDFPath(localPath);

        if (localPath && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(localPath, {
            mimeType: "application/pdf",
            dialogTitle: "Compartilhar Checklist PDF",
          });
        }
      } catch (pdfError) {
        // Não é um erro fatal: o checklist já foi contabilizado no passo 1,
        // e a geração do PDF já está enfileirada desde antes dessa tentativa
        // (acima) - vai ser tentada de novo automaticamente. Mostra o motivo
        // real do erro na mensagem - antes era sempre o mesmo texto de "sem
        // internet", mesmo quando o problema era outro (ex: um erro de
        // verdade no servidor), o que escondia que aquilo ia continuar
        // falhando pra sempre em vez de ser resolvido sozinho ao reconectar.
        console.warn("Falha ao gerar PDF agora, ficará pendente:", pdfError);
        const motivo = pdfError instanceof Error ? pdfError.message : "erro desconhecido";
        setStatusBanner({
          tipo: "aguardando",
          mensagem: `⏳ Checklist salvo! Não foi possível gerar o PDF agora (${motivo}). Será tentado de novo automaticamente assim que possível - confira em Histórico depois.`,
        });
      }

      setIsGeneratingPDF(false);
    } catch (error) {
      console.error("Erro ao finalizar checklist:", error);
      alertar("Erro", `Não foi possível finalizar o checklist: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      setIsGeneratingPDF(false);
    }
  };

  const handleCompartilharPDF = async () => {
    if (!generatedPDFPath) {
      alertar("Aviso", "Gere o PDF primeiro clicando em 'Gerar PDF'.");
      return;
    }

    try {
      // Compartilhar PDF usando o sistema nativo do dispositivo
      await Sharing.shareAsync(generatedPDFPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Checklist',
      });
    } catch (error) {
      console.error("Erro ao compartilhar PDF:", error);
      alertar("Erro", "Não foi possível compartilhar o PDF. Tente novamente.");
    }
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Título */}
          <View className="items-center gap-2">
            <Text className="text-3xl font-bold text-foreground">Checklist Concluído</Text>
            <Text className="text-base text-muted text-center">
              {checklistConfig.titulo}
            </Text>
          </View>

          {/* Banner de status - fica na tela (não é um alerta que passa
          rápido), verde quando o PDF já foi gerado com sucesso, amarelo
          quando ficou aguardando internet pra gerar sozinho depois. */}
          {statusBanner && (
            <View
              className={`rounded-lg p-4 border ${
                statusBanner.tipo === "sucesso"
                  ? "bg-success/10 border-success"
                  : "bg-warning/10 border-warning"
              }`}
            >
              <Text
                className={`text-base font-semibold text-center ${
                  statusBanner.tipo === "sucesso" ? "text-success" : "text-warning"
                }`}
              >
                {statusBanner.mensagem}
              </Text>
            </View>
          )}

          {/* Botões de Ação */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleGerarPDF}
              disabled={isGeneratingPDF}
              className={`py-4 px-4 rounded-lg items-center ${
                isGeneratingPDF ? "bg-primary/50" : "bg-primary"
              }`}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-background font-semibold text-base">📄 Gerar PDF</Text>
              )}
            </TouchableOpacity>

            {generatedPDFPath && (
              <TouchableOpacity
                onPress={handleCompartilharPDF}
                className="py-4 px-4 rounded-lg items-center bg-primary"
              >
                <Text className="text-background font-semibold text-base">📧 Compartilhar PDF</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.replace('/')}
              className="py-3 px-4 rounded-lg items-center bg-surface border border-border"
            >
              <Text className="text-foreground font-semibold text-base">✨ Novo Checklist</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
