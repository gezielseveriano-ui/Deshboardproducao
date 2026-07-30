import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useChecklist } from "@/lib/checklist-context";
import { useState, useEffect } from "react";
import { ResultadoVerificacao } from "@/lib/types";
import { useColors } from "@/hooks/use-colors";
import { ChecklistType } from "@/lib/checklist-configs";

export default function InitialVerificationsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { checklistType } = useLocalSearchParams<{ checklistType?: string }>();
  const { checklist, updateVerificacoesIniciais, createNewChecklist } = useChecklist();

  // Criar checklist quando receber checklistType
  // IMPORTANTE: Criar novo checklist SEMPRE que checklistType mudar, mesmo se já existe um anterior
  useEffect(() => {
    if (checklistType) {
      createNewChecklist(checklistType as ChecklistType);
    }
  }, [checklistType, createNewChecklist]);
  const [trinca, setTrinca] = useState<ResultadoVerificacao>("APROVADO");
  const [empenos, setEmpenos] = useState<ResultadoVerificacao>("APROVADO");
  const [assinatura, setAssinatura] = useState("");
  const [matricula, setMatricula] = useState("");
  const [numeroRelatorio, setNumeroRelatorio] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleNext = () => {
    const newErrors: Record<string, boolean> = {};

    if (!trinca) newErrors.trinca = true;
    if (!empenos) newErrors.empenos = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      updateVerificacoesIniciais({
        trinca: trinca!,
        empenos: empenos!,
      });
      router.push("/checklist/initial-data");
    }
  };

  const CheckboxOption = ({
    label,
    value,
    selected,
    onPress,
  }: {
    label: string;
    value: ResultadoVerificacao;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface border border-border rounded-lg p-4 flex-row items-center gap-3 active:opacity-70"
    >
      <View
        className={`w-5 h-5 rounded border-2 items-center justify-center ${
          selected ? "border-primary bg-primary" : "border-border bg-background"
        }`}
      >
        {selected && <Text className="text-white font-bold text-xs">✓</Text>}
      </View>
      <Text className="text-base text-foreground">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-6 gap-6">
          {/* Link Voltar para Home */}
          <TouchableOpacity onPress={() => router.push("/")} className="active:opacity-70">
            <Text className="text-error font-semibold">Voltar para Home</Text>
          </TouchableOpacity>

          {/* Título */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Inspeção de Trincas e Empenos</Text>
            <Text className="text-sm text-muted">Preencha as duas verificações obrigatórias</Text>
          </View>

          {/* Verificação de Trinca */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Verificação de Trinca</Text>
            {errors.trinca && <Text className="text-xs text-error">Seleção obrigatória</Text>}
            <View className="gap-2">
              <CheckboxOption
                label="Aprovado"
                value="APROVADO"
                selected={trinca === "APROVADO"}
                onPress={() => setTrinca("APROVADO")}
              />
              <CheckboxOption
                label="Reprovado"
                value="REPROVADO"
                selected={trinca === "REPROVADO"}
                onPress={() => setTrinca("REPROVADO")}
              />
            </View>
          </View>

          {/* Verificação de Empenos */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Verificação de Empenos</Text>
            {errors.empenos && <Text className="text-xs text-error">Seleção obrigatória</Text>}
            <View className="gap-2">
              <CheckboxOption
                label="Aprovado"
                value="APROVADO"
                selected={empenos === "APROVADO"}
                onPress={() => setEmpenos("APROVADO")}
              />
              <CheckboxOption
                label="Reprovado"
                value="REPROVADO"
                selected={empenos === "REPROVADO"}
                onPress={() => setEmpenos("REPROVADO")}
              />
            </View>
          </View>

          {/* Assinatura do Inspetor de PM */}
          <View className="gap-4 bg-surface border border-border rounded-lg p-4">
            <Text className="text-lg font-semibold text-foreground">Assinatura do Inspetor de PM</Text>

            <View className="gap-2">
              <Text className="text-sm text-muted">Assinatura (opcional)</Text>
              <TextInput
                className="border border-border rounded-lg p-3 text-foreground bg-background"
                placeholder="Assinatura do Inspetor"
                placeholderTextColor={colors.muted}
                value={assinatura}
                onChangeText={setAssinatura}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm text-muted">Matrícula (opcional)</Text>
              <TextInput
                className="border border-border rounded-lg p-3 text-foreground bg-background"
                placeholder="Matrícula"
                placeholderTextColor={colors.muted}
                value={matricula}
                onChangeText={setMatricula}
                keyboardType="numeric"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm text-muted">Nº do Relatório de PM (opcional)</Text>
              <TextInput
                className="border border-border rounded-lg p-3 text-foreground bg-background"
                placeholder="Nº do Relatório"
                placeholderTextColor={colors.muted}
                value={numeroRelatorio}
                onChangeText={setNumeroRelatorio}
              />
            </View>
          </View>

          {/* Botão Próximo */}
          <TouchableOpacity
            onPress={handleNext}
            className="bg-primary rounded-lg py-4 items-center active:opacity-80"
          >
            <Text className="text-white font-semibold text-base">Próximo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
