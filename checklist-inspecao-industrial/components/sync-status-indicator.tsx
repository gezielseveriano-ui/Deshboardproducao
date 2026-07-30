import { View, Text, ActivityIndicator } from "react-native";
import { useSync } from "@/lib/sync-context";
import { useColors } from "@/hooks/use-colors";

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingSyncCount } = useSync();
  const colors = useColors();

  if (isOnline && !isSyncing && pendingSyncCount === 0) {
    return null; // Não mostrar nada se tudo está sincronizado e online
  }

  return (
    <View className="bg-surface border-b border-border px-4 py-2 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2 flex-1">
        {/* Indicador de Status */}
        <View
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isOnline ? colors.success : colors.error,
          }}
        />

        {/* Texto de Status */}
        <Text className="text-xs font-medium text-foreground flex-1">
          {isSyncing ? (
            <Text>
              <ActivityIndicator size="small" color={colors.primary} /> Sincronizando...
            </Text>
          ) : isOnline ? (
            pendingSyncCount > 0 ? (
              `${pendingSyncCount} checklist${pendingSyncCount > 1 ? "s" : ""} aguardando sincronização`
            ) : (
              "Sincronizado"
            )
          ) : (
            `Offline - ${pendingSyncCount} checklist${pendingSyncCount > 1 ? "s" : ""} serão sincronizados`
          )}
        </Text>
      </View>

      {/* Ícone de Status */}
      {isSyncing && <ActivityIndicator size="small" color={colors.primary} />}
    </View>
  );
}
