import React from 'react';
import { View, Text } from 'react-native';

export interface HorizontalBarChartData {
  label: string;
  value: number;
  color: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarChartData[];
  maxValue?: number;
  barHeight?: number;
}

/**
 * Componente de gráfico de barras horizontais
 * Mostra distribuição de dados com labels no lado esquerdo
 * Melhor renderização em dispositivos móveis
 */
export function HorizontalBarChart({ 
  data, 
  maxValue,
  barHeight = 40 
}: HorizontalBarChartProps) {
  // Calcular valor máximo
  const max = maxValue || Math.max(...data.map(item => item.value), 1);
  
  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-muted text-sm">Sem dados para exibir</Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {data.map((item, index) => {
        const percentage = (item.value / max) * 100;
        
        return (
          <View key={index} className="gap-1">
            {/* Label com valor */}
            <View className="flex-row justify-between items-center px-2">
              <Text className="text-xs font-medium text-foreground flex-1 mr-2" numberOfLines={1}>
                {item.label}
              </Text>
              <Text className="text-xs font-semibold text-foreground min-w-[30px] text-right">
                {item.value}
              </Text>
            </View>
            
            {/* Barra horizontal */}
            <View 
              className="rounded-md overflow-hidden bg-border/30"
              style={{ height: barHeight }}
            >
              <View
                className="rounded-md"
                style={{
                  width: `${percentage}%`,
                  height: '100%',
                  backgroundColor: item.color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
