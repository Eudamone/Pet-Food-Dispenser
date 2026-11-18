import React from 'react';
import { Pressable, Text } from 'react-native';

const FilterButton = ({ label, isActive, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center min-w-0 h-14 rounded-full"
      style={{
        backgroundColor: isActive ? '#3A1508' : '#FFFBE8',
      }}
    >
      <Text
        className="font-calm text-lg"
        style={{
          color: isActive ? '#FFFFFF' : '#3A1508',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default FilterButton;