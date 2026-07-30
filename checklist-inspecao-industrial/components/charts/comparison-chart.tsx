import { View, Text, Dimensions } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ComparisonData {
  today: number;
  lastWeek: number;
  lastMonth: number;
}

interface ComparisonChartProps {
  data: ComparisonData;
  title: string;
  unit?: string;
}

export function ComparisonChart({ data, title, unit = "peças" }: ComparisonChartProps) {
  const colors = useColors();
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 48; // px-6 = 24px cada lado

  // Encontrar valor máximo para escalar o gráfico
  const maxValue = Math.max(data.today, data.lastWeek, data.lastMonth, 1);
  const scale = (chartWidth - 40) / maxValue; // -40 para labels

  // Calcular variações percentuais
  const variationLastWeek =
    data.lastWeek > 0 ? ((data.today - data.lastWeek) / data.lastWeek) * 100 : 0;
  const variationLastMonth =
    data.lastMonth > 0 ? ((data.today - data.lastMonth) / data.lastMonth) * 100 : 0;

  // Função para obter cor e ícone de tendência
  const getTrendIndicator = (variation: number) => {
    if (variation > 0) {
      return { icon: "↑", color: colors.success, text: `+${variation.toFixed(1)}%` };
    } else if (variation < 0) {
      return { icon: "↓", color: colors.error, text: `${variation.toFixed(1)}%` };
    }
    return { icon: "→", color: colors.muted, text: "0%" };
  };

  const trendLastWeek = getTrendIndicator(variationLastWeek);
  const trendLastMonth = getTrendIndicator(variationLastMonth);

  return (
    <View className="bg-surface rounded-lg p-4 mb-4 border border-border">
      {/* Título */}
      <Text className="text-base font-bold text-foreground mb-4">{title}</Text>

      {/* Gráfico de Barras */}
      <View className="flex-row items-flex-end gap-4 mb-6 h-32">
        {/* Barra - Hoje */}
        <View className="flex-1 items-center gap-2">
          <View
            className="w-full bg-primary rounded-t"
            style={{
              height: (data.today / maxValue) * 100,
            }}
          />
          <Text className="text-xs font-semibold text-foreground">{data.today}</Text>
          <Text className="text-xs text-muted">Hoje</Text>
        </View>

        {/* Barra - Semana Passada */}
        <View className="flex-1 items-center gap-2">
          <View
            className="w-full bg-blue-400 rounded-t"
            style={{
              height: (data.lastWeek / maxValue) * 100,
            }}
          />
          <Text className="text-xs font-semibold text-foreground">{data.lastWeek}</Text>
          <Text className="text-xs text-muted">Sem. Pass.</Text>
        </View>

        {/* Barra - Mês Passado */}
        <View className="flex-1 items-center gap-2">
          <View
            className="w-full bg-purple-400 rounded-t"
            style={{
              height: (data.lastMonth / maxValue) * 100,
            }}
          />
          <Text className="text-xs font-semibold text-foreground">{data.lastMonth}</Text>
          <Text className="text-xs text-muted">Mês Pass.</Text>
        </View>
      </View>

      {/* Comparações */}
      <View className="gap-3 pt-4 border-t border-border">
        {/* Comparação com Semana Passada */}
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted">vs. Semana Passada</Text>
          <View className="flex-row items-center gap-2">
            <Text
              className="text-sm font-semibold"
              style={{ color: trendLastWeek.color }}
            >
              {trendLastWeek.icon} {trendLastWeek.text}
            </Text>
          </View>
        </View>

        {/* Comparação com Mês Passado */}
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted">vs. Mês Passado</Text>
          <View className="flex-row items-center gap-2">
            <Text
              className="text-sm font-semibold"
              style={{ color: trendLastMonth.color }}
            >
              {trendLastMonth.icon} {trendLastMonth.text}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
