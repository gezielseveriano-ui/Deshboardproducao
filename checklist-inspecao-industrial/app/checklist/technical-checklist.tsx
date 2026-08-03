import { ScrollView, Text, View, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useChecklist } from "@/lib/checklist-context";
import { useState } from "react";
import { ResultadoEtapa } from "@/lib/types";
import { getChecklistConfig, ChecklistType } from "@/lib/checklist-configs";

export default function TechnicalChecklistScreen() {
  const router = useRouter();
  const { checklist, updateEtapa } = useChecklist();
  const [currentEtapaIndex, setCurrentEtapaIndex] = useState(0);
  const [resultado, setResultado] = useState<ResultadoEtapa | null>(null);
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [naoAplicavelMedidas, setNaoAplicavelMedidas] = useState<Record<string, boolean>>({});
  const [error, setError] = useState(false);

  if (!checklist) {
    return (
      <ScreenContainer className="p-6">
        <Text className="text-foreground text-center mt-10">Carregando checklist...</Text>
      </ScreenContainer>
    );
  }

  // Buscar configuração completa do checklist (com Sistema, Subsistema, Atividade, Resultado Esperado)
  const checklistType = (checklist as any).checklistType as ChecklistType;
  const config = getChecklistConfig(checklistType);
  const totalEtapas = config.etapas.length;
  const etapaConfig = config.etapas[currentEtapaIndex];
  const currentEtapa = checklist.etapas[currentEtapaIndex];

  const handleResultadoChange = (value: ResultadoEtapa) => {
    setResultado(value);
    setError(false);
  };

  const handleMedidaChange = (medidaId: string, value: string) => {
    setMedidas((prev) => ({
      ...prev,
      [medidaId]: value,
    }));
  };

  const handleNaoAplicavel = (medidaId: string, checked: boolean) => {
    setNaoAplicavelMedidas((prev) => ({
      ...prev,
      [medidaId]: checked,
    }));
    if (checked) {
      setMedidas((prev) => ({
        ...prev,
        [medidaId]: "",
      }));
    }
  };

  const handleNext = () => {
    if (!resultado) {
      setError(true);
      return;
    }

    // Validar medidas obrigatórias
    if (resultado !== "NAO_APLICAVEL" && currentEtapa && currentEtapa.medidas.length > 0) {
      const medidasFaltando = currentEtapa.medidas.some((medida) => {
        const isNA = naoAplicavelMedidas[medida.id];
        const valor = medidas[medida.id]?.trim();
        return !isNA && !valor;
      });

      if (medidasFaltando) {
        alert("Por favor, preencha todas as medidas ou marque como N/A");
        return;
      }
    }

    updateEtapa(etapaConfig.numero, resultado, medidas);

    if (currentEtapaIndex < totalEtapas - 1) {
      setCurrentEtapaIndex(currentEtapaIndex + 1);
      // Carregar dados da próxima etapa se já preenchidos
      const nextEtapa = checklist.etapas[currentEtapaIndex + 1];
      if (nextEtapa && nextEtapa.resultado) {
        setResultado(nextEtapa.resultado);
        const nextMedidas: Record<string, string> = {};
        const nextNA: Record<string, boolean> = {};
        nextEtapa.medidas.forEach((med) => {
          if (med.valor) nextMedidas[med.id] = med.valor;
          if (med.naoAplicavel) nextNA[med.id] = true;
        });
        setMedidas(nextMedidas);
        setNaoAplicavelMedidas(nextNA);
      } else {
        setResultado(null);
        setMedidas({});
        setNaoAplicavelMedidas({});
      }
      setError(false);
    } else if (checklistType === "CL-ENG-1066") {
      // Checklist de Triângulo de Freio não tem a página "Pergunta Final" -
      // essas perguntas (substituição de chapa na coluna/guia) não se
      // aplicam a esse processo, só a Laterais e Travessas.
      router.push("/checklist/signatures-bank" as any);
    } else {
      router.push("/checklist/final-questions" as any);
    }
  };

  const handlePrevious = () => {
    if (currentEtapaIndex > 0) {
      if (resultado) {
        updateEtapa(etapaConfig.numero, resultado, medidas);
      }

      setCurrentEtapaIndex(currentEtapaIndex - 1);
      const prevEtapa = checklist.etapas[currentEtapaIndex - 1];
      if (prevEtapa && prevEtapa.resultado) {
        setResultado(prevEtapa.resultado);
        const prevMedidas: Record<string, string> = {};
        prevEtapa.medidas.forEach((med) => {
          if (med.valor) prevMedidas[med.id] = med.valor;
        });
        setMedidas(prevMedidas);
      } else {
        setResultado(null);
        setMedidas({});
      }
      setNaoAplicavelMedidas({});
      setError(false);
    }
  };

  const handleGoHome = () => {
    router.replace("/(tabs)" as any);
  };

  const progressPercent = ((currentEtapaIndex + 1) / totalEtapas) * 100;

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>

          {/* Voltar para Home */}
          <TouchableOpacity onPress={handleGoHome} style={styles.homeButton}>
            <Text style={styles.homeButtonText}>Voltar para Home</Text>
          </TouchableOpacity>

          {/* Header com progresso */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>
              ETAPA {currentEtapaIndex + 1} de {totalEtapas}
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>

          {/* Card teal com informações da etapa */}
          <View style={styles.etapaCard}>
            <Text style={styles.etapaCardTitle}>
              ETAPA {etapaConfig.numero}
            </Text>
            <View style={styles.etapaCardDivider} />
            <Text style={styles.etapaCardSistema}>
              Sistema: {etapaConfig.sistema}
            </Text>
            <Text style={styles.etapaCardSubsistema}>
              Subsistema: {etapaConfig.subsistema}
            </Text>
          </View>

          {/* ATIVIDADE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ATIVIDADE</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionText}>
                {etapaConfig.atividade}
              </Text>
            </View>
          </View>

          {/* RESULTADO ESPERADO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RESULTADO ESPERADO</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionText}>
                {etapaConfig.resultadoEsperado}
              </Text>
            </View>
          </View>

          {/* RESULTADO ENCONTRADO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              RESULTADO ENCONTRADO {error && <Text style={styles.errorText}>*</Text>}
            </Text>
            {error && (
              <Text style={styles.errorMessage}>Selecione um resultado</Text>
            )}

            {/* OK */}
            <TouchableOpacity
              onPress={() => handleResultadoChange("OK")}
              style={[
                styles.resultOption,
                resultado === "OK" && styles.resultOptionOk,
              ]}
            >
              <View style={styles.resultOptionRow}>
                <View
                  style={[
                    styles.radioCircle,
                    resultado === "OK" && styles.radioCircleOk,
                  ]}
                >
                  {resultado === "OK" && (
                    <Text style={styles.radioCheck}>✓</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.resultOptionLabel,
                    resultado === "OK" && { color: "#16a34a" },
                  ]}
                >
                  OK
                </Text>
              </View>
            </TouchableOpacity>

            {/* NÃO OK */}
            <TouchableOpacity
              onPress={() => handleResultadoChange("NAO_OK")}
              style={[
                styles.resultOption,
                resultado === "NAO_OK" && styles.resultOptionNaoOk,
              ]}
            >
              <View style={styles.resultOptionRow}>
                <View
                  style={[
                    styles.radioCircle,
                    resultado === "NAO_OK" && styles.radioCircleNaoOk,
                  ]}
                >
                  {resultado === "NAO_OK" && (
                    <Text style={styles.radioCheck}>✗</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.resultOptionLabel,
                    resultado === "NAO_OK" && { color: "#dc2626" },
                  ]}
                >
                  NÃO OK
                </Text>
              </View>
            </TouchableOpacity>

            {/* NÃO APLICÁVEL */}
            <TouchableOpacity
              onPress={() => handleResultadoChange("NAO_APLICAVEL")}
              style={[
                styles.resultOption,
                resultado === "NAO_APLICAVEL" && styles.resultOptionNa,
              ]}
            >
              <View style={styles.resultOptionRow}>
                <View
                  style={[
                    styles.radioCircle,
                    resultado === "NAO_APLICAVEL" && styles.radioCircleNa,
                  ]}
                >
                  {resultado === "NAO_APLICAVEL" && (
                    <Text style={styles.radioCheckDash}>—</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.resultOptionLabel,
                    resultado === "NAO_APLICAVEL" && { color: "#6b7280" },
                  ]}
                >
                  NÃO APLICÁVEL
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Nota informativa para Não Aplicável */}
          {resultado === "NAO_APLICAVEL" && (
            <View style={styles.naNote}>
              <Text style={styles.naNoteText}>
                Esta etapa será marcada como Não Aplicável. Os campos de medidas não são necessários.
              </Text>
            </View>
          )}

          {/* MEDIDAS (apenas se resultado não for NÃO APLICÁVEL e tiver medidas) */}
          {resultado !== "NAO_APLICAVEL" &&
            etapaConfig.medidas.length > 0 &&
            currentEtapa && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MEDIDAS</Text>
                {currentEtapa.medidas.map((medida) => (
                  <View key={medida.id} style={styles.medidaRow}>
                    <View style={styles.medidaHeader}>
                      <Text style={styles.medidaLabel}>
                        {medida.unidade ? `${medida.label} (${medida.unidade})` : medida.label}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          handleNaoAplicavel(
                            medida.id,
                            !naoAplicavelMedidas[medida.id]
                          )
                        }
                        style={styles.naCheckRow}
                      >
                        <View
                          style={[
                            styles.naCheckbox,
                            naoAplicavelMedidas[medida.id] && styles.naCheckboxChecked,
                          ]}
                        >
                          {naoAplicavelMedidas[medida.id] && (
                            <Text style={styles.naCheckboxText}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.naLabel}>N/A</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      placeholder="Digite o valor"
                      value={medidas[medida.id] || ""}
                      onChangeText={(value) =>
                        handleMedidaChange(medida.id, value)
                      }
                      editable={!naoAplicavelMedidas[medida.id]}
                      style={[
                        styles.medidaInput,
                        naoAplicavelMedidas[medida.id] && styles.medidaInputDisabled,
                      ]}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
              </View>
            )}

          {/* NÃO APLICÁVEL - quando etapa não tem medidas */}
          {resultado !== "NAO_APLICAVEL" && etapaConfig.medidas.length === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MEDIDAS</Text>
              <View style={styles.naoAplicavelMedidasCard}>
                <Text style={styles.naoAplicavelMedidasText}>Não Aplicável</Text>
              </View>
            </View>
          )}

          {/* Botões de navegação */}
          <View style={styles.navButtons}>
            <TouchableOpacity
              onPress={handlePrevious}
              style={[
                styles.navButtonPrev,
                currentEtapaIndex === 0 && { opacity: 0.4 },
              ]}
              disabled={currentEtapaIndex === 0}
            >
              <Text style={styles.navButtonPrevText}>← Anterior</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={styles.navButtonNext}
            >
              <Text style={styles.navButtonNextText}>
                {currentEtapaIndex < totalEtapas - 1
                  ? "Próxima →"
                  : "Finalizar →"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  homeButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  homeButtonText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
  progressSection: {
    gap: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#0e7c86",
    borderRadius: 4,
  },
  etapaCard: {
    backgroundColor: "#0e7c86",
    borderRadius: 12,
    padding: 20,
    gap: 4,
  },
  etapaCardTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  etapaCardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 8,
  },
  etapaCardSistema: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    fontWeight: "700",
  },
  etapaCardSubsistema: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
    letterSpacing: 0.8,
  },
  sectionCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  errorText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  errorMessage: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: -4,
  },
  resultOption: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    marginTop: 4,
  },
  resultOptionOk: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  resultOptionNaoOk: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  resultOptionNa: {
    borderColor: "#6b7280",
    backgroundColor: "#f9fafb",
  },
  resultOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleOk: {
    borderColor: "#16a34a",
    backgroundColor: "#16a34a",
  },
  radioCircleNaoOk: {
    borderColor: "#dc2626",
    backgroundColor: "#dc2626",
  },
  radioCircleNa: {
    borderColor: "#6b7280",
    backgroundColor: "#6b7280",
  },
  radioCheck: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  radioCheckDash: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    marginTop: -2,
  },
  resultOptionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  naNote: {
    backgroundColor: "#0e7c86",
    borderRadius: 10,
    padding: 16,
  },
  naNoteText: {
    color: "#ffffff",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 20,
  },
  medidaRow: {
    gap: 8,
    marginTop: 4,
  },
  medidaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medidaLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  naCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  naCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  naCheckboxChecked: {
    borderColor: "#0e7c86",
    backgroundColor: "#0e7c86",
  },
  naCheckboxText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  naLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  medidaInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  medidaInputDisabled: {
    backgroundColor: "#f3f4f6",
    opacity: 0.5,
  },
  navButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  navButtonPrev: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  navButtonPrevText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },
  navButtonNext: {
    flex: 1,
    backgroundColor: "#0e7c86",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  navButtonNextText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  naoAplicavelMedidasCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  naoAplicavelMedidasText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "center",
  },
});
