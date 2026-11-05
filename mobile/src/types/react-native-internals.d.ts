// Types for React Native internals that tests call directly (the package ships them untyped).
declare module "react-native/Libraries/StyleSheet/processBackgroundImage" {
  export default function processBackgroundImage(
    backgroundImage: string
  ): { type: "linear-gradient" | "radial-gradient"; colorStops: unknown[] }[];
}
