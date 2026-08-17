import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useReports } from "@/lib/reports-context";
import { useChecklist } from "@/lib/checklist-context";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo, Fragment } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CompletedChecklistRecord } from "@/lib/reports-types";
import JSZip from "jszip";
import * as FileSystem from "expo-file-system/legacy";
import { DatePickerCalendar } from "@/components/date-picker-calendar";
import { getApiBaseUrl } from "@/constants/oauth";
import { Calendar } from "react-native-calendars";
import { resolveLocalPdfPath, downloadUrlOnWeb, buildZipBlobUrlOnWeb } from "@/lib/pdf-local-cache";
import { alertar, confirmar } from "@/lib/alert";
import { useAdminConfig } from "@/lib/admin-config-context";
import { trpcVanilla } from "@/lib/trpc-vanilla";


function HistoryItemCard({
  item,
  isSelected,
  onToggleSelect,
  onViewPDF,
  isLoadingPDF,
  colors,
}: {
  item: CompletedChecklistRecord;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onViewPDF: (item: CompletedChecklistRecord) => void;
  isLoadingPDF: string | null;
  colors: ReturnType<typeof useColors>;
}) {
  const conteudo = (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-lg font-semibold text-foreground">
          {item.checklistCode}
        </Text>
        <View className="flex-row gap-2">
          <View
            className="w-6 h-6 rounded border-2 items-center justify-center"
            style={{
              borderColor: colors.primary,
              backgroundColor: isSelected ? colors.primary : "transparent",
            }}
          >
            {isSelected && <Text className="text-white font-bold">✓</Text>}
          </View>
        </View>
      </View>

      <Text className="text-sm text-muted mb-1">{item.checklistCode}</Text>
      {item.pdfFileName && (
        <Text className="text-sm text-primary mb-2">
          📄 {item.pdfFileName.split("/").pop()?.replace(".pdf", "")}
        </Text>
      )}
      <Text className="text-sm text-muted mb-1">Modelo: {item.modelo}</Text>
      <Text className="text-sm text-muted mb-3">Executante: {item.executanteName}</Text>

      <Text className="text-xs text-muted mb-3">
        {item.dataRecuperacao || "—"}
        {item.pdfFileName ? (
          <Text className="text-success"> ✓ OK - Pronto para download</Text>
        ) : (
          <Text className="text-warning"> ⏳ Aguardando conexão para gerar o PDF</Text>
        )}
      </Text>
    </View>
  );

  return (
    <View
      className="bg-surface rounded-lg p-4 mb-4 border border-border"
      style={{ borderColor: colors.border }}
    >
      <Pressable onPress={() => onToggleSelect(item.id)}>{conteudo}</Pressable>

      <TouchableOpacity
        className="bg-primary rounded-lg py-2 items-center mt-3"
        onPress={() => onViewPDF(item)}
      >
        {isLoadingPDF === item.id ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text className="text-background font-semibold">Ver PDF</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { createNewChecklist } = useChecklist();
  const adminConfig = useAdminConfig();
  const {
    completedChecklists,
    deleteCompletedChecklists,
    syncPendingChecklists,
    pendingSyncCount,
    retryPendingPdfGenerations,
    pendingPdfCount,
    retryPendingDeletes,
    pendingDeleteCount,
  } = useReports();
  const [searchText, setSearchText] = useState("");
  const [filterModelo, setFilterModelo] = useState<string | null>(null);
  const [filterExecutante, setFilterExecutante] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [isLoadingPDF, setIsLoadingPDF] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<Set<string>>(new Set());

  const handleViewPDF = async (item: CompletedChecklistRecord) => {
    if (!item.pdfFileName) {
      alertar("Erro", "PDF não encontrado para este checklist.");
      return;
    }

    if (Platform.OS === "web" && /^https?:\/\//i.test(item.pdfFileName)) {
      // Navega na mesma aba (em vez de abrir uma nova) porque tanto
      // window.open() quanto um <a target="_blank"> clicado via JS ou
      // renderizado como href do TouchableOpacity são bloqueados pelo
      // navegador nesta tela - o clique perde a confiança de "gesto do
      // usuário" ao passar pelo sistema de toque do React Native Web,
      // mesmo com userActivation.isActive true e sem preventDefault em
      // lugar nenhum. Navegação na mesma aba não sofre desse bloqueio.
      window.location.href = item.pdfFileName;
      return;
    }

    setIsLoadingPDF(item.id);
    try {
      const localPath = await resolveLocalPdfPath(item.pdfFileName);
      if (!localPath) {
        alertar("Erro", "PDF não encontrado ou corrompido. Tente sincronizar novamente.");
        return;
      }

      await Sharing.shareAsync(localPath, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
      });
    } catch (error) {
      console.error("Erro ao visualizar PDF:", error);
      alertar("Erro", "Não foi possível visualizar o PDF.");
    } finally {
      setIsLoadingPDF(null);
    }
  };

  // Sincronizar checklists manualmente - reenvia pro Supabase qualquer
  // checklist ainda pendente (feito offline, nunca confirmado sincronizado),
  // tenta gerar de novo o PDF de qualquer checklist finalizado offline, e
  // tenta de novo qualquer exclusão que ainda não foi confirmada no servidor.
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const [
        { synced, failed },
        { synced: pdfSynced, failed: pdfFailed },
        { deleted: deletesSynced, failed: deletesFailed },
      ] = await Promise.all([
        syncPendingChecklists(),
        retryPendingPdfGenerations(),
        retryPendingDeletes(),
      ]);
      const totalSynced = synced + pdfSynced + deletesSynced;
      const totalFailed = failed + pdfFailed + deletesFailed;
      if (totalSynced === 0 && totalFailed === 0) {
        alertar("Tudo certo", "Não há checklists pendentes de sincronização.");
      } else if (totalFailed > 0) {
        alertar(
          "Atenção",
          `${totalSynced} checklist(s) sincronizado(s). ${totalFailed} ainda não puderam ser enviados - verifique sua conexão.`
        );
      } else {
        alertar("Sucesso", `${totalSynced} checklist(s) sincronizado(s) com sucesso!`);
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      alertar("Erro", "Falha ao sincronizar checklists.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtrar checklists baseado na data
  const filteredChecklists = useMemo(() => {
    let filtered = completedChecklists;

    // Aplicar filtro de data
    if (filterDate !== "all") {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      switch (filterDate) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "week":
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "month":
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setMonth(now.getMonth() + 1);
          endDate.setDate(0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "custom":
          if (dateRangeStart && dateRangeEnd) {
            // dateRangeStart e dateRangeEnd já são Date objects
            startDate = new Date(dateRangeStart.getFullYear(), dateRangeStart.getMonth(), dateRangeStart.getDate());
            endDate = new Date(dateRangeEnd.getFullYear(), dateRangeEnd.getMonth(), dateRangeEnd.getDate());
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
          } else {
            return completedChecklists; // Retornar todos se datas não estiverem definidas
          }
          break;
      }

      filtered = filtered.filter((item) => {
        // Filtra pela "Data da Recuperação" digitada pelo inspetor (não
        // pelo timestamp real de quando o checklist foi salvo) - é assim
        // de propósito: se o inspetor esqueceu de fazer o checklist no dia
        // certo e lança retroativo, o relatório/histórico deve contar na
        // data retroativa que ele informou, não no dia em que preencheu o
        // formulário. Mesmo critério usado na aba Relatórios.
        const [day, month, year] = item.dataRecuperacao.split("/").map(Number);
        const checklistDate = new Date(year, month - 1, day);
        checklistDate.setHours(0, 0, 0, 0);
        return checklistDate >= startDate && checklistDate <= endDate;
      });
    }

    // Aplicar filtro de modelo
    if (filterModelo && filterModelo !== "Todos") {
      filtered = filtered.filter((item) => item.modelo === filterModelo);
    }

    // Aplicar filtro de executante
    if (filterExecutante && filterExecutante !== "Todos") {
      filtered = filtered.filter((item) => item.executanteName === filterExecutante);
    }

    // Aplicar busca por texto
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.checklistCode?.toLowerCase().includes(searchLower) ||
          item.checklistName?.toLowerCase().includes(searchLower) ||
          item.modelo?.toLowerCase().includes(searchLower) ||
          item.executanteName?.toLowerCase().includes(searchLower) ||
          item.pdfFileName?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [
    completedChecklists,
    filterDate,
    filterModelo,
    filterExecutante,
    searchText,
    dateRangeStart,
    dateRangeEnd,
  ]);

  // Obter lista de modelos únicos
  const modelos = useMemo(() => {
    const unique = Array.from(
      new Set(completedChecklists.map((item) => item.modelo))
    ).filter(Boolean);
    return ["Todos", ...unique];
  }, [completedChecklists]);

  // Obter lista de executantes únicos
  const executantes = useMemo(() => {
    const unique = Array.from(
      new Set(completedChecklists.map((item) => item.executanteName))
    ).filter(Boolean);
    return ["Todos", ...unique];
  }, [completedChecklists]);

  // Compartilhar PDFs selecionados por email
  // Envia os checklists selecionados direto pelo servidor, com o(s) PDF(s)
  // já anexado(s) de verdade - substitui o antigo caminho de "baixa o
  // arquivo e abre o cliente de email pro usuário anexar na mão", que
  // dependia do usuário lembrar de anexar (e o Outlook nem sempre é o
  // padrão configurado no Windows, então às vezes nem abria o certo).
  const enviarChecklistsPorEmailWeb = async (selecionados: CompletedChecklistRecord[]) => {
    const smtp = adminConfig.config?.smtp;
    if (!smtp?.email || !smtp?.servidor || !smtp?.porta || !smtp?.senha) {
      alertar(
        "Configure o e-mail primeiro",
        'Vá em Configurações e preencha o e-mail, servidor e senha (SMTP) antes de enviar checklists por e-mail.'
      );
      return;
    }

    const files = selecionados
      .filter((c) => c.pdfFileName && /^https?:\/\//i.test(c.pdfFileName))
      .map((c) => ({
        url: c.pdfFileName!,
        filename: c.pdfFileName!.split("/").pop() || `${c.checklistCode}.pdf`,
      }));

    if (files.length === 0) {
      alertar("Erro", "Nenhum PDF válido encontrado para enviar.");
      return;
    }

    const destinatariosPadrao = (adminConfig.config?.emailsRecebimento || []).join(", ");
    const destino = window.prompt(
      "Enviar checklist(s) para qual e-mail? (separe vários endereços por vírgula)",
      destinatariosPadrao
    );
    if (destino === null) return; // usuário cancelou

    const to = destino
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    if (to.length === 0) {
      alertar("Erro", "Informe pelo menos um e-mail de destino.");
      return;
    }

    const startDate = selecionados[0].dataRecuperacao;
    const endDate = selecionados[selecionados.length - 1].dataRecuperacao;
    const subject = `Checklist ${startDate} a ${endDate}`;

    const result = await trpcVanilla.email.sendChecklistFiles.mutate({
      to,
      subject,
      files,
      smtpEmail: smtp.email,
      smtpServidor: smtp.servidor,
      smtpPorta: smtp.porta,
      smtpSenha: smtp.senha,
    });

    if (result.success) {
      alertar(
        "Enviado!",
        `${files.length} checklist${files.length > 1 ? "s" : ""} enviado${files.length > 1 ? "s" : ""} para ${to.join(", ")}.`
      );
    } else {
      alertar("Erro ao enviar", result.message);
    }
  };

  const handleShareByEmail = async () => {
    if (selectedChecklistIds.size === 0) {
      alertar("Aviso", "Selecione pelo menos um checklist para compartilhar.");
      return;
    }

    setIsLoadingZip(true);
    try {
      const selectedArray = Array.from(selectedChecklistIds);
      const selectedChecklists = filteredChecklists.filter((c) =>
        selectedArray.includes(c.id)
      );

      if (Platform.OS === "web") {
        await enviarChecklistsPorEmailWeb(selectedChecklists);
        return;
      }

      if (selectedArray.length === 1) {
        // Compartilhar um único PDF
        const checklist = selectedChecklists[0];
        if (checklist.pdfFileName) {
          const localPath = await resolveLocalPdfPath(checklist.pdfFileName);
          if (!localPath) {
            alertar("Erro", "PDF não encontrado ou corrompido.");
            return;
          }

          await Sharing.shareAsync(localPath, {
            UTI: "com.adobe.pdf",
            mimeType: "application/pdf",
          });
        }
      } else {
        // Compartilhar múltiplos PDFs em ZIP
        const zip = new JSZip();
        let successCount = 0;

        for (const checklist of selectedChecklists) {
          if (checklist.pdfFileName) {
            try {
              const localPath = await resolveLocalPdfPath(checklist.pdfFileName);
              if (localPath) {
                const pdfData = await FileSystem.readAsStringAsync(
                  localPath,
                  { encoding: FileSystem.EncodingType.Base64 }
                );
                const fileName = checklist.pdfFileName.split("/").pop() || `${checklist.checklistCode}.pdf`;
                zip.file(fileName, pdfData, { base64: true });
                successCount++;
              }
            } catch (error) {
              console.error(`Erro ao adicionar ${checklist.checklistCode} ao ZIP:`, error);
            }
          }
        }

        if (successCount === 0) {
          alertar("Erro", "Nenhum PDF válido encontrado para compartilhar.");
          return;
        }

        // Gerar ZIP
        const zipData = await zip.generateAsync({ type: "base64" });
        const zipPath = `${FileSystem.cacheDirectory}checklists_${Date.now()}.zip`;

        await FileSystem.writeAsStringAsync(zipPath, zipData, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Compartilhar ZIP
        const startDate = selectedChecklists[0].dataRecuperacao;
        const endDate = selectedChecklists[selectedChecklists.length - 1].dataRecuperacao;
        const subject = `Checklist ${startDate} a ${endDate}`;

        await Sharing.shareAsync(zipPath, {
          mimeType: "application/zip",
          UTI: "public.zip-archive",
        });

        alertar("Sucesso", `${successCount} arquivo(s) compartilhado(s) no email!`);
      }
    } catch (error) {
      console.error("Erro ao compartilhar por email:", error);
      alertar("Erro", "Falha ao compartilhar checklists.");
    } finally {
      setIsLoadingZip(false);
    }
  };

  // Baixa o PDF pro navegador como blob: (em vez de linkar direto pra URL
  // remota) porque um link cross-origin com o atributo "download" costuma
  // ser ignorado pelo navegador (ele só abre o PDF em vez de salvar) - com
  // o blob, o navegador sempre salva de verdade. Best-effort: uma falha
  // aqui nunca deve impedir a exclusão, que é a ação que o usuário pediu -
  // só faz o backup silenciosamente antes, sem depender de confirmação.
  const baixarBackupAntesDeExcluir = async (
    selecionados: CompletedChecklistRecord[]
  ): Promise<void> => {
    const comPdf = selecionados.filter((c) => c.pdfFileName);
    if (comPdf.length === 0) return;

    try {
      if (comPdf.length === 1) {
        const c = comPdf[0];
        const response = await fetch(c.pdfFileName!);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        downloadUrlOnWeb(blobUrl, `${c.checklistCode}_backup.pdf`);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        const files = comPdf.map((c) => ({
          url: c.pdfFileName!,
          name: `${c.checklistCode}.pdf`,
        }));
        const zipUrl = await buildZipBlobUrlOnWeb(files);
        downloadUrlOnWeb(zipUrl, `backup_checklists_excluidos_${Date.now()}.zip`);
        setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
      }
    } catch (error) {
      console.warn("[Historico] Falha ao baixar backup antes de excluir:", error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedChecklistIds.size === 0) return;

    const count = selectedChecklistIds.size;
    const selecionados = filteredChecklists.filter((c) => selectedChecklistIds.has(c.id));

    // 1. Backup primeiro, incondicional - baixar uma cópia não é destrutivo,
    // então não precisa de confirmação nenhuma antes. Só depois de já ter
    // uma cópia salva no aparelho é que perguntamos se pode excluir. Mostra
    // o spinner já nesse passo (pode demorar com muitos PDFs), senão o
    // botão parece não fazer nada enquanto baixa em segundo plano.
    setIsDeleting(true);
    if (Platform.OS === "web") {
      await baixarBackupAntesDeExcluir(selecionados);
    }
    setIsDeleting(false);

    // 2. Confirmação
    const title = "Excluir checklist" + (count > 1 ? "s" : "");
    const message = `Um backup em PDF já foi baixado. Tem certeza que deseja excluir ${count} checklist${count > 1 ? "s" : ""} do histórico?`;

    confirmar(
      title,
      message,
      async () => {
        setIsDeleting(true);
        try {
          // A remoção da lista aqui no aparelho é imediata (não espera o
          // Supabase) - "failed" agora só significa que a exclusão real no
          // servidor ainda não foi confirmada e vai ser tentada de novo
          // sozinha em segundo plano, não que o checklist continua
          // aparecendo na tela. "lastError" só aparece pra um caso realmente
          // anômalo (checklist selecionado que já não existia na lista).
          const { lastError } = await deleteCompletedChecklists(Array.from(selectedChecklistIds));
          setSelectedChecklistIds(new Set());
          if (lastError) {
            alertar("Atenção", lastError);
          }
        } finally {
          setIsDeleting(false);
        }
      },
      "Excluir"
    );
  };

  const toggleChecklistSelection = (id: string) => {
    const newSelected = new Set(selectedChecklistIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedChecklistIds(newSelected);
  };

  const renderItem = ({ item }: { item: CompletedChecklistRecord }) => (
    <HistoryItemCard
      item={item}
      isSelected={selectedChecklistIds.has(item.id)}
      onToggleSelect={toggleChecklistSelection}
      onViewPDF={handleViewPDF}
      isLoadingPDF={isLoadingPDF}
      colors={colors}
    />
  );

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-foreground flex-1">
            Histórico de Checklists
          </Text>
          {selectedChecklistIds.size > 0 && (
            <TouchableOpacity
              className="flex-row items-center bg-red-600 rounded-lg px-3 py-2 ml-2"
              onPress={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialIcons name="delete" size={20} color="white" />
                  <Text className="text-white font-semibold ml-1">
                    {selectedChecklistIds.size}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Botão Sincronizar */}
        {(() => {
          const totalPendente = pendingSyncCount + pendingPdfCount + pendingDeleteCount;
          return (
            <>
              <TouchableOpacity
                className="bg-primary rounded-lg py-3 mb-1 items-center"
                onPress={handleSyncNow}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text className="text-background font-semibold">
                    Sincronizar Agora{totalPendente > 0 ? ` (${totalPendente} pendente${totalPendente > 1 ? "s" : ""})` : ""}
                  </Text>
                )}
              </TouchableOpacity>
              {totalPendente > 0 ? (
                <Text className="text-xs text-muted mb-4">
                  {pendingPdfCount > 0
                    ? `${pendingPdfCount} checklist${pendingPdfCount > 1 ? "s" : ""} finalizado${pendingPdfCount > 1 ? "s" : ""} sem internet, aguardando gerar o PDF. `
                    : ""}
                  {pendingSyncCount > 0
                    ? `${pendingSyncCount} checklist${pendingSyncCount > 1 ? "s" : ""} ainda não confirmado${pendingSyncCount > 1 ? "s" : ""} no servidor. `
                    : ""}
                  {pendingDeleteCount > 0
                    ? `${pendingDeleteCount} exclusão${pendingDeleteCount > 1 ? "ões" : ""} ainda não confirmada${pendingDeleteCount > 1 ? "s" : ""} no servidor. `
                    : ""}
                  O app tenta sozinho assim que a internet voltar.
                </Text>
              ) : (
                <View className="mb-4" />
              )}
            </>
          );
        })()}

        {/* Busca */}
        <TextInput
          placeholder="Buscar por código, nome, modelo..."
          value={searchText}
          onChangeText={setSearchText}
          className="bg-surface border border-border rounded-lg px-3 py-2 mb-4 text-foreground"
          placeholderTextColor={colors.muted}
        />

        {/* Filtros de Período */}
        <Text className="text-sm font-semibold text-foreground mb-2">Período</Text>
        <View className="flex-row gap-2 mb-4 flex-wrap">
          {["all", "today", "week", "month", "custom"].map((period) => (
            <TouchableOpacity
              key={period}
              className={`px-4 py-2 rounded-full ${
                filterDate === period ? "bg-primary" : "bg-surface border border-border"
              }`}
              onPress={() => {
                setFilterDate(period as any);
                if (period === "custom") {
                  setShowDatePicker(true);
                }
              }}
            >
              <Text
                className={`font-semibold ${
                  filterDate === period ? "text-background" : "text-foreground"
                }`}
              >
                {period === "all"
                  ? "Todos"
                  : period === "today"
                  ? "Hoje"
                  : period === "week"
                  ? "Semana"
                  : period === "month"
                  ? "Mês"
                  : "Período"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filtro de Modelo */}
        <Text className="text-sm font-semibold text-foreground mb-2">Modelo</Text>
        <View className="flex-row gap-2 mb-4 flex-wrap">
          {modelos.map((modelo) => (
            <TouchableOpacity
              key={modelo}
              className={`px-3 py-2 rounded-full ${
                filterModelo === modelo ? "bg-primary" : "bg-surface border border-border"
              }`}
              onPress={() => setFilterModelo(modelo)}
            >
              <Text
                className={`text-sm font-semibold ${
                  filterModelo === modelo ? "text-background" : "text-foreground"
                }`}
              >
                {modelo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filtro de Executante */}
        <Text className="text-sm font-semibold text-foreground mb-2">Executante</Text>
        <View className="flex-row gap-2 mb-4 flex-wrap">
          {executantes.map((executante) => (
            <TouchableOpacity
              key={executante}
              className={`px-3 py-2 rounded-full ${
                filterExecutante === executante
                  ? "bg-primary"
                  : "bg-surface border border-border"
              }`}
              onPress={() => setFilterExecutante(executante)}
            >
              <Text
                className={`text-sm font-semibold ${
                  filterExecutante === executante ? "text-background" : "text-foreground"
                }`}
              >
                {executante}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Marcar Todos */}
        {filteredChecklists.length > 0 && (
          <TouchableOpacity
            className="bg-blue-600 rounded-lg py-3 items-center mb-3"
            onPress={() =>
              setSelectedChecklistIds(new Set(filteredChecklists.map((c) => c.id)))
            }
          >
            <Text className="text-white font-semibold">
              Marcar Todos ({filteredChecklists.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* Lista de Checklists */}
        {filteredChecklists.length === 0 ? (
          <View className="items-center justify-center py-8">
            <Text className="text-muted">Nenhum checklist encontrado</Text>
          </View>
        ) : (
          filteredChecklists.map((item) => (
            <Fragment key={item.id}>{renderItem({ item })}</Fragment>
          ))
        )}

        {/* Botões de Ação */}
        {selectedChecklistIds.size > 0 && (
          <View className="gap-3 mt-4 mb-4">
            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-3 items-center"
              onPress={() => setSelectedChecklistIds(new Set())}
            >
              <Text className="text-white font-semibold">Desmarcar Todos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-3 items-center"
              onPress={handleShareByEmail}
              disabled={isLoadingZip}
            >
              {isLoadingZip ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">
                  📧 Email ({selectedChecklistIds.size})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal de Calendario para Periodo Customizado */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View className="flex-1 bg-background p-4 pt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-foreground">Selecione o Periodo</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Text className="text-primary font-semibold">Fechar</Text>
            </TouchableOpacity>
          </View>

          {/* Calendario de Data Inicial */}
          <Text className="text-sm font-semibold text-foreground mb-2">Data Inicial</Text>
          <Calendar
            onDayPress={(day: any) => {
              // Parse YYYY-MM-DD sem timezone para evitar problemas
              const [year, month, dayNum] = day.dateString.split("-").map(Number);
              const date = new Date(year, month - 1, dayNum, 0, 0, 0, 0);
              setDateRangeStart(date);
            }}
            markedDates={{
              ...(dateRangeStart && {
                [dateRangeStart.toISOString().split("T")[0]]: {
                  selected: true,
                  marked: true,
                  selectedColor: colors.primary,
                },
              }),
            }}
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.foreground,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.background,
              todayTextColor: colors.primary,
              dayTextColor: colors.foreground,
              textDisabledColor: colors.muted,
              dotColor: colors.primary,
              selectedDotColor: colors.background,
              monthTextColor: colors.foreground,
              textMonthFontWeight: "bold",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />

          {/* Calendario de Data Final */}
          <Text className="text-sm font-semibold text-foreground mb-2 mt-4">Data Final</Text>
          <Calendar
            onDayPress={(day: any) => {
              // Parse YYYY-MM-DD sem timezone para evitar problemas
              const [year, month, dayNum] = day.dateString.split("-").map(Number);
              const date = new Date(year, month - 1, dayNum, 0, 0, 0, 0);
              setDateRangeEnd(date);
            }}
            markedDates={{
              ...(dateRangeEnd && {
                [dateRangeEnd.toISOString().split("T")[0]]: {
                  selected: true,
                  marked: true,
                  selectedColor: colors.primary,
                },
              }),
            }}
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.foreground,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.background,
              todayTextColor: colors.primary,
              dayTextColor: colors.foreground,
              textDisabledColor: colors.muted,
              dotColor: colors.primary,
              selectedDotColor: colors.background,
              monthTextColor: colors.foreground,
              textMonthFontWeight: "bold",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />

          {/* Botao de Confirmar */}
          <TouchableOpacity
            className="bg-primary rounded-lg py-3 items-center mt-4"
            onPress={() => {
              if (dateRangeStart && dateRangeEnd) {
                setFilterDate("custom");
                setShowDatePicker(false);
              } else {
                alertar("Erro", "Selecione data inicial e final");
              }
            }}
          >
            <Text className="text-background font-semibold">Confirmar Periodo</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

import { ScreenContainer } from "@/components/screen-container";
