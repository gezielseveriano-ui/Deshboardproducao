import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  innerRadius?: number;
}

/**
 * Componente de gráfico de pizza customizado
 * Mostra distribuição de dados com cores e legenda
 */
export function PieChart({ data, size = 200, innerRadius = 0 }: PieChartProps) {
  const radius = size / 2;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <View className="items-center justify-center" style={{ height: size }}>
        <Text className="text-muted text-sm">Sem dados para exibir</Text>
      </View>
    );
  }

  let currentAngle = -Math.PI / 2;
  const paths: Array<{ path: string; color: string; label: string; value: number }> = [];

  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    // Calcular pontos do arco
    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    // Criar path SVG
    const pathData = [
      `M ${radius} ${radius}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    paths.push({
      path: pathData,
      color: item.color,
      label: item.label,
      value: item.value,
    });

    currentAngle = endAngle;
  });

  return (
    <View className="items-center gap-4">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((item, index) => (
          <Path key={index} d={item.path} fill={item.color} stroke="white" strokeWidth="2" />
        ))}
      </Svg>

      {/* Legenda */}
      <View className="gap-2">
        {data.map((item, index) => (
          <View key={index} className="flex-row items-center gap-2">
            <View
              className="rounded-full"
              style={{
                width: 12,
                height: 12,
                backgroundColor: item.color,
              }}
            />
            <Text className="text-xs text-foreground flex-1">{item.label}</Text>
            <Text className="text-xs font-semibold text-foreground">{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
