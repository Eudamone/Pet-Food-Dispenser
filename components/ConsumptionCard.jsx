import React from 'react';
import { View, Text, ScrollView } from 'react-native';

/**
 * @param {string} title - Título del gráfico (ej: "Consumo diario")
 * @param {number} targetValue - Meta en gramos (ej: 80)
 * @param {Object} data - Objeto de valores { label: valor }. Ej: { 'L': 60, 'M': 85 }
 * @param {string} mode - 'day' | 'week' | 'month' (por defecto intenta adaptarse según la cantidad de items)
 */
const ConsumptionCard = ({
  title = "Consumo diario",
  targetValue = 80,
  data = null,
  mode = "week",
}) => {
  // Convertimos el objeto en un array para iterar
  const entries = data ? Object.entries(data) : [];
  const hasData = entries.length > 0;

  // Calculamos el valor máximo para escalar la altura de las barras
  // Si ningún valor supera la meta, escalamos respecto a la meta
  const maxDataValue = hasData ? Math.max(...entries.map(([, val]) => val)) : 0;
  const maxChartValue = Math.max(maxDataValue, targetValue * 1.25) || 100; // Un 25% más alto que la meta para dar espacio superior

  // Altura máxima reservada para las barras (en px)
  const MAX_BAR_HEIGHT = 140;

  // Posición Y de la línea discontinuada de la meta
  const targetLineY = MAX_BAR_HEIGHT - (targetValue / maxChartValue) * MAX_BAR_HEIGHT;

  // Ajustes dinámicos de estilos según la vista
  const getItemWidth = () => {
    if (mode === "month" || entries.length > 15) return "w-3 mx-1"; // Barras delgadas
    if (mode === "day" || entries.length > 10) return "w-4 mx-1.5"; // Barras intermedias
    return "w-7 mx-2"; // Para semana (pocas barras, mas anchas)
  };

  const getLabelFontSize = () => {
    if (mode === "month" || mode === "day" || entries.length > 12) return "text-[9px]";
    return "text-xs";
  };

  // Color de barra según consumo respecto a la meta (puedes ajustar esta lógica según tus requerimientos)
  const getBarColor = (val) => {
    if (val >= targetValue) return "bg-orange-500";
    if (val >= targetValue * 0.7) return "bg-amber-400";
    return "bg-amber-100";
  };

  return (
    <View className="bg-[#7C3AED] rounded-3xl p-5 shadow-lg w-full mt-4">
      {/* Encabezado */}
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-lg font-bold">{title}</Text>
        <View className="flex-row items-center">
          <Text className="text-purple-200 text-xs tracking-widest font-bold">--- </Text>
          <Text className="text-white text-xs font-semibold">
            Meta {targetValue} g
          </Text>
        </View>
      </View>

      {/* Estado "Sin datos" */}
      {!hasData ? (
        <View className="h-40 justify-center items-center rounded-2xl bg-purple-800/30">
          <Text className="text-purple-200 font-medium text-sm">
            Sin datos registrados
          </Text>
        </View>
      ) : (
        /* Gráfica de Barras */
        <View className="relative" style={{ height: MAX_BAR_HEIGHT + 30 }}>
          {/* Línea discontinuada de la meta */}
          <View
            className="absolute left-0 right-0 z-10 h-0 border-t-2 border-purple-200"
            style={{ top: targetLineY ,borderStyle: 'dashed'}}
          />

          {/* Scroll horizontal con scrollbar oculto */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: entries.length <= 7 ? "space-around" : "flex-start",
              alignItems: "flex-end",
              paddingBottom: 24,
            }}
          >
            {entries.map(([label, value], index) => {
              // Altura proporcional de la barra actual
              const barHeight = Math.max((value / maxChartValue) * MAX_BAR_HEIGHT, 8); // Altura mínima visible de 8px

              return (
                <View key={index} className="items-center">
                  {/* Barra */}
                  <View
                    className={`rounded-full ${getItemWidth()} ${getBarColor(value)}`}
                    style={{ height: barHeight }}
                  />
                  {/* Label debajo de la barra */}
                  <Text
                    className={`text-white font-bold mt-2 absolute -bottom-6 ${getLabelFontSize()}`}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default ConsumptionCard;