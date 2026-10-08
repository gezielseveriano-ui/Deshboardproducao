import { Text, TouchableOpacity, View } from "react-native";
import { useReports } from "@/lib/reports-context";

// Aviso visível (não só no console) quando o armazenamento local do
// aparelho está tão cheio que nem os dados pendentes de sincronização
// conseguem ser salvos - sem isso, essa falha passava despercebida até
// alguém notar, dias depois, que um checklist nunca chegou no servidor.
export function StorageWarningBanner() {
  const { storageWarning, dismissStorageWarning } = useReports();

  if (!storageWarning) return null;

  return (
    <View
      className="bg-error px-4 py-3 flex-row items-center justify-between"
      style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 999 }}
    >
      <Text className="text-white font-semibold flex-1 mr-3" numberOfLines={3}>
        ⚠️ Armazenamento cheio: {storageWarning} Libere espaço neste aparelho (apague fotos/apps não usados) o quanto antes.
      </Text>
      <TouchableOpacity onPress={dismissStorageWarning} className="px-2 py-1">
        <Text className="text-white font-bold">✕</Text>
      </TouchableOpacity>
    </View>
  );
}
