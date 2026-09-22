import { TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface RefreshButtonProps {
  color?: string;
  size?: number;
}

// Recarrega a página inteira - garante que o usuário sempre pega a versão
// mais recente do app (e dos dados), sem precisar fechar e reabrir. Útil
// principalmente no app instalado (PWA) no Windows/Android, que não tem a
// barra do navegador com um botão de atualizar como uma aba normal.
export function RefreshButton({ color = "#ffffff", size = 24 }: RefreshButtonProps) {
  const handleRefresh = () => {
    if (typeof window !== "undefined" && window.location) {
      window.location.reload();
    }
  };

  return (
    <TouchableOpacity onPress={handleRefresh} className="p-2" accessibilityLabel="Atualizar">
      <MaterialIcons name="refresh" size={size} color={color} />
    </TouchableOpacity>
  );
}
