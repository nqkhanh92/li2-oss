import pino, { Logger } from 'pino'

const isProd = process.env.NODE_ENV === 'production'
const isBuilding = process.env.NEXT_PHASE === 'phase-production-build'

// Custom log levels (optional)
const customLevels = {
  audit: 55,
}

export type CustomLogLevel = keyof typeof customLevels

// Singleton logger
function createLogger(): Logger<CustomLogLevel> {
  if (isProd) {
    const stdout = pino.destination(1)
    if (stdout.setMaxListeners) stdout.setMaxListeners(50)

    if (isBuilding) {
      return pino({ level: 'info', customLevels, useOnlyCustomLevels: false }, stdout)
    }

    const fileTransport = pino.transport({
      target: 'pino-roll',
      options: {
        file: '/app/logs/app.log',
        frequency: 'daily',
        size: '20m',
        limit: { count: 14 },
      },
    })
    if (fileTransport.setMaxListeners) fileTransport.setMaxListeners(50)

    return pino(
      {
        level: 'info',
        customLevels,
        useOnlyCustomLevels: false,
      },
      pino.multistream([{ stream: stdout }, { stream: fileTransport }])
    )
  } else {
    // Development: pretty print
    const transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        level: 'debug',
        singleLine: true,
        customColors: 'fatal:bgRed,error:bgRed,warn:bgYellow,info:bgCyan,debug:bgGreen,trace:bgGray',
        useOnlyCustomProps: false,
      },
    })
    if (transport.setMaxListeners) transport.setMaxListeners(50)

    return pino(
      {
        level: 'debug',
        customLevels,
        useOnlyCustomLevels: false,
      },
      transport
    )
  }
}

// Ensure global singleton to prevent multiple instances during HMR
export const logger: Logger<CustomLogLevel> = (globalThis as any)._logger ?? createLogger()
if (!globalThis._logger) globalThis._logger = logger
