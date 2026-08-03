import { ScrollView, Text, View, TextInput, TouchableOpacity, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSignatures } from "@/lib/signatures-context";
import { useChecklist } from "@/lib/checklist-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";

export default function SignaturesBankScreen() {
  const colors = useColors();
  const router = useRouter();
  const signatures = useSignatures();
  const { checklist, updateAssinaturas } = useChecklist();

  const [executanteMatricula, setExecutanteMatricula] = useState(
    checklist?.assinaturas?.executante?.matricula || ""
  );
  const [executanteNome, setExecutanteNome] = useState(
    checklist?.assinaturas?.executante?.nome || ""
  );

  const [liderMatricula, setLiderMatricula] = useState(
    checklist?.assinaturas?.liderMRS?.matricula || ""
  );
  const [liderNome, setLiderNome] = useState(
    checklist?.assinaturas?.liderMRS?.nome || ""
  );

  const [inspetorMatricula, setInspetorMatricula] = useState(
    checklist?.assinaturas?.inspectorTecnico?.matricula || ""
  );
  const [inspetorNome, setInspetorNome] = useState(
    checklist?.assinaturas?.inspectorTecnico?.nome || ""
  );

  // Auto-preencher nome do executante quando matrícula é digitada
  useEffect(() => {
    if (executanteMatricula.trim()) {
      const pessoa = signatures.buscarExecutantePorMatricula(executanteMatricula);
      if (pessoa) {
        setExecutanteNome(pessoa.nomeCompleto);
        console.log('DEBUG - Executante encontrado:', pessoa.nomeCompleto);
      } else {
        setExecutanteNome("");
        console.log('DEBUG - Executante não encontrado para matrícula:', executanteMatricula);
      }
    } else {
      setExecutanteNome("");
    }
  }, [executanteMatricula, signatures]);

  // Auto-preencher nome do líder quando matrícula é digitada
  useEffect(() => {
    if (liderMatricula.trim()) {
      const pessoa = signatures.buscarLiderPorMatricula(liderMatricula);
      if (pessoa) {
        setLiderNome(pessoa.nomeCompleto);
        console.log('DEBUG - Líder encontrado:', pessoa.nomeCompleto);
      } else {
        setLiderNome("");
        console.log('DEBUG - Líder não encontrado para matrícula:', liderMatricula);
      }
    } else {
      setLiderNome("");
    }
  }, [liderMatricula, signatures]);

  // Auto-preencher nome do inspetor quando matrícula é digitada
  useEffect(() => {
    if (inspetorMatricula.trim()) {
      const pessoa = signatures.buscarInspetorPorMatricula(inspetorMatricula);
      if (pessoa) {
        setInspetorNome(pessoa.nomeCompleto);
        console.log('DEBUG - Inspetor encontrado:', pessoa.nomeCompleto);
      } else {
        setInspetorNome("");
        console.log('DEBUG - Inspetor não encontrado para matrícula:', inspetorMatricula);
      }
    } else {
      setInspetorNome("");
    }
  }, [inspetorMatricula, signatures]);

  const handleContinuar = () => {
    // Validar se todos os campos obrigatórios estão preenchidos
    if (!executanteMatricula.trim() || !executanteNome.trim()) {
      Alert.alert("Erro", "Preencha a Matrícula e Nome do Executante");
      return;
    }

    if (!liderMatricula.trim() || !liderNome.trim()) {
      Alert.alert("Erro", "Preencha a Matrícula e Nome do Líder");
      return;
    }

    // Inspetor Técnico é opcional - não validar

    // Atualizar checklist com as assinaturas
    console.log('DEBUG - Salvando assinaturas:', {
      executante: { nome: executanteNome, matricula: executanteMatricula },
      liderMRS: { nome: liderNome, matricula: liderMatricula },
      inspectorTecnico: { nome: inspetorNome, matricula: inspetorMatricula },
    });
    
    updateAssinaturas({
      executante: {
        nome: executanteNome,
        matricula: executanteMatricula,
        assinatura: "",
      },
      liderMRS: {
        nome: liderNome,
        matricula: liderMatricula,
        assinatura: "",
      },
      inspectorTecnico: {
        nome: inspetorNome,
        matricula: inspetorMatricula,
        assinatura: "",
      },
    })

    // Navegar para a tela de conclusão
    router.push("/checklist/completion");
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-4 gap-6">
          {/* Cabeçalho */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Banco de Assinaturas</Text>
            <Text className="text-sm text-muted">Preencha os dados das pessoas</Text>
          </View>

          {/* Executante */}
          <View className="bg-surface rounded-lg p-4 gap-3">
            <Text className="text-lg font-semibold text-foreground">EXECUTANTE</Text>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Matrícula</Text>
              <TextInput
                placeholder="Digite a matrícula"
                value={executanteMatricula}
                onChangeText={setExecutanteMatricula}
                className="border border-border rounded-lg p-3 text-foreground"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Nome</Text>
              <TextInput
                placeholder="Nome será preenchido automaticamente"
                value={executanteNome}
                editable={false}
                className="border border-border rounded-lg p-3 text-foreground bg-muted/10"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Líder */}
          <View className="bg-surface rounded-lg p-4 gap-3">
            <Text className="text-lg font-semibold text-foreground">LIBERAÇÃO LÍDER</Text>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Matrícula (opcional)</Text>
              <TextInput
                placeholder="Digite a matrícula"
                value={liderMatricula}
                onChangeText={setLiderMatricula}
                className="border border-border rounded-lg p-3 text-foreground"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Nome</Text>
              <TextInput
                placeholder="Nome será preenchido automaticamente"
                value={liderNome}
                editable={false}
                className="border border-border rounded-lg p-3 text-foreground bg-muted/10"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Inspetor */}
          <View className="bg-surface rounded-lg p-4 gap-3">
            <Text className="text-lg font-semibold text-foreground">LIBERAÇÃO INSPETOR TÉCNICO</Text>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Matrícula (opcional)</Text>
              <TextInput
                placeholder="Digite a matrícula"
                value={inspetorMatricula}
                onChangeText={setInspetorMatricula}
                className="border border-border rounded-lg p-3 text-foreground"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Nome</Text>
              <TextInput
                placeholder="Nome será preenchido automaticamente"
                value={inspetorNome}
                editable={false}
                className="border border-border rounded-lg p-3 text-foreground bg-muted/10"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Botões */}
          <View className="gap-2 mt-4">
            <TouchableOpacity
              onPress={handleContinuar}
              className="bg-primary rounded-lg p-4"
            >
              <Text className="text-center text-background font-semibold text-base">
                Continuar →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-border rounded-lg p-4"
            >
              <Text className="text-center text-foreground font-semibold text-base">
                Voltar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
