import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useChecklist } from "@/lib/checklist-context";


export default function ReportScreen() {
  const router = useRouter();
  const { checklist, createNewChecklist } = useChecklist();

  if (!checklist) return null;

  const handleNewChecklist = () => {
    router.push("/(tabs)");
  };

  const handleHome = () => {
    router.push("/(tabs)");
  };

  const countResults = () => {
    const ok = checklist.etapas.filter((e) => e.resultado === "OK").length;
    const naoOk = checklist.etapas.filter((e) => e.resultado === "NAO_OK").length;
    const naoAplicavel = checklist.etapas.filter((e) => e.resultado === "NAO_APLICAVEL").length;
    return { ok, naoOk, naoAplicavel };
  };

  const results = countResults();

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return dateString;
    }
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Relatório Finalizado</Text>
            <Text className="text-sm text-muted">Checklist concluído com sucesso</Text>
          </View>

          {/* Status Card */}
          <View className="bg-success/10 border border-success rounded-lg p-6 gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-3xl">✓</Text>
              <Text className="text-lg font-semibold text-success">Checklist Completo</Text>
            </View>
            <Text className="text-sm text-foreground">
              Todos os campos foram preenchidos corretamente e as assinaturas foram capturadas.
            </Text>
          </View>

          {/* Summary */}
          <View className="bg-surface rounded-lg p-4 gap-4 border border-border">
            <Text className="text-base font-semibold text-foreground">Resumo do Checklist</Text>

            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Data:</Text>
                <Text className="text-sm font-semibold text-foreground">{formatDate(checklist.dadosIniciais.data)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Modelo Selecionado:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {(checklist as any).modeloSelecionado || "N/A"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Nº da OP:</Text>
                <Text className="text-sm font-semibold text-foreground">{checklist.dadosIniciais.numeroOP}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Nº da Série:</Text>
                <Text className="text-sm font-semibold text-foreground">{checklist.dadosIniciais.numeroSerie}</Text>
              </View>
            </View>

            <View className="h-px bg-border" />

            <Text className="text-base font-semibold text-foreground">Resultados das Etapas</Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-success font-semibold">OK:</Text>
                <Text className="text-sm font-semibold text-success">{results.ok} etapas</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-warning font-semibold">NÃO OK:</Text>
                <Text className="text-sm font-semibold text-warning">{results.naoOk} etapas</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted font-semibold">NÃO APLICÁVEL:</Text>
                <Text className="text-sm font-semibold text-muted">{results.naoAplicavel} etapas</Text>
              </View>
            </View>

            <View className="h-px bg-border" />

            <Text className="text-base font-semibold text-foreground">Verificações Iniciais</Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Trinca:</Text>
                <Text className={`text-sm font-semibold ${checklist.verificacoesIniciais.trinca === "APROVADO" ? "text-success" : "text-warning"}`}>
                  {checklist.verificacoesIniciais.trinca}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Empenos:</Text>
                <Text className={`text-sm font-semibold ${checklist.verificacoesIniciais.empenos === "APROVADO" ? "text-success" : "text-warning"}`}>
                  {checklist.verificacoesIniciais.empenos}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleHome}
              className="bg-primary rounded-lg p-4 active:opacity-80"
              style={{ minHeight: 56 }}
            >
              <Text className="text-white font-semibold text-center text-base">Voltar para Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNewChecklist}
              className="border-2 border-primary rounded-lg p-4 active:opacity-80"
              style={{ minHeight: 56 }}
            >
              <Text className="text-primary font-semibold text-center text-base">Novo Checklist</Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View className="bg-primary/5 rounded-lg p-4 gap-2 border border-primary">
            <Text className="text-sm font-semibold text-foreground">Dados Salvos</Text>
            <Text className="text-xs text-muted">
              O checklist foi salvo automaticamente no dispositivo. Você pode acessá-lo a qualquer momento a partir da tela inicial.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
