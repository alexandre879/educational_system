import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

const COLORS = ["#1677FF", "#8B5CF6", "#EC4899", "#F59E0B", "#22C55E", "#06B6D4"];

interface PieceSpec {
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
}

/** A one-off burst of falling confetti over the whole screen (e.g. a great exam score). */
export function Confetti({ count = 70 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const [pieces] = useState<PieceSpec[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * width,
      size: 7 + Math.random() * 7,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 500,
      duration: 2400 + Math.random() * 1400,
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 1080,
    }))
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, index) => (
        <Piece key={index} spec={piece} fall={height + 60} />
      ))}
    </View>
  );
}

function Piece({ spec, fall }: { spec: PieceSpec; fall: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(spec.delay, withTiming(1, { duration: spec.duration, easing: Easing.out(Easing.quad) })));
  }, [progress, spec]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.get() < 0.85 ? 1 : (1 - progress.get()) / 0.15,
    transform: [
      { translateY: -30 + progress.get() * fall },
      { translateX: progress.get() * spec.drift },
      { rotate: `${progress.get() * spec.spin}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: spec.left, width: spec.size, height: spec.size * 0.5, backgroundColor: spec.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", top: 0, borderRadius: 2 },
});
