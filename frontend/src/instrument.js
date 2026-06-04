// Sentry instrumentation — must be imported BEFORE any React code.
// If REACT_APP_SENTRY_DSN is unset, init is skipped and the SDK is inert.
import * as Sentry from '@sentry/react';

const rawDsn = process.env.REACT_APP_SENTRY_DSN;
const dsn = rawDsn && rawDsn !== 'undefined' && rawDsn !== 'null' ? rawDsn : undefined;

export const SENTRY_ENABLED = typeof dsn === 'string' && dsn.length > 0;

if (SENTRY_ENABLED) {
  // Guard against duplicate init in dev hot-reload
  const existing = Sentry.getClient?.();
  if (!existing) {
    Sentry.init({
      dsn,
      environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      // Error monitoring only — no replay/perf traces (keeps bundle light)
      tracesSampleRate: 0,
    });
  }
}
