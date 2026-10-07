// Crash reporting: errors go to Sentry only when NEXT_PUBLIC_SENTRY_DSN is set.
// The SDK is loaded on demand, so the site ships none of it otherwise.
type SentryModule = typeof import("@sentry/browser");

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

let sentry: Promise<SentryModule> | null = null;

export function initCrashReporting(): void {
  if (!DSN || typeof window === "undefined" || sentry) return;

  sentry = import("@sentry/browser").then((Sentry) => {
    Sentry.init({
      dsn: DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    });
    return Sentry;
  });
}

/** Report an error caught by an error boundary (uncaught ones are picked up automatically). */
export function reportError(error: unknown): void {
  initCrashReporting();
  void sentry?.then((Sentry) => Sentry.captureException(error));
}
