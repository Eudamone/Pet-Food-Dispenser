import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const CircularProgress = ({
  size = 120,
  strokeWidth = 14,
  progress = 0.58, // Valor entre 0 y 1
  text = '38 g',
  backgroundColor = '#EAE3CD',
  progressColor = '#F27318',
  textColor = 'text-[#2D1500]',
}) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Aseguramos que el valor esté entre 0 y 1
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <View className="relative items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Círculo de fondo */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Círculo de progreso */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Texto centrado con NativeWind */}
      <View className="absolute inset-0 items-center justify-center">
        <Text className={`text-2xl font-bold ${textColor}`}>
          {text}
        </Text>
      </View>
    </View>
  );
};

export default CircularProgress;