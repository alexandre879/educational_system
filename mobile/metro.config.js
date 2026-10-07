// Sentry's wrapper adds debug IDs to bundles so crash reports map back to the source.
// It behaves like Expo's default config otherwise.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
