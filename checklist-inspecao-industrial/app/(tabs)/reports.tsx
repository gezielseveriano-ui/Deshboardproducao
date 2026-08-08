import React from "react";
import { ScreenContainer } from "@/components/screen-container";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import { useColors } from "@/hooks/use-colors";
import { useReports } from "@/lib/reports-context";
import { useState, useMemo } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator } from "react-native";
import { ModeloResumo, ExecutanteResumoAgrupado, ModeloDetalhes, ExecutanteDetalhes, DateFilterType, DateRange } from "@/lib/reports-types";
import { CategoriaResumo, ExecutanteCategoriaResumo } from "@/lib/reports-types";
import { generateProductionReportPDF } from "@/lib/production-report-pdf";
import { Calendar } from "react-native-calendars";
import { PieChart } from "@/components/charts/pie-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { VerticalBarChart } from "@/components/charts/bar-chart";
import { ComparisonChart } from "@/components/charts/comparison-chart";
// Exportação em Excel removida - usar Dashboard web para Excel

export default function ReportsScreen() {
  const colors = useColors();
  const { completedChecklists } = useReports();
  const [dateFilter, setDateFilter] = useState<DateFilterType>("week");
  const [customDate, setCustomDate] = useState<{ 
    day?: number; 
    month?: number; 
    year?: number;
    startDay?: number;
    startMonth?: number;
    startYear?: number;
    endDay?: number;
    endMonth?: number;
    endYear?: number;
  }>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // Exportação em Excel removida
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [inputDate, setInputDate] = useState("");
  const [selectedExecutante, setSelectedExecutante] = useState<ExecutanteDetalhes | null>(null);
  const [selectedModelo, setSelectedModelo] = useState<ModeloDetalhes | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Formatar data para exibição
  const formatDate = (date: Date): string => {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  // Data usada em todos os filtros/comparações por período: a "Data da
  // Recuperação" digitada pelo inspetor (não o timestamp real de quando o
  // checklist foi salvo) - de propósito, pra um checklist lançado
  // retroativamente (inspetor esqueceu de fazer no dia certo) contar na
  // data retroativa informada, não no dia em que preencheu o formulário.
  const getRecordDate = (record: { dataRecuperacao: string }): Date => {
    const [day, month, year] = record.dataRecuperacao.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Calcular dados de comparação
  const getComparisonData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todayCount = completedChecklists.filter(
      (c) => getRecordDate(c) >= todayStart && getRecordDate(c) < todayEnd
    ).length;
    const lastWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekCount = completedChecklists.filter(
      (c) => getRecordDate(c) >= lastWeekStart && getRecordDate(c) < lastWeekEnd
    ).length;
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthCount = completedChecklists.filter(
      (c) => getRecordDate(c) >= lastMonthStart && getRecordDate(c) < lastMonthEnd
    ).length;
    return { today: todayCount, lastWeek: lastWeekCount, lastMonth: lastMonthCount };
  };

  // Calcular range de datas baseado no filtro
  const getDateRange = (): DateRange => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Usar semana selecionada ou semana atual
    let startOfWeek = selectedWeekStart ? new Date(selectedWeekStart) : new Date(today);
    if (!selectedWeekStart) {
      const day = today.getDay();
      const diff = today.getDate() - day;
      startOfWeek.setDate(diff);
    }
    startOfWeek.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case "today":
        return {
          startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          label: `Hoje - ${formatDate(today)}`,
        };
      case "week": {
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        return {
          startDate: startOfWeek,
          endDate: endOfWeek,
          label: `${formatDate(startOfWeek)} até ${formatDate(endOfWeek)}`,
        };
      }
      case "month":
        return {
          startDate: startOfMonth,
          endDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          label: `Este Mês`,
        };
      case "year":
        return {
          startDate: startOfYear,
          endDate: new Date(today.getFullYear() + 1, 0, 1),
          label: `Este Ano`,
        };
      case "custom":
        if (customDate.day && customDate.month && customDate.year) {
          const customDay = customDate.day;
          const customMonth = customDate.month - 1;
          const customYear = customDate.year;
          const customDateObj = new Date(customYear, customMonth, customDay);
          return {
            startDate: customDateObj,
            endDate: new Date(customYear, customMonth, customDay + 1),
            label: `${customDay}/${customDate.month}/${customYear}`,
          };
        }
        // Se houver período customizado com data inicial e final
        if (customDate.startDay && customDate.startMonth && customDate.startYear && 
            customDate.endDay && customDate.endMonth && customDate.endYear) {
          const startDate = new Date(customDate.startYear, customDate.startMonth - 1, customDate.startDay);
          const endDate = new Date(customDate.endYear, customDate.endMonth - 1, customDate.endDay + 1);
          return {
            startDate,
            endDate,
            label: `${customDate.startDay}/${customDate.startMonth}/${customDate.startYear} até ${customDate.endDay}/${customDate.endMonth}/${customDate.endYear}`,
          };
        }
        return {
          startDate: startOfMonth,
          endDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          label: `Este Mês`,
        };
      default:
        return {
          startDate: startOfMonth,
          endDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          label: `Este Mês`,
        };
    }
  };

  const dateRange = getDateRange();

  // Filtrar checklists pela data
  const filteredChecklists = useMemo(() => {
    return completedChecklists.filter((record) => {
      const recordDate = getRecordDate(record);
      return recordDate >= dateRange.startDate && recordDate < dateRange.endDate;
    });
  }, [completedChecklists, dateRange]);

  // Gerar resumo por modelo (agrupado)
  const modeloResumo = useMemo(() => {
    const map = new Map<string, { modelo: string; quantidade: number; checklistCode: string; dataRecuperacao: string; categoria: string }>();
    filteredChecklists.forEach((record) => {
      const key = `${record.categoria}:${record.modelo}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantidade += 1;
        // Atualizar para data mais recente
        const existingDate = new Date(existing.dataRecuperacao);
        const recordDate = new Date(record.dataRecuperacao);
        if (recordDate > existingDate) {
          existing.dataRecuperacao = record.dataRecuperacao;
        }
      } else {
        map.set(key, {
          modelo: record.modelo,
          quantidade: 1,
          checklistCode: record.checklistCode,
          dataRecuperacao: record.dataRecuperacao,
          categoria: record.categoria,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredChecklists]);

  // Gerar resumo por executante (agrupado)
  const executanteResumo = useMemo(() => {
    const map = new Map<string, { executanteName: string; executanteMatricula: string; quantidadeTotal: number; dataExecucao: string }>();
    filteredChecklists.forEach((record) => {
      const key = record.executanteName;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantidadeTotal += 1;
        // Atualizar para data mais recente
        const existingDate = new Date(existing.dataExecucao);
        const recordDate = new Date(record.dataRecuperacao);
        if (recordDate > existingDate) {
          existing.dataExecucao = record.dataRecuperacao;
        }
      } else {
        map.set(key, {
          executanteName: record.executanteName,
          executanteMatricula: record.executanteMatricula,
          quantidadeTotal: 1,
          dataExecucao: record.dataRecuperacao,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);
  }, [filteredChecklists]);

  // Total por categoria, independente do modelo (ex: Triângulo: 50, Lateral: 30)
  const categoriaResumo = useMemo((): CategoriaResumo[] => {
    const map = new Map<string, number>();
    filteredChecklists.forEach((record) => {
      map.set(record.categoria, (map.get(record.categoria) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([categoria, quantidade]) => ({ categoria, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredChecklists]);

  // Produção por executante, agrupada por categoria (sem entrar no modelo) -
  // ex: Alex fez 15 Laterais e 8 Triângulos
  const executanteCategoriaResumo = useMemo((): ExecutanteCategoriaResumo[] => {
    const map = new Map<string, { executanteName: string; executanteMatricula: string; categoria: string; quantidade: number; dataExecucao: string }>();
    filteredChecklists.forEach((record) => {
      const key = `${record.executanteName}:::${record.categoria}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantidade += 1;
        const existingDate = new Date(existing.dataExecucao);
        const recordDate = new Date(record.dataRecuperacao);
        if (recordDate > existingDate) {
          existing.dataExecucao = record.dataRecuperacao;
        }
      } else {
        map.set(key, {
          executanteName: record.executanteName,
          executanteMatricula: record.executanteMatricula,
          categoria: record.categoria,
          quantidade: 1,
          dataExecucao: record.dataRecuperacao,
        });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => a.executanteName.localeCompare(b.executanteName) || b.quantidade - a.quantidade
    );
  }, [filteredChecklists]);

  // Obter detalhes de um executante (quais modelos fez)
  const getExecutanteDetalhes = (executanteName: string): ExecutanteDetalhes => {
    const records = filteredChecklists.filter((r) => r.executanteName === executanteName);
    const modeloMap = new Map<string, { modelo: string; quantidade: number; dataRecuperacao: string }>();

    records.forEach((record) => {
      const key = record.modelo;
      if (modeloMap.has(key)) {
        const existing = modeloMap.get(key)!;
        existing.quantidade += 1;
        const existingDate = new Date(existing.dataRecuperacao);
        const recordDate = new Date(record.dataRecuperacao);
        if (recordDate > existingDate) {
          existing.dataRecuperacao = record.dataRecuperacao;
        }
      } else {
        modeloMap.set(key, {
          modelo: record.modelo,
          quantidade: 1,
          dataRecuperacao: record.dataRecuperacao,
        });
      }
    });

    const executante = executanteResumo.find((e) => e.executanteName === executanteName);
    return {
      executanteName,
      executanteMatricula: executante?.executanteMatricula || "",
      modelos: Array.from(modeloMap.values()),
      quantidadeTotal: records.length,
    };
  };

  // Obter detalhes de um modelo (quais executantes fizeram)
  const getModeloDetalhes = (modelo: string): ModeloDetalhes => {
    const records = filteredChecklists.filter((r) => r.modelo === modelo);
    const executanteMap = new Map<string, { executanteName: string; executanteMatricula: string; quantidade: number; dataRecuperacao: string }>();

    records.forEach((record) => {
      const key = record.executanteName;
      if (executanteMap.has(key)) {
        const existing = executanteMap.get(key)!;
        existing.quantidade += 1;
        const existingDate = new Date(existing.dataRecuperacao);
        const recordDate = new Date(record.dataRecuperacao);
        if (recordDate > existingDate) {
          existing.dataRecuperacao = record.dataRecuperacao;
        }
      } else {
        executanteMap.set(key, {
          executanteName: record.executanteName,
          executanteMatricula: record.executanteMatricula,
          quantidade: 1,
          dataRecuperacao: record.dataRecuperacao,
        });
      }
    });

    const modeloItem = modeloResumo.find((m) => m.modelo === modelo);
    return {
      modelo,
      checklistCode: modeloItem?.checklistCode || "",
      executantes: Array.from(executanteMap.values()),
      quantidadeTotal: records.length,
    };
  };

  const handleSelectDate = () => {
    // Parse data no formato DD/MM/YYYY
    const parts = inputDate.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);

      if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
        const selectedDate = new Date(year, month - 1, day);
        selectedDate.setHours(0, 0, 0, 0);

        // Calcular início da semana (segunda-feira)
        const dayOfWeek = selectedDate.getDay();
        const diff = selectedDate.getDate() - dayOfWeek;
        const weekStart = new Date(year, month - 1, diff);
        weekStart.setHours(0, 0, 0, 0);

        setSelectedWeekStart(weekStart);
        setShowDatePicker(false);
        setInputDate("");
      } else {
        Alert.alert("Erro", "Data inválida. Use o formato DD/MM/YYYY");
      }
    } else {
      Alert.alert("Erro", "Use o formato DD/MM/YYYY");
    }
  };

  const handleSelectCustomDateRange = () => {
    // Parse datas no formato DD/MM/YYYY
    const startParts = customDateStart.split("/");
    const endParts = customDateEnd.split("/");

    if (startParts.length === 3 && endParts.length === 3) {
      const startDay = parseInt(startParts[0]);
      const startMonth = parseInt(startParts[1]);
      const startYear = parseInt(startParts[2]);
      const endDay = parseInt(endParts[0]);
      const endMonth = parseInt(endParts[1]);
      const endYear = parseInt(endParts[2]);

      // Validar datas
      if (startDay > 0 && startDay <= 31 && startMonth > 0 && startMonth <= 12 && startYear > 1900 &&
          endDay > 0 && endDay <= 31 && endMonth > 0 && endMonth <= 12 && endYear > 1900) {
        
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);

        // Validar que data inicial não é posterior à final
        if (startDate > endDate) {
          Alert.alert("Erro", "A data inicial deve ser anterior ou igual à data final");
          return;
        }

        // Salvar período customizado
        setCustomDate({
          startDay,
          startMonth,
          startYear,
          endDay,
          endMonth,
          endYear,
        });
        setDateFilter("custom");
        setShowCustomDatePicker(false);
        setCustomDateStart("");
        setCustomDateEnd("");
      } else {
        Alert.alert("Erro", "Datas inválidas. Use o formato DD/MM/YYYY");
      }
    } else {
      Alert.alert("Erro", "Use o formato DD/MM/YYYY para ambas as datas");
    }
  };

  const handleNavigateWeek = (direction: "prev" | "next") => {
    const current = selectedWeekStart || new Date();
    const newDate = new Date(current);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setSelectedWeekStart(newDate);
  };

  // Exportação em Excel removida - usar Dashboard web para Excel;

  const handleGerarRelatorioPDF = async () => {
    try {
      setIsGeneratingPDF(true);

      await generateProductionReportPDF({
        periodo: dateRange.label,
        dataGeracao: new Date().toLocaleDateString("pt-BR"),
        categoriaResumo,
        modeloResumo,
        executanteCategoriaResumo,
        totalChecklists: filteredChecklists.length,
      });

      setIsGeneratingPDF(false);
    } catch (error) {
      console.error("Erro ao gerar relatorio PDF:", error);
      Alert.alert("Erro", "Nao foi possivel gerar o relatorio. Tente novamente.");
      setIsGeneratingPDF(false);
    }
  };

  const totalQuantidade = modeloResumo.reduce((sum, item) => sum + item.quantidade, 0);

  // Cores para gráficos
  const chartColors = [
    '#0a7ea4', // primary
    '#22C55E', // success
    '#F59E0B', // warning
    '#EF4444', // error
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  // Preparar dados para gráfico de pizza (modelo)
  const pieChartData = useMemo(() => {
    const modeloMap: Record<string, string> = {
      '1': 'Ride Master',
      '2': 'Ride Control',
      '3': 'Laterais Usinadas 6,5 x 12',
      '4': 'Laterais Usinadas 6 x 11',
      '5': 'BARBER',
      '6': 'Swing Motion',
      '7': 'Travessa RM/MC',
      '8': 'Travessa Swing Motion',
    };
    
    return modeloResumo.slice(0, 8).map((item, index) => {
      let modeloLabel = String(item.modelo).trim();
      
      // Se for um numero, mapear para o nome completo
      if (modeloMap[modeloLabel]) {
        modeloLabel = modeloMap[modeloLabel];
      }
      
      // Adicionar prefixo de categoria para diferenciar Lateral vs Travessa
      const labelComCategoria = `${item.categoria} - ${modeloLabel}`;
      
      return {
        label: labelComCategoria || 'Desconhecido',
        value: item.quantidade,
        color: chartColors[index % chartColors.length],
      };
    });
  }, [modeloResumo]);


  // Preparar dados para gráfico de barras (executante)
  const barChartData = useMemo(() => {
    return executanteResumo.slice(0, 10).map((item, index) => ({
      label: item.executanteName.substring(0, 10),
      value: item.quantidadeTotal,
      color: chartColors[index % chartColors.length],
    }));
  }, [executanteResumo]);

  return (
    <ScreenContainer className="p-0">
      <SyncStatusIndicator />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        {/* Header */}
        <View className="bg-primary px-6 py-4">
          <Text className="text-2xl font-bold text-white">Relatórios</Text>
          <Text className="text-sm text-white/80 mt-1">Controle de Checklists Completados</Text>
        </View>

        {/* Filtros de Data */}
        <View className="px-6 py-4 border-b border-border">
          {/* Navegação de Semana */}
          {dateFilter === "week" && selectedWeekStart && (
            <View className="flex-row justify-between items-center mb-3 gap-2">
              <TouchableOpacity
                onPress={() => handleNavigateWeek("prev")}
                className="bg-surface border border-border px-3 py-2 rounded"
              >
                <Text className="text-foreground font-semibold">← Semana Anterior</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedWeekStart(null)}
                className="bg-surface border border-border px-3 py-2 rounded"
              >
                <Text className="text-foreground font-semibold text-xs">Semana Atual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNavigateWeek("next")}
                className="bg-surface border border-border px-3 py-2 rounded"
              >
                <Text className="text-foreground font-semibold">Próxima Semana →</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row gap-2 flex-wrap">
            {(["today", "week", "month", "year"] as DateFilterType[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => {
                  setDateFilter(filter);
                  if (filter !== "week") {
                    setSelectedWeekStart(null);
                  }
                }}
                className={`px-4 py-2 rounded-full ${
                  dateFilter === filter ? "bg-primary" : "bg-surface border border-border"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    dateFilter === filter ? "text-white" : "text-foreground"
                  }`}
                >
                  {filter === "today"
                    ? "Hoje"
                    : filter === "week"
                    ? "Semana"
                    : filter === "month"
                    ? "Mês"
                    : "Ano"}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowCustomDatePicker(true)}
              className={`px-4 py-2 rounded-full ${
                dateFilter === "custom" ? "bg-primary" : "bg-surface border border-border"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  dateFilter === "custom" ? "text-white" : "text-foreground"
                }`}
              >
                📅 Período
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cards de Estatísticas */}
        <View className="px-6 py-4 flex-row gap-3">
          <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
            <Text className="text-2xl font-bold text-primary">{totalQuantidade}</Text>
            <Text className="text-xs text-muted mt-1">Total de Peças</Text>
          </View>
          <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
            <Text className="text-2xl font-bold text-primary">{modeloResumo.length}</Text>
            <Text className="text-xs text-muted mt-1">Total de Modelos</Text>
          </View>
          <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
            <Text className="text-2xl font-bold text-primary">{executanteResumo.length}</Text>
            <Text className="text-xs text-muted mt-1">Total de Executantes</Text>
          </View>
        </View>

        {/* Seção: Gráficos */}
        {modeloResumo.length > 0 && (
          <View className="px-6 py-4 gap-6">
            {/* Gráfico Comparativo */}
            <ComparisonChart
              data={getComparisonData()}
              title="Comparação de Produção"
              unit="checklists"
            />

            {/* Gráfico de Barras Horizontais - Distribuição por Modelo */}
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-base font-bold text-foreground mb-4">Distribuição por Modelo</Text>
              <HorizontalBarChart data={pieChartData} />
            </View>

            {/* Gráfico de Barras - Quantidade por Executante */}
            {executanteResumo.length > 0 && (
              <View className="bg-surface rounded-lg p-4 border border-border">
                <Text className="text-base font-bold text-foreground mb-4">Quantidade por Executante</Text>
                <VerticalBarChart data={barChartData} />
              </View>
            )}
          </View>
        )}

        {/* Seção: Resumo por Modelo */}
        <View className="px-6 py-4">
          <Text className="text-lg font-bold text-foreground mb-4">Resumo por Modelo</Text>
          {modeloResumo.length === 0 ? (
            <Text className="text-center text-muted py-8">Nenhum checklist completado neste período</Text>
          ) : (
            <View className="gap-3">
              {modeloResumo.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedModelo(getModeloDetalhes(item.modelo))}
                  className="bg-surface rounded-lg p-4 border border-border active:opacity-70"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-sm text-muted mb-1">{item.checklistCode}</Text>
                      <Text className="text-base font-semibold text-foreground">{item.modelo}</Text>
                      <Text className="text-xs text-muted mt-2">Data: {item.dataRecuperacao}</Text>
                    </View>
                    <View className="bg-primary rounded-full px-4 py-2">
                      <Text className="text-white font-bold text-lg">{item.quantidade}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Seção: Resumo por Executante */}
        <View className="px-6 py-4">
          <Text className="text-lg font-bold text-foreground mb-4">Resumo por Executante</Text>
          {executanteResumo.length === 0 ? (
            <Text className="text-center text-muted py-8">Nenhum checklist completado neste período</Text>
          ) : (
            <View className="gap-3">
              {executanteResumo.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedExecutante(getExecutanteDetalhes(item.executanteName))}
                  className="bg-surface rounded-lg p-4 border border-border active:opacity-70"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">{item.executanteName}</Text>
                      <Text className="text-xs text-muted mt-1">Matrícula: {item.executanteMatricula}</Text>
                      <Text className="text-xs text-muted mt-2">Data: {item.dataExecucao}</Text>
                    </View>
                    <View className="bg-primary rounded-full px-4 py-2">
                      <Text className="text-white font-bold text-lg">{item.quantidadeTotal}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Botao Gerar Relatorio PDF */}
        <View className="px-6 pb-3 gap-3">
          <TouchableOpacity
            onPress={handleGerarRelatorioPDF}
            disabled={isGeneratingPDF || filteredChecklists.length === 0}
            className={`${
              isGeneratingPDF || filteredChecklists.length === 0 ? "bg-gray-400" : "bg-primary"
            } rounded-lg py-4 items-center flex-row justify-center gap-2 active:opacity-80`}
          >
            {isGeneratingPDF ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-semibold text-base">Gerando Relatorio...</Text>
              </>
            ) : (
              <Text className="text-white font-semibold text-base">📄 Gerar Relatório em PDF</Text>
            )}
          </TouchableOpacity>

          {/* Botão de Excel removido - usar Dashboard web para exportar em Excel */}
        </View>
      </ScrollView>

      {/* Modal de Período Customizado com Calendários */}
      <Modal visible={showCustomDatePicker} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-background rounded-lg p-6 w-full max-w-lg gap-4 max-h-4/5">
            <Text className="text-lg font-bold text-foreground">Período Customizado</Text>
            <Text className="text-sm text-muted">Selecione as datas usando os calendários</Text>

            <ScrollView>
              {/* Data Inicial */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-foreground mb-2">Data Inicial</Text>
                <TouchableOpacity
                  onPress={() => setShowStartCalendar(!showStartCalendar)}
                  className="border border-border rounded-lg px-4 py-3 bg-surface mb-2"
                >
                  <Text className="text-foreground font-semibold">
                    {selectedStartDate ? selectedStartDate : "Clique para selecionar"}
                  </Text>
                </TouchableOpacity>
                {showStartCalendar && (
                  <Calendar
                    onDayPress={(day) => {
                      setSelectedStartDate(day.dateString);
                      setShowStartCalendar(false);
                    }}
                    markedDates={{
                      [selectedStartDate || ""]: { selected: true, selectedColor: colors.primary },
                    }}
                    theme={{
                      backgroundColor: colors.background,
                      calendarBackground: colors.surface,
                      textSectionTitleColor: colors.foreground,
                      selectedDayBackgroundColor: colors.primary,
                      selectedDayTextColor: "white",
                      todayTextColor: colors.primary,
                      dayTextColor: colors.foreground,
                      textDisabledColor: colors.muted,
                      dotColor: colors.primary,
                      selectedDotColor: "white",
                      monthTextColor: colors.foreground,
                      indicatorColor: colors.primary,
                      arrowColor: colors.primary,
                    }}
                  />
                )}
              </View>

              {/* Data Final */}
              <View>
                <Text className="text-sm font-semibold text-foreground mb-2">Data Final</Text>
                <TouchableOpacity
                  onPress={() => setShowEndCalendar(!showEndCalendar)}
                  className="border border-border rounded-lg px-4 py-3 bg-surface mb-2"
                >
                  <Text className="text-foreground font-semibold">
                    {selectedEndDate ? selectedEndDate : "Clique para selecionar"}
                  </Text>
                </TouchableOpacity>
                {showEndCalendar && (
                  <Calendar
                    onDayPress={(day) => {
                      setSelectedEndDate(day.dateString);
                      setShowEndCalendar(false);
                    }}
                    markedDates={{
                      [selectedEndDate || ""]: { selected: true, selectedColor: colors.primary },
                    }}
                    theme={{
                      backgroundColor: colors.background,
                      calendarBackground: colors.surface,
                      textSectionTitleColor: colors.foreground,
                      selectedDayBackgroundColor: colors.primary,
                      selectedDayTextColor: "white",
                      todayTextColor: colors.primary,
                      dayTextColor: colors.foreground,
                      textDisabledColor: colors.muted,
                      dotColor: colors.primary,
                      selectedDotColor: "white",
                      monthTextColor: colors.foreground,
                      indicatorColor: colors.primary,
                      arrowColor: colors.primary,
                    }}
                  />
                )}
              </View>
            </ScrollView>

            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={() => {
                  setShowCustomDatePicker(false);
                  setSelectedStartDate(null);
                  setSelectedEndDate(null);
                  setShowStartCalendar(false);
                  setShowEndCalendar(false);
                }}
                className="flex-1 bg-surface border border-border rounded-lg py-3 items-center"
              >
                <Text className="text-foreground font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (selectedStartDate && selectedEndDate) {
                    const [startYear, startMonth, startDay] = selectedStartDate.split("-");
                    const [endYear, endMonth, endDay] = selectedEndDate.split("-");
                    
                    setCustomDate({
                      startDay: parseInt(startDay),
                      startMonth: parseInt(startMonth),
                      startYear: parseInt(startYear),
                      endDay: parseInt(endDay),
                      endMonth: parseInt(endMonth),
                      endYear: parseInt(endYear),
                    });
                    setDateFilter("custom");
                    setShowCustomDatePicker(false);
                    setSelectedStartDate(null);
                    setSelectedEndDate(null);
                    setShowStartCalendar(false);
                    setShowEndCalendar(false);
                  } else {
                    Alert.alert("Erro", "Selecione ambas as datas");
                  }
                }}
                className="flex-1 bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Data */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-background rounded-lg p-6 w-full max-w-sm gap-4">
            <Text className="text-lg font-bold text-foreground">Selecionar Data</Text>
            <Text className="text-sm text-muted">Digite uma data no formato DD/MM/YYYY</Text>

            <TextInput
              placeholder="Ex: 09/02/2026"
              value={inputDate}
              onChangeText={setInputDate}
              className="border border-border rounded-lg px-4 py-3 text-foreground bg-surface"
              placeholderTextColor={colors.muted}
            />

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setShowDatePicker(false);
                  setInputDate("");
                }}
                className="flex-1 bg-surface border border-border rounded-lg py-3 items-center"
              >
                <Text className="text-foreground font-semibold">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSelectDate}
                className="flex-1 bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Detalhes do Executante */}
      <Modal visible={selectedExecutante !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-background rounded-lg p-6 w-full max-w-md gap-4 max-h-3/4">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-lg font-bold text-foreground">{selectedExecutante?.executanteName}</Text>
                <Text className="text-sm text-muted">Matrícula: {selectedExecutante?.executanteMatricula}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedExecutante(null)}>
                <Text className="text-2xl text-muted">×</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-foreground">
              Total de Peças: <Text className="text-primary">{selectedExecutante?.quantidadeTotal}</Text>
            </Text>

            <Text className="text-sm font-semibold text-foreground">Modelos Executados:</Text>

            <ScrollView className="max-h-64">
              <View className="gap-2">
                {selectedExecutante?.modelos.map((modelo, index) => (
                  <View key={index} className="bg-surface rounded-lg p-3 border border-border">
                    <Text className="text-sm font-semibold text-foreground">{modelo.modelo}</Text>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-xs text-muted">Quantidade: {modelo.quantidade}</Text>
                      <Text className="text-xs text-muted">{modelo.dataRecuperacao}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setSelectedExecutante(null)}
              className="bg-primary rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold">Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Detalhes do Modelo */}
      <Modal visible={selectedModelo !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-background rounded-lg p-6 w-full max-w-md gap-4 max-h-3/4">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-lg font-bold text-foreground">{selectedModelo?.modelo}</Text>
                <Text className="text-sm text-muted">{selectedModelo?.checklistCode}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedModelo(null)}>
                <Text className="text-2xl text-muted">×</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-foreground">
              Total de Peças: <Text className="text-primary">{selectedModelo?.quantidadeTotal}</Text>
            </Text>

            <Text className="text-sm font-semibold text-foreground">Executantes:</Text>

            <ScrollView className="max-h-64">
              <View className="gap-2">
                {selectedModelo?.executantes.map((exec, index) => (
                  <View key={index} className="bg-surface rounded-lg p-3 border border-border">
                    <Text className="text-sm font-semibold text-foreground">{exec.executanteName}</Text>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-xs text-muted">Matrícula: {exec.executanteMatricula}</Text>
                      <Text className="text-xs text-muted">Qtd: {exec.quantidade}</Text>
                    </View>
                    <Text className="text-xs text-muted mt-1">{exec.dataRecuperacao}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setSelectedModelo(null)}
              className="bg-primary rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold">Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
