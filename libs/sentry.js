const Sentry = require('@sentry/node');
const { SENTRY_DSN, ENV } = process.env;
Sentry.init({
    environment: ENV,
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
});

module.exports = Sentry;