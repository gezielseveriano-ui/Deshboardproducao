import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useChecklist } from "@/lib/checklist-context";
import { useState, useEffect } from "react";
import { DadosIniciais } from "@/lib/types";
import { useColors } from "@/hooks/use-colors";

export default function InitialDataScreen() {
  const router = useRouter();
  const colors = useColors();
  const { checklist, updateDadosIniciais } = useChecklist();
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<DadosIniciais>({
    data: new Date().toISOString().split("T")[0],
    dataFabricacao: "",
    numeroOP: "",
    numeroSerie: "",
    dataRecuperacao: "",
    numeroRelatorioPM: "",
  });

  // Checkboxes N/A
  const [naDataFabricacao, setNaDataFabricacao] = useState(false);
  const [naNumeroOP, setNaNumeroOP] = useState(false);
  const [naNumeroSerie, setNaNumeroSerie] = useState(false);

  // Auto-preenchimento de Data da Recuperação com data de hoje (executa primeiro)
  useEffect(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${day}/${month}/${year}`;
    setFormData((prev) => ({
      ...prev,
      dataRecuperacao: todayFormatted,
    }));
  }, []);

  // Carrega dados do checklist anterior (se houver)
  useEffect(() => {
    if (checklist && checklist.dadosIniciais) {
      setFormData((prev) => ({
        ...checklist.dadosIniciais,
        dataRecuperacao: prev.dataRecuperacao, // Mantém a data preenchida
      }));
    }
  }, [checklist]);


  const handleInputChange = (field: keyof DadosIniciais, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [field]: false,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!naDataFabricacao && !formData.dataFabricacao.trim()) newErrors.dataFabricacao = true;
    if (!naNumeroOP && !formData.numeroOP.trim()) newErrors.numeroOP = true;
    if (!naNumeroSerie && !formData.numeroSerie.trim()) newErrors.numeroSerie = true;
    if (!formData.dataRecuperacao.trim()) newErrors.dataRecuperacao = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      updateDadosIniciais(formData);
      router.push("/checklist/model-selection");
    }
  };

  const formatDateInput = (value: string): string => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 0) return "";
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const formatDateInputMMYY = (value: string): string => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 2) return cleaned;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  };

  const CheckboxNA = ({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} className="flex-row items-center gap-2 mt-2 active:opacity-70">
      <View
        className={`w-5 h-5 rounded border-2 items-center justify-center ${
          checked ? "border-primary bg-primary" : "border-border bg-background"
        }`}
      >
        {checked && <Text className="text-white font-bold text-xs">✓</Text>}
      </View>
      <Text className="text-sm text-muted">{label}</Text>
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

          {/* Link Voltar para Home */}
          <TouchableOpacity onPress={() => router.push("/")} className="active:opacity-70">
            <Text className="text-error font-semibold">Voltar para Home</Text>
          </TouchableOpacity>

          {/* Título */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Dados Adicionais</Text>
            <Text className="text-sm text-muted">Preencha todos os dados obrigatórios</Text>
          </View>

          {/* Data de Fabricação */}
          <View className="bg-surface border border-border rounded-lg p-4 gap-3">
            <Text className="text-base font-semibold text-foreground">Data de Fabricação</Text>
            <TextInput
              placeholder="MM/AA"
              value={formData.dataFabricacao}
              onChangeText={(value) => {
                const formatted = formatDateInputMMYY(value);
                handleInputChange("dataFabricacao", formatted);
              }}
              className="border border-border rounded-lg px-3 py-3 text-base text-foreground bg-background"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              editable={!naDataFabricacao}
              maxLength={5}
            />
            <CheckboxNA label="Não Aplicável" checked={naDataFabricacao} onPress={() => setNaDataFabricacao(!naDataFabricacao)} />
            {errors.dataFabricacao && <Text className="text-xs text-error">Campo obrigatório</Text>}
          </View>

          {/* Nº da OP */}
          <View className="bg-surface border border-border rounded-lg p-4 gap-3">
            <Text className="text-base font-semibold text-foreground">Nº da OP</Text>
            <TextInput
              placeholder="Número da OP"
              value={formData.numeroOP}
              onChangeText={(value) => handleInputChange("numeroOP", value)}
              className="border border-border rounded-lg px-3 py-3 text-base text-foreground bg-background"
              placeholderTextColor={colors.muted}
              editable={!naNumeroOP}
            />
            <CheckboxNA label="Não Aplicável" checked={naNumeroOP} onPress={() => setNaNumeroOP(!naNumeroOP)} />
            {errors.numeroOP && <Text className="text-xs text-error">Campo obrigatório</Text>}
          </View>

          {/* Nº da Série */}
          <View className="bg-surface border border-border rounded-lg p-4 gap-3">
            <Text className="text-base font-semibold text-foreground">Nº da Série</Text>
            <TextInput
              placeholder="Número da Série"
              value={formData.numeroSerie}
              onChangeText={(value) => handleInputChange("numeroSerie", value)}
              className="border border-border rounded-lg px-3 py-3 text-base text-foreground bg-background"
              placeholderTextColor={colors.muted}
              editable={!naNumeroSerie}
            />
            <CheckboxNA label="Não Aplicável" checked={naNumeroSerie} onPress={() => setNaNumeroSerie(!naNumeroSerie)} />
            {errors.numeroSerie && <Text className="text-xs text-error">Campo obrigatório</Text>}
          </View>

          {/* Data da Recuperação */}
          <View className="bg-surface border border-border rounded-lg p-4 gap-3">
            <Text className="text-base font-semibold text-foreground">Data da Recuperação</Text>
            <Text className="text-xs text-muted mb-1">Preenchida automaticamente com a data de hoje. Edite se necessário.</Text>
            <TextInput
              placeholder="DD/MM/AAAA"
              value={formData.dataRecuperacao}
              onChangeText={(value) => {
                const formatted = formatDateInput(value);
                handleInputChange("dataRecuperacao", formatted);
              }}
              className="border border-border rounded-lg px-3 py-3 text-base text-foreground bg-background"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              maxLength={10}
            />
            {errors.dataRecuperacao && <Text className="text-xs text-error">Campo obrigatório</Text>}
          </View>

          {/* Botão Próximo */}
          <TouchableOpacity
            onPress={handleNext}
            className="bg-primary rounded-lg py-4 items-center active:opacity-80"
          >
            <Text className="text-white font-semibold text-base">Próximo</Text>
          </TouchableOpacity>

          {/* Botão Voltar */}
          <TouchableOpacity onPress={() => router.back()} className="items-center active:opacity-70">
            <Text className="text-foreground font-semibold text-base">Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
