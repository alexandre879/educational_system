import * as Sentry from "@sentry/react-native";
import type { ComponentType } from "react";

/**
 * Crash reporting. Off unless EXPO_PUBLIC_SENTRY_DSN is set (e.g. in eas.json for store
 * builds), so development and forks don't send anything.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? "development" : "production",
    // A sample of performance traces is enough to spot slow screens.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

type Root = ComponentType<Record<string, unknown>>;

/** Wraps the root layout so render errors and touch breadcrumbs reach Sentry. */
export function withCrashReporting(Component: Root): Root {
  return DSN ? Sentry.wrap(Component) : Component;
}
