import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  maxValue?: number;
  barHeight?: number;
}

/**
 * Componente de gráfico de barras customizado
 * Mostra quantidade por executante com barras horizontais
 */
export function BarChart({ data, maxValue, barHeight = 40 }: BarChartProps) {
  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-muted text-sm">Sem dados para exibir</Text>
      </View>
    );
  }

  const max = maxValue || Math.max(...data.map((item) => item.value));
  const defaultColor = '#0a7ea4';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-4 p-4">
        {data.map((item, index) => {
          const percentage = (item.value / max) * 100;
          const color = item.color || defaultColor;

          return (
            <View key={index} className="items-center gap-2">
              {/* Barra */}
              <View className="flex-row items-end gap-2">
                <View
                  style={{
                    width: 40,
                    height: (percentage / 100) * barHeight,
                    backgroundColor: color,
                    borderRadius: 4,
                  }}
                />
              </View>

              {/* Label e valor */}
              <Text className="text-xs font-semibold text-foreground text-center w-12">
                {item.value}
              </Text>
              <Text className="text-xs text-muted text-center w-12" numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/**
 * Componente de gráfico de barras vertical (alternativa)
 */
export function VerticalBarChart({ data, maxValue, barHeight = 150 }: BarChartProps) {
  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-muted text-sm">Sem dados para exibir</Text>
      </View>
    );
  }

  const max = maxValue || Math.max(...data.map((item) => item.value));
  const defaultColor = '#0a7ea4';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-4 p-4 items-end" style={{ minHeight: barHeight + 60 }}>
        {data.map((item, index) => {
          const percentage = (item.value / max) * 100;
          const color = item.color || defaultColor;
          const height = (percentage / 100) * barHeight;

          return (
            <View key={index} className="items-center gap-2">
              {/* Barra */}
              <Text className="text-xs font-semibold text-foreground">{item.value}</Text>
              <View
                style={{
                  width: 50,
                  height: height,
                  backgroundColor: color,
                  borderRadius: 4,
                }}
              />

              {/* Label */}
              <Text className="text-xs text-muted text-center w-12" numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
