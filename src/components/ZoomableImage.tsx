import React, { useEffect } from "react";
import { Image, StyleSheet } from "react-native";
import {
  GestureDetector,
  usePinchGesture,
  usePanGesture,
  useTapGesture,
  useSimultaneousGestures,
} from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

/**
 * Image that zooms with a two-finger pinch (around the fingers), pans while zoomed,
 * and toggles zoom on double-tap. `zoom` lets outside controls (e.g. +/- buttons)
 * drive the scale; `onZoomChange` reports the scale after every gesture.
 */
export function ZoomableImage({
  uri,
  width,
  height,
  zoom,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  zoom: number;
  onZoomChange: (scale: number) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);

  // Keeps the zoomed image covering the viewport (no panning past its edges)
  const clampTranslation = (s: number, x: number, y: number) => {
    "worklet";
    const maxX = Math.max(0, (width * s - width) / 2);
    const maxY = Math.max(0, (height * s - height) / 2);
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  };

  const animateTo = (s: number, x: number, y: number) => {
    "worklet";
    const bounded = clampTranslation(s, x, y);
    scale.value = withTiming(s);
    translateX.value = withTiming(bounded.x);
    translateY.value = withTiming(bounded.y);
    savedScale.value = s;
    savedTranslateX.value = bounded.x;
    savedTranslateY.value = bounded.y;
  };

  const pinch = usePinchGesture({
    onActivate: (e) => {
      // Focal point relative to the image centre, where the transform origin is
      pinchFocalX.value = e.focalX - width / 2;
      pinchFocalY.value = e.focalY - height / 2;
    },
    onUpdate: (e) => {
      const next = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      // Keep the content point under the fingers fixed while scaling
      const ratio = next / savedScale.value;
      const x = pinchFocalX.value - (pinchFocalX.value - savedTranslateX.value) * ratio;
      const y = pinchFocalY.value - (pinchFocalY.value - savedTranslateY.value) * ratio;
      const bounded = clampTranslation(next, x, y);
      scale.value = next;
      translateX.value = bounded.x;
      translateY.value = bounded.y;
    },
    onDeactivate: () => {
      const finalScale = scale.value < 1.05 ? MIN_SCALE : scale.value;
      animateTo(finalScale, translateX.value, translateY.value);
      scheduleOnRN(onZoomChange, Number(finalScale.toFixed(1)));
    },
  });

  const pan = usePanGesture({
    minPointers: 1,
    maxPointers: 2,
    onUpdate: (e) => {
      if (savedScale.value <= MIN_SCALE && scale.value <= MIN_SCALE) return;
      const bounded = clampTranslation(
        scale.value,
        savedTranslateX.value + e.translationX,
        savedTranslateY.value + e.translationY
      );
      translateX.value = bounded.x;
      translateY.value = bounded.y;
    },
    onDeactivate: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onDeactivate: (e) => {
      if (e.canceled) return;
      if (savedScale.value > MIN_SCALE) {
        animateTo(MIN_SCALE, 0, 0);
        scheduleOnRN(onZoomChange, MIN_SCALE);
      } else {
        // Zoom in centred on the tapped point
        const tapX = e.x - width / 2;
        const tapY = e.y - height / 2;
        animateTo(DOUBLE_TAP_SCALE, -tapX * (DOUBLE_TAP_SCALE - 1), -tapY * (DOUBLE_TAP_SCALE - 1));
        scheduleOnRN(onZoomChange, DOUBLE_TAP_SCALE);
      }
    },
  });

  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);

  // Outside controls (+ / - / reset buttons) change the zoom
  useEffect(() => {
    if (Math.abs(zoom - savedScale.value) < 0.01) return;
    const target = clamp(zoom, MIN_SCALE, MAX_SCALE);
    const ratio = target / savedScale.value;
    animateTo(target, savedTranslateX.value * ratio, savedTranslateY.value * ratio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // A different photo starts unzoomed
  useEffect(() => {
    scale.set(1);
    savedScale.set(1);
    translateX.set(0);
    translateY.set(0);
    savedTranslateX.set(0);
    savedTranslateY.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, animatedStyle]}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});
