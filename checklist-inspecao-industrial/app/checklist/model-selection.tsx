import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useChecklist } from "@/lib/checklist-context";
import { getChecklistConfig } from "@/lib/checklist-configs";
import { useState } from "react";

export default function ModelSelectionScreen() {
  const router = useRouter();
  const { checklist, updateModeloSelecionado } = useChecklist();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!checklist) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-muted">Carregando...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const config = getChecklistConfig((checklist as any).checklistType);
  const models = config.modelos;

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    setError(false);
  };

  const handleNext = () => {
    if (!selectedModel) {
      setError(true);
      return;
    }
    updateModeloSelecionado(selectedModel);
    router.push("/checklist/technical-checklist");
  };

  const RadioOption = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface border border-border rounded-lg p-4 flex-row items-center gap-3 active:opacity-70"
    >
      <View
        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
          selected ? "border-primary" : "border-border bg-background"
        }`}
      >
        {selected && <View className="w-3 h-3 rounded-full bg-primary" />}
      </View>
      <Text className="text-base text-foreground">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-6 gap-6">
          {/* Link Voltar */}
          <TouchableOpacity onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-primary font-semibold">← Voltar</Text>
          </TouchableOpacity>

          {/* Título */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Modelo da Lateral</Text>
            <Text className="text-sm text-muted">Selecione apenas um modelo que você está recuperando</Text>
          </View>

          {/* Model Selection */}
          <View className="gap-3">
            {models.map((model) => (
              <RadioOption
                key={model}
                label={model}
                selected={selectedModel === model}
                onPress={() => handleSelectModel(model)}
              />
            ))}
          </View>

          {error && <Text className="text-sm text-error">Selecione um modelo para continuar</Text>}

          {/* Botão Continuar */}
          <TouchableOpacity
            onPress={handleNext}
            className="bg-primary rounded-lg py-4 items-center active:opacity-80"
          >
            <Text className="text-white font-semibold text-base">Continuar</Text>
          </TouchableOpacity>

          {/* Botão Voltar */}
          <TouchableOpacity onPress={() => router.back()} className="items-center active:opacity-70">
            <Text className="text-foreground font-semibold text-base">Voltar</Text>
          </TouchableOpacity>

          {/* Botão Voltar para Home */}
          <TouchableOpacity
            onPress={() => router.push("/")}
            className="border-2 border-error rounded-lg py-3 items-center active:opacity-70"
          >
            <Text className="text-error font-semibold text-base">Voltar para Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
