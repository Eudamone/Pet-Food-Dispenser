import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const Counter = ({ 
  init = 5, 
  step = 5, 
  min = 0, 
  max = 40, 
  unit = 'g', 
  subtitle = 'máx. 40 g por comida' 
}) => {
  const [count, setCount] = useState(init);

  const handleIncrement = () => {
    setCount((prev) => {
      const nextValue = prev + step;
      return nextValue > max ? max : nextValue;
    });
  };

  const handleDecrement = () => {
    setCount((prev) => {
      const nextValue = prev - step;
      return nextValue < min ? min : nextValue;
    });
  };

  const isMinReached = count <= min;
  const isMaxReached = count >= max;

  return (
    // Usamos gap-x-12 para separar los botones del centro de forma limpia
    <View className="flex-row items-center justify-center bg-[#FEFBEA] px-4 py-4 gap-x-12">
      {/* Botón Decrementar (-) */}
      <TouchableOpacity
        className={`h-14 w-14 items-center justify-center rounded-full bg-[#ECE3C4] ${
          isMinReached ? 'bg-[#F3EFE0] opacity-50' : 'active:opacity-80'
        }`}
        onPress={handleDecrement}
        disabled={isMinReached}
      >
        <Text className={`text-3xl font-bold leading-none ${isMinReached ? 'text-[#A09580]' : 'text-[#3B1A08]'}`}>
          –
        </Text>
      </TouchableOpacity>

      {/* Contenido Central */}
      <View className="items-center justify-center min-w-[120px]">
        <Text 
          className="text-5xl font-titan text-[#3B1A08] includeFontPadding-false"
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {count} {unit}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-xs font-calm text-[#3B1A08] text-center">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Botón Incrementar (+) */}
      <TouchableOpacity
        className={`h-14 w-14 items-center justify-center rounded-full bg-[#ECE3C4] ${
          isMaxReached ? 'bg-[#F3EFE0] opacity-50' : 'active:opacity-80'
        }`}
        onPress={handleIncrement}
        disabled={isMaxReached}
      >
        <Text className={`text-3xl font-bold leading-none ${isMaxReached ? 'text-[#A09580]' : 'text-[#3B1A08]'}`}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Counter;