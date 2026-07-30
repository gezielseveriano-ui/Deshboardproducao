import { ScrollView, Text, View, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useChecklist } from "@/lib/checklist-context";
import { useState } from "react";

export default function FinalQuestionsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { updatePerguntasFinais } = useChecklist();
  
  const [coluna, setColuna] = useState<"SIM" | "NAO" | null>(null);
  const [guia, setGuia] = useState<"SIM" | "NAO" | null>(null);

  const handleProximo = () => {
    if (coluna === null || guia === null) {
      Alert.alert("Erro", "Por favor, responda ambas as perguntas");
      return;
    }

    updatePerguntasFinais({
      substituicaoChapaColuna: coluna,
      substituicaoChapaGuia: guia,
    });

    router.push("/checklist/signatures-bank");
  };

  const handleVoltar = () => {
    router.back();
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 bg-background border-b border-border">
          <Text className="text-2xl font-bold text-foreground">Pergunta Final</Text>
          <Text className="text-sm text-muted mt-1">Responda as perguntas abaixo</Text>
        </View>

        {/* Content */}
        <View className="px-6 py-6 flex-1">
          {/* Pergunta 1 */}
          <View className="mb-8">
            <Text className="text-base font-semibold text-foreground mb-4">
              Houve substituição de chapa na coluna?
            </Text>

            <View className="gap-3">
              {/* Sim */}
              <TouchableOpacity
                onPress={() => setColuna("SIM")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: coluna === "SIM" ? colors.primary : colors.border,
                  backgroundColor: coluna === "SIM" ? `${colors.primary}15` : colors.surface,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: coluna === "SIM" ? colors.primary : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {coluna === "SIM" && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.background,
                      }}
                    />
                  )}
                </View>
                <Text style={{ marginLeft: 12, fontSize: 16, color: colors.foreground, fontWeight: "500" }}>
                  Sim
                </Text>
              </TouchableOpacity>

              {/* Não */}
              <TouchableOpacity
                onPress={() => setColuna("NAO")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: coluna === "NAO" ? colors.primary : colors.border,
                  backgroundColor: coluna === "NAO" ? `${colors.primary}15` : colors.surface,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: coluna === "NAO" ? colors.primary : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {coluna === "NAO" && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.background,
                      }}
                    />
                  )}
                </View>
                <Text style={{ marginLeft: 12, fontSize: 16, color: colors.foreground, fontWeight: "500" }}>
                  Não
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pergunta 2 */}
          <View className="mb-8">
            <Text className="text-base font-semibold text-foreground mb-4">
              Houve substituição de chapa na guia?
            </Text>

            <View className="gap-3">
              {/* Sim */}
              <TouchableOpacity
                onPress={() => setGuia("SIM")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: guia === "SIM" ? colors.primary : colors.border,
                  backgroundColor: guia === "SIM" ? `${colors.primary}15` : colors.surface,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: guia === "SIM" ? colors.primary : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {guia === "SIM" && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.background,
                      }}
                    />
                  )}
                </View>
                <Text style={{ marginLeft: 12, fontSize: 16, color: colors.foreground, fontWeight: "500" }}>
                  Sim
                </Text>
              </TouchableOpacity>

              {/* Não */}
              <TouchableOpacity
                onPress={() => setGuia("NAO")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: guia === "NAO" ? colors.primary : colors.border,
                  backgroundColor: guia === "NAO" ? `${colors.primary}15` : colors.surface,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: guia === "NAO" ? colors.primary : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {guia === "NAO" && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.background,
                      }}
                    />
                  )}
                </View>
                <Text style={{ marginLeft: 12, fontSize: 16, color: colors.foreground, fontWeight: "500" }}>
                  Não
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View className="px-6 pb-6 gap-3">
          <TouchableOpacity
            onPress={handleProximo}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.background, fontWeight: "600", fontSize: 16 }}>Próximo →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleVoltar}
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "500", fontSize: 16 }}>Voltar para Etapas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
