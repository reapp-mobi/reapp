import { vi } from 'vitest'

vi.mock('nestjs-pino', async () => {
  const actual = await vi.importActual<typeof import('nestjs-pino')>(
    'nestjs-pino',
  )
  return {
    ...actual,
    Logger: class {
      log() {}
      error() {}
      warn() {}
      debug() {}
      verbose() {}
      fatal() {}
    },
  }
})
