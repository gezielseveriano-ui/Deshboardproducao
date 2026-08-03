import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useChecklist } from "@/lib/checklist-context";
import { useSignatures } from "@/lib/signatures-context";
import { useState, useEffect, useRef } from "react";
import { ResultadoVerificacao } from "@/lib/types";
import { useColors } from "@/hooks/use-colors";
import { ChecklistType } from "@/lib/checklist-configs";

export default function InitialVerificationsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { checklistType } = useLocalSearchParams<{ checklistType?: string }>();
  const { checklist, updateVerificacoesIniciais, updateInspetorPM, createNewChecklist } = useChecklist();
  const signatures = useSignatures();

  // Criar um checklist em branco sempre que esta tela é aberta para um
  // checklistType. O guard por ref (em vez de comparar com o checklist
  // que já está no contexto) evita recriar 2x no React StrictMode em dev,
  // sem o efeito colateral de "pular" a criação quando o usuário inicia
  // um checklist do MESMO tipo que acabou de terminar - nesse caso
  // `checklist` ainda é o anterior (completo), então comparar tipos dizia
  // "já existe, não recria" e todos os dados antigos (verificações,
  // assinaturas, matrícula) vazavam para o checklist novo.
  const criouChecklistRef = useRef(false);
  useEffect(() => {
    if (checklistType && !criouChecklistRef.current) {
      criouChecklistRef.current = true;
      createNewChecklist(checklistType as ChecklistType);
    }
  }, [checklistType]);

  const [trinca, setTrinca] = useState<ResultadoVerificacao | null>(null);
  const [empenos, setEmpenos] = useState<ResultadoVerificacao | null>(null);
  const [matricula, setMatricula] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [numeroRelatorio, setNumeroRelatorio] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Auto-preencher o nome do inspetor de PM quando a matrícula é digitada -
  // mesmo padrão já usado no Banco de Assinaturas, puxando do cadastro de
  // Inspetores feito em Configurações.
  useEffect(() => {
    if (matricula.trim()) {
      const pessoa = signatures.buscarInspetorPorMatricula(matricula);
      setAssinatura(pessoa ? pessoa.nomeCompleto : "");
    } else {
      setAssinatura("");
    }
  }, [matricula, signatures]);

  const handleNext = () => {
    const newErrors: Record<string, boolean> = {};

    if (!trinca) newErrors.trinca = true;
    if (!empenos) newErrors.empenos = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      console.log('[InitialVerifications] Salvando verificações:', { trinca, empenos });
      updateVerificacoesIniciais({
        trinca: trinca!,
        empenos: empenos!,
      });
      updateInspetorPM({
        nome: assinatura,
        matricula,
        numeroRelatorio,
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
              <Text className="text-sm text-muted">Matrícula (opcional)</Text>
              <TextInput
                className="border border-border rounded-lg p-3 text-foreground bg-background"
                placeholder="Digite a matrícula"
                placeholderTextColor={colors.muted}
                value={matricula}
                onChangeText={setMatricula}
                keyboardType="numeric"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm text-muted">Nome</Text>
              <TextInput
                className="border border-border rounded-lg p-3 text-foreground bg-muted/10"
                placeholder="Nome será preenchido automaticamente"
                placeholderTextColor={colors.muted}
                value={assinatura}
                editable={false}
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
