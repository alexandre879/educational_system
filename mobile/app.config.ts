import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * APP_VARIANT=development (set by the "development" EAS profile) builds a separate
 * "Blueapp (Dev)" app that can sit next to the store version and may talk plain
 * HTTP to a backend running on your computer.
 */
const IS_DEV = process.env.APP_VARIANT === "development";

// Paste the project id printed by `npx eas-cli@latest init` here (see README).
// Push notifications and EAS builds need it; it is not a secret.
const EAS_PROJECT_ID = "";

const BUNDLE_ID = IS_DEV ? "store.blueapp.school.dev" : "store.blueapp.school";
const { SENTRY_ORG, SENTRY_PROJECT } = process.env;
const BRAND_BLUE = "#1677ff";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "Blueapp (Dev)" : "Blueapp",
  slug: "blueapp-school",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: IS_DEV ? "blueapp-dev" : "blueapp",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: BUNDLE_ID,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Dev builds may reach a local `runserver` over HTTP.
      ...(IS_DEV ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } : {}),
    },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: BRAND_BLUE,
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: BRAND_BLUE,
        image: "./assets/images/splash-icon.png",
        imageWidth: 110,
        dark: { backgroundColor: "#0e0e10" },
      },
    ],
    "expo-secure-store",
    "expo-localization",
    ["expo-notifications", { color: BRAND_BLUE }],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to use your photos for your profile picture.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    ["expo-build-properties", { android: { usesCleartextTraffic: IS_DEV } }],
    ["expo-local-authentication", { faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID to unlock the app." }],
    // Crash reporting source maps: only when a Sentry project is configured (see README).
    ...(SENTRY_ORG && SENTRY_PROJECT
      ? [["@sentry/react-native/expo", { url: "https://sentry.io/", organization: SENTRY_ORG, project: SENTRY_PROJECT }] as [string, object]]
      : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
});
