// React Native drops a background gradient it can't parse without any warning, so make sure the
// screen backdrop is understood by the same parser iOS and Android use.
import processBackgroundImage from "react-native/Libraries/StyleSheet/processBackgroundImage";

import { backdropGradient, type Colors } from "@/theme";

const colors = {
  primary: "#4C8DFF",
  accent: "#A78BFA",
} as Colors;

describe("backdropGradient", () => {
  it.each(["dark", "light"] as const)("parses into three radial gradients (%s)", (scheme) => {
    const layers = processBackgroundImage(backdropGradient(colors, scheme));

    expect(layers).toHaveLength(3);
    for (const layer of layers) {
      expect(layer.type).toBe("radial-gradient");
      expect(layer.colorStops).toHaveLength(2);
    }
  });
});
