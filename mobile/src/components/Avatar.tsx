import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";

// Same idea as the web profile page: a stable color per first letter.
function colorFor(seed: string): string {
  const code = seed.toUpperCase().charCodeAt(0) || 65;
  return `hsl(${(code * 47) % 360}, 55%, 52%)`;
}

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimensions} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
  }

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <View style={[styles.fallback, dimensions, { backgroundColor: colorFor(initials) }]}>
      <AppText variant="bodyStrong" tone="onPrimary" style={{ fontSize: size * 0.38 }}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
});
