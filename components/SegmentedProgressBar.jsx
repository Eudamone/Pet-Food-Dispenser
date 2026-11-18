import React from 'react';
import { View } from 'react-native';

// Paleta de 10 colores vibrantes de alto contraste sobre fondo morado (#7A35B8)
const SEGMENT_COLORS = [
  '#F3C242', // Amarillo cálido
  '#FFFBE8', // Crema / Blanco
  '#E86D1F', // Naranja
  '#2ECC71', // Verde
  '#3498DB', // Azul claro
  '#FF6B6B', // Rojo coral
  '#1ABC9C', // Turquesa
  '#E056FD', // Rosa neón
  '#F1C40F', // Dorado
  '#00D2D3', // Cian
];

export const SegmentedProgressBar = ({ values = [], height = 16, gap = 3 }) => {
  // Suma total para calcular porcentajes
  const total = values.reduce((acc, curr) => acc + curr, 0);

  // Si el arreglo está vacío o la suma es 0, renderiza la barra vacía
  if (!values.length || total === 0) {
    return (
      <View 
        className="w-full bg-[#5D2590] rounded-full overflow-hidden" 
        style={{ height }} 
      />
    );
  }

  return (
    <View
      className="w-full flex-row overflow-hidden rounded-full bg-[#5D2590]"
      style={{ height, gap }}
    >
      {values.map((val, index) => {
        if (val <= 0) return null; // Ignorar valores negativos o cero

        const percentage = (val / total) * 100;
        // Asignación de color cíclica (0 a 9)
        const backgroundColor = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

        const isFirst = index === 0;
        const isLast = index === values.length - 1;

        return (
          <View
            key={`segment-${index}`}
            style={{
              width: `${percentage}%`,
              backgroundColor,
              height: '100%',
              borderTopLeftRadius: isFirst ? 9999 : 0,
              borderBottomLeftRadius: isFirst ? 9999 : 0,
              borderTopRightRadius: isLast ? 9999 : 0,
              borderBottomRightRadius: isLast ? 9999 : 0,
            }}
          />
        );
      })}
    </View>
  );
};