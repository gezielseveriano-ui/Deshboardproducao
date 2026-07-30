import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const CHECKLISTS = [
  {
    id: "CL-ENG-1029",
    nome: "CHECKLIST – Inspeção da Lateral do Truque BARBER",
    codigo: "CL-ENG-1029/04.01",
    validoAte: "25/06/2029",
  },
  {
    id: "CL-ENG-1030",
    nome: "CHECKLIST – Inspeção da Lateral do Truque Swing Motion",
    codigo: "CL-ENG-1030/03.01",
    validoAte: "25/06/2029",
  },
  {
    id: "CL-ENG-1031",
    nome: "CHECKLIST – Inspeção da Lateral do Truque Ride Control",
    codigo: "CL-ENG-1031/03.01",
    validoAte: "25/06/2029",
  },
  {
    id: "CL-ENG-1032",
    nome: "CHECKLIST – Inspeção da Lateral do Truque Ride Master, Motion Control, Hibrido",
    codigo: "CL-ENG-1032/02.01",
    validoAte: "25/06/2029",
  },
  {
    id: "CL-ENG-1033",
    nome: "CHECKLIST – Inspeção da Travessa do Truque Ride Master, Motion Control",
    codigo: "CL-ENG-1033/06.00",
    validoAte: "12/08/2029",
  },
  {
    id: "CL-ENG-1034",
    nome: "CHECKLIST – Inspeção da Travessa do Truque Barber",
    codigo: "CL-ENG-1034/05.00",
    validoAte: "12/08/2029",
  },
  {
    id: "CL-ENG-1035",
    nome: "CHECKLIST – Inspeção da Travessa do Truque Ride Control",
    codigo: "CL-ENG-1035/06.00",
    validoAte: "12/08/2029",
  },
  {
    id: "CL-ENG-1036",
    nome: "CHECKLIST – Inspeção da Travessa do Truque Swing Motion",
    codigo: "CL-ENG-1036/04.00",
    validoAte: "12/08/2029",
  },
  {
    id: "CL-ENG-1066",
    nome: "CHECKLIST – Inspeção e Recuperação de Triângulo de Freio",
    codigo: "CL-ENG-1066/00.00",
    validoAte: "14/11/2030",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleInitiarChecklist = (checklistType: string) => {
    router.push({
      pathname: "/checklist/initial-verifications",
      params: { checklistType },
    });
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 bg-background">
          <Text className="text-4xl font-bold text-foreground">CHECKLISTS DE</Text>
          <Text className="text-4xl font-bold text-foreground">INSPEÇÃO</Text>
          <Text className="text-base text-muted mt-2">MRS – Manutenção de Vagões</Text>
        </View>

        {/* Checklists Disponíveis */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-semibold text-foreground mb-4">Checklists Disponíveis</Text>

          {CHECKLISTS.map((checklist) => (
            <View
              key={checklist.id}
              className="bg-surface rounded-lg p-4 mb-4 border border-border"
              style={{
                shadowColor: colors.border,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <Text className="text-base font-semibold text-foreground mb-2">{checklist.nome}</Text>

              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xs text-muted">Código: {checklist.codigo}</Text>
                <Text className="text-xs text-muted">Válido até: {checklist.validoAte}</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleInitiarChecklist(checklist.id)}
                className="bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Iniciar Checklist →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
