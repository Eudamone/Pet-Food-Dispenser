import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 120,
  mass: 0.8,
};

const AnimatedView = Animated.createAnimatedComponent(View);

export default function CustomSwitch({
  value = false,
  onValueChange,
  width = 80,
  height = 44,
}) {
  const padding = 4;
  const circleSize = height - padding * 2;
  const maxTranslate = width - circleSize - padding * 2;

  const translateX = useSharedValue(value ? maxTranslate : 0);

  const toggleSwitch = (newState) => {
    const targetX = newState ? maxTranslate : 0;
    translateX.value = withSpring(targetX, SPRING_CONFIG);
    if (onValueChange) {
      onValueChange(newState);
    }
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      const currentPos = (value ? maxTranslate : 0) + e.translationX;
      translateX.value = Math.min(Math.max(currentPos, 0), maxTranslate);
    })
    .onEnd(() => {
      const shouldBeOn = translateX.value > maxTranslate / 2;
      toggleSwitch(shouldBeOn);
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      toggleSwitch(!value);
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [0, maxTranslate],
      ['#E0E0E0', '#EA6209']
    );
    return { backgroundColor };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedView
        className="rounded-full justify-center"
        style={[
          {
            width,
            height,
            padding,
          },
          animatedTrackStyle,
        ]}
      >
        <AnimatedView
          className="rounded-full bg-[#FAF5E8]"
          style={[
            {
              width: circleSize,
              height: circleSize,
            },
            animatedCircleStyle,
          ]}
        />
      </AnimatedView>
    </GestureDetector>
  );
}