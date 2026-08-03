import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface DatePickerCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  title: string;
}

export function DatePickerCalendar({
  selectedDate,
  onSelectDate,
  title,
}: DatePickerCalendarProps) {
  const colors = useColors();
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  // Obter primeiro dia do mês e número de dias
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Gerar array de dias para renderizar
  const generateDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: (number | null)[] = [];

    // Adicionar espaços vazios para o primeiro dia
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Adicionar dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const days = generateDays();

  // Nomes dos meses
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Nomes dos dias da semana
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onSelectDate(newDate);
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  return (
    <View className="gap-4">
      {/* Título */}
      <Text className="text-sm font-semibold text-foreground">{title}</Text>

      {/* Navegação de Mês */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-surface rounded-lg border border-border">
        <TouchableOpacity
          onPress={handlePreviousMonth}
          className="p-2 active:opacity-60"
        >
          <Text className="text-lg font-bold text-primary">{"<"}</Text>
        </TouchableOpacity>

        <Text className="text-sm font-semibold text-foreground">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          className="p-2 active:opacity-60"
        >
          <Text className="text-lg font-bold text-primary">{">"}</Text>
        </TouchableOpacity>
      </View>

      {/* Cabeçalho com nomes dos dias */}
      <View className="flex-row justify-between px-2">
        {dayNames.map((day) => (
          <View key={day} className="flex-1 items-center">
            <Text className="text-xs font-semibold text-muted">{day}</Text>
          </View>
        ))}
      </View>

      {/* Grid de Dias */}
      <View className="gap-2">
        {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
          <View key={weekIndex} className="flex-row justify-between gap-1">
            {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => (
              <TouchableOpacity
                key={`${weekIndex}-${dayIndex}`}
                onPress={() => day !== null && handleSelectDay(day)}
                disabled={day === null}
                className={`flex-1 aspect-square rounded-lg items-center justify-center ${
                  day === null
                    ? "bg-transparent"
                    : isDateSelected(day)
                      ? "bg-primary"
                      : isToday(day)
                        ? "bg-primary/20 border border-primary"
                        : "bg-surface border border-border"
                }`}
                activeOpacity={0.7}
              >
                {day !== null && (
                  <Text
                    className={`text-sm font-semibold ${
                      isDateSelected(day) ? "text-white" : "text-foreground"
                    }`}
                  >
                    {day}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Data Selecionada */}
      {selectedDate && (
        <View className="bg-primary/10 rounded-lg p-3 border border-primary">
          <Text className="text-xs text-muted">Data Selecionada:</Text>
          <Text className="text-sm font-semibold text-primary mt-1">
            {selectedDate.getDate().toString().padStart(2, "0")}/
            {(selectedDate.getMonth() + 1).toString().padStart(2, "0")}/
            {selectedDate.getFullYear()}
          </Text>
        </View>
      )}
    </View>
  );
}
