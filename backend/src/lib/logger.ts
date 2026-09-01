import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
  redact: {
    // Never log credentials or tokens.
    paths: ['*.password', '*.passwordHash', '*.token', '*.accessToken', '*.refreshToken', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});
