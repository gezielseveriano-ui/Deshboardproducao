import { Alert, ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useChecklist } from "@/lib/checklist-context";
import { useReports } from "@/lib/reports-context";
import { useState, useMemo, useRef } from "react";
import { generateChecklistPDF } from "@/lib/pdf-generator";
import { ChecklistType } from "@/lib/checklist-configs";
import * as Sharing from "expo-sharing";
import { CompletedChecklistRecord } from "@/lib/reports-types";
import { useSignatures } from "@/lib/signatures-context";
import { useAdminConfig } from "@/lib/admin-config-context";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { saveChecklistToCompanyDb } from "@/lib/save-to-company-db";
import * as FileSystem from "expo-file-system/legacy";
import * as SupabaseSync from "@/lib/supabase-sync";
import { uploadPDFToSupabaseStorage } from "@/lib/pdf-upload";
import * as SecureStore from "expo-secure-store";


export default function CompletionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { checklist } = useChecklist();
  const { emails } = useSignatures();
  const adminConfig = useAdminConfig();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [generatedPDFPath, setGeneratedPDFPath] = useState<string | null>(null);

  const sendEmailMutation = trpc.email.sendChecklistReport.useMutation({
    onError: () => {
      // Silenciar erros de validação de entrada (SMTP não configurado)
      // O usuário verá um Alert.alert() em vez disso
    },
  });

  const saveChecklistMutation = trpc.checklist.saveCompleted.useMutation({
    onSuccess: (data) => {
      console.log("✅ Checklist sincronizado com o servidor!", data);
    },
    onError: (error) => {
      console.error("❌ Erro ao sincronizar checklist:", error);
      console.error("[ERROR] Detalhes:", error.message, error.data);
    },
  });

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

  const { addCompletedChecklist } = useReports();
  const hasBeenSaved = useRef(false);

  // Nota: Salvamento foi movido para handleGerarPDF para evitar contabilização prematura
  // Checklist só será salvo quando usuário clicar em "Gerar PDF" ou "Finalizar"

  const handleGerarPDF = async () => {
    try {
      setIsGeneratingPDF(true);

      // PASSO 1: Gerar PDF
      const pdfPath = await generateChecklistPDF({
        checklist,
        checklistType: (checklist as any).checklistType as ChecklistType,
        dataFabricacao: checklist.dadosIniciais?.dataFabricacao || new Date().toLocaleDateString("pt-BR"),
        dataRecuperacao: checklist.dadosIniciais?.dataRecuperacao || new Date().toLocaleDateString("pt-BR"),
        numeroOP: checklist.dadosIniciais?.numeroOP || "",
        numeroSerie: checklist.dadosIniciais?.numeroSerie || "",
      });

      // Salvar o caminho do PDF para usar no email depois
      setGeneratedPDFPath(pdfPath);
      const pdfFileName = pdfPath.split("/").pop() || "checklist.pdf";
      
      // PASSO 2: Fazer upload do PDF para Supabase Storage
      let pdfUrl: string | null = null;
      try {
        console.log("[DEBUG] Iniciando upload de PDF para Supabase Storage...");
        pdfUrl = await uploadPDFToSupabaseStorage(pdfPath, pdfFileName);
        if (pdfUrl) {
          console.log("[DEBUG] ✓ PDF enviado para Supabase Storage:", pdfUrl);
        } else {
          console.warn("[WARN] Erro ao fazer upload de PDF para Supabase");
          // Fallback: usar o caminho local completo (não apenas o nome do
          // arquivo), senão a aba Histórico não consegue mais localizar o
          // PDF neste mesmo aparelho.
          pdfUrl = pdfPath;
        }
      } catch (uploadError) {
        console.warn("[WARN] Erro ao fazer upload de PDF:", uploadError);
        pdfUrl = pdfPath;
      }
      
      // PASSO 3: Salvar no AsyncStorage COM o pdfFileName
      if (!hasBeenSaved.current) {
        const checklistType = (checklist as any).checklistType as ChecklistType;
        const checklistConfig = (checklist as any).checklistConfig;
        const record: CompletedChecklistRecord = {
          id: checklist.id,
          checklistCode: checklistConfig?.codigo || checklistType,
          checklistName: checklistConfig?.nome || checklistType,
          categoria: checklistConfig?.categoria || "Laterais",
          modelo: checklist.modeloSelecionado || "",
          resultado: results.naoOk > 0 ? "NÃO OK" : results.ok > 0 ? "OK" : "NÃO APLICÁVEL",
          executanteName: checklist.assinaturas?.executante?.nome || "",
          executanteMatricula: checklist.assinaturas?.executante?.matricula || "",
          dataRecuperacao: checklist.dadosIniciais?.dataRecuperacao || new Date().toLocaleDateString("pt-BR"),
          dataFabricacao: checklist.dadosIniciais?.dataFabricacao || "",
          numeroSerie: checklist.dadosIniciais?.numeroSerie || "",
          numeroOP: checklist.dadosIniciais?.numeroOP || "",
          timestamp: checklist.timestamp,
          pdfFileName: pdfFileName,
        };
        await addCompletedChecklist(record);
        console.log("[DEBUG] Checklist salvo no AsyncStorage com pdfUrl:", pdfUrl);
        
        // PASSO 4: Sincronizar com Supabase (novo banco de dados)
        try {
          const deviceId = await SecureStore.getItemAsync('@device_id') || `device_${Date.now()}`;
          console.log("[DEBUG] Sincronizando com Supabase, deviceId:", deviceId);
          await SupabaseSync.saveChecklistToSupabase(record, deviceId, pdfUrl);
          console.log("[DEBUG] Checklist sincronizado com Supabase com sucesso!");
        } catch (supabaseError) {
          console.warn("[WARN] Erro ao sincronizar com Supabase (dados salvos localmente):", supabaseError);
        }
        
        // PASSO 5: Sincronizar com servidor
        const mutation = saveChecklistMutation;
        mutation.mutate({
          checklistCode: checklistConfig?.codigo || checklistType,
          checklistName: checklistConfig?.nome || checklistType,
          categoria: checklistConfig?.categoria || "Laterais",
          modelo: checklist.modeloSelecionado || "",
          resultado: results.naoOk > 0 ? "NAO_OK" : results.ok > 0 ? "OK" : "NAO_APLICAVEL",
          executanteName: checklist.assinaturas?.executante?.nome || "",
          executanteMatricula: checklist.assinaturas?.executante?.matricula || "",
          liderName: checklist.assinaturas?.liderMRS?.nome,
          liderMatricula: checklist.assinaturas?.liderMRS?.matricula,
          inspectorName: checklist.assinaturas?.inspectorTecnico?.nome,
          inspectorMatricula: checklist.assinaturas?.inspectorTecnico?.matricula,
          dataFabricacao: checklist.dadosIniciais?.dataFabricacao,
          dataRecuperacao: checklist.dadosIniciais?.dataRecuperacao || new Date().toLocaleDateString("pt-BR"),
          numeroOP: checklist.dadosIniciais?.numeroOP,
          numeroSerie: checklist.dadosIniciais?.numeroSerie,
          totalEtapas: checklist.etapas.length,
          etapasOK: results.ok,
          etapasNaoOK: results.naoOk,
          etapasNaoAplicavel: results.naoAplicavel,
          pdfFileName: pdfUrl,
          email: adminConfig.config?.smtp?.email || adminConfig.config?.emailsRecebimento?.[0] || "",
        });
        console.log("[DEBUG] Checklist sincronizado com servidor");
        hasBeenSaved.current = true;
      }

      // Compartilhar arquivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfPath, {
          mimeType: "application/pdf",
          dialogTitle: "Compartilhar Checklist PDF",
        });
      } else {
        Alert.alert("Sucesso", `PDF salvo em: ${pdfPath}`);
      }

      setIsGeneratingPDF(false);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      Alert.alert("Erro", "Nao foi possivel gerar o PDF. Tente novamente.");
      setIsGeneratingPDF(false);
    }
  };

  const handleCompartilharPDF = async () => {
    if (!generatedPDFPath) {
      Alert.alert("Aviso", "Gere o PDF primeiro clicando em 'Gerar PDF'.");
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
      Alert.alert("Erro", "Não foi possível compartilhar o PDF. Tente novamente.");
    }
  };

  const handleSincronizarAgora = async () => {
    try {
      const checklistType = (checklist as any).checklistType as ChecklistType;
      const checklistConfig = (checklist as any).checklistConfig;
      
      console.log("[DEBUG] Sincronizando checklist manualmente...");
      
      saveChecklistMutation.mutate({
        checklistCode: checklistConfig?.codigo || checklistType,
        checklistName: checklistConfig?.nome || checklistType,
        categoria: checklistConfig?.categoria || "Laterais",
        modelo: checklist.modeloSelecionado || "",
        resultado: results.naoOk > 0 ? "NAO_OK" : results.ok > 0 ? "OK" : "NAO_APLICAVEL",
        executanteName: checklist.assinaturas?.executante?.nome || "",
        executanteMatricula: checklist.assinaturas?.executante?.matricula || "",
        liderName: checklist.assinaturas?.liderMRS?.nome,
        liderMatricula: checklist.assinaturas?.liderMRS?.matricula,
        inspectorName: checklist.assinaturas?.inspectorTecnico?.nome,
        inspectorMatricula: checklist.assinaturas?.inspectorTecnico?.matricula,
        dataFabricacao: checklist.dadosIniciais?.dataFabricacao,
        dataRecuperacao: checklist.dadosIniciais?.dataRecuperacao || new Date().toLocaleDateString("pt-BR"),
        numeroOP: checklist.dadosIniciais?.numeroOP,
        numeroSerie: checklist.dadosIniciais?.numeroSerie,
        totalEtapas: checklist.etapas.length,
        etapasOK: results.ok,
        etapasNaoOK: results.naoOk,
        etapasNaoAplicavel: results.naoAplicavel,
        pdfFileName: generatedPDFPath || "",
        email: adminConfig.config?.smtp?.email || adminConfig.config?.emailsRecebimento?.[0] || "",
      });
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      Alert.alert("Erro", "Nao foi possivel sincronizar. Tente novamente.");
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
              {checklist.checklistConfig?.nome || checklist.checklistType || "Checklist"}
            </Text>
          </View>

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
