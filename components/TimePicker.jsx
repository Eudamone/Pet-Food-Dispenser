import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function TimePickerSlide({
  value = { hour: '21', minute: '00' },
  onChange,
  // Atributos de personalización de tamaño y estilo
  itemHeight = 72,
  itemWidth = 110,
  fontSize = 48,
  fontFamily, // Ej: 'Poppins-Bold' o cualquier fuente cargada
  fontClassName = 'font-black text-[#2E1C0C]', // Clases opcionales de NativeWind
}) {
  const hours = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleHourScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < hours.length) {
      const selected = hours[index];
      if (selected !== value.hour) {
        Haptics.selectionAsync();
        onChange?.({ ...value, hour: selected });
      }
    }
  };

  const handleMinuteScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < minutes.length) {
      const selected = minutes[index];
      if (selected !== value.minute) {
        Haptics.selectionAsync();
        onChange?.({ ...value, minute: selected });
      }
    }
  };

  const textStyle = {
    fontSize,
    ...(fontFamily ? { fontFamily } : {}),
  };

  return (
    <View className="flex-row items-center justify-center space-x-3">
      {/* Selector de Horas */}
      <View 
        style={{ height: itemHeight, width: itemWidth }}
        className="bg-[#FFFDE7] rounded-3xl overflow-hidden shadow-lg"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onScroll={handleHourScroll}
          scrollEventThrottle={8}
          nestedScrollEnabled
          overScrollMode="never"
        >
          {hours.map((h) => (
            <View
              key={h}
              style={{ height: itemHeight }}
              className="items-center justify-center"
            >
              <Text 
                style={textStyle} 
                className={fontClassName}
              >
                {h}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Separador */}
      <Text 
        style={{ fontSize: fontSize * 0.9, ...(fontFamily ? { fontFamily } : {}) }} 
        className="font-bold text-[#FFFDE7] px-1 mb-1"
      >
        :
      </Text>

      {/* Selector de Minutos */}
      <View 
        style={{ height: itemHeight, width: itemWidth }}
        className="bg-[#FFFDE7] rounded-3xl overflow-hidden shadow-lg"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onScroll={handleMinuteScroll}
          scrollEventThrottle={8}
          nestedScrollEnabled
          overScrollMode="never"
        >
          {minutes.map((m) => (
            <View
              key={m}
              style={{ height: itemHeight }}
              className="items-center justify-center"
            >
              <Text 
                style={textStyle} 
                className={fontClassName}
              >
                {m}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}