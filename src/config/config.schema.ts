import * as path from 'node:path'
import { z } from 'zod'

const envEnum = z
  .enum(['development', 'production', 'test'])
  .default('development')

export const ConfigSchema = z.object({
  // Environment
  NODE_ENV: envEnum,

  // Application
  APP_NAME: z.string().min(1).default('Reapp'),
  API_VERSION: z.string().min(1).default('v1'),

  // Client url
  CLIENT_URL: z.string().url().default('http://localhost:3000'),

  // Server
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  BASE_URL: z.string().url(),
  UPLOAD_DIR: z.string().default(path.join(process.cwd(), 'uploads')),

  // Database
  DATABASE_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_HOST: z.string().min(1).default('redis'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(''),

  // Email
  EMAIL_HOST: z.string().min(1),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().min(1),
  EMAIL_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),

  // MercadoPago
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1),
  MERCADOPAGO_NOTIFICATION_URL: z.string().min(1),

  IS_TESTING_ENV: z.coerce.boolean().default(false),
})

export type EnvEnumType = z.infer<typeof envEnum>
export type ConfigType = z.infer<typeof ConfigSchema>
