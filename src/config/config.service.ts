import { Injectable } from '@nestjs/common'
import { ConfigService as NestConfigService } from '@nestjs/config'
import { ConfigType, EnvEnumType } from './config.schema'

@Injectable()
export class ConfigService implements ConfigType {
  constructor(
    private readonly nestConfigService: NestConfigService<ConfigType, true>,
  ) {}

  get NODE_ENV(): EnvEnumType {
    return this.nestConfigService.get('NODE_ENV')
  }

  get APP_NAME(): string {
    return this.nestConfigService.get('APP_NAME')
  }

  get API_VERSION(): string {
    return this.nestConfigService.get('API_VERSION')
  }

  get CLIENT_URL(): string {
    return this.nestConfigService.get('CLIENT_URL')
  }

  get PORT(): number {
    return this.nestConfigService.get('PORT')
  }

  get HOST(): string {
    return this.nestConfigService.get('HOST')
  }

  get BASE_URL(): string {
    return this.nestConfigService.get('BASE_URL')
  }

  get UPLOAD_DIR(): string {
    return this.nestConfigService.get('UPLOAD_DIR')
  }

  get DATABASE_URL(): string {
    return this.nestConfigService.get('DATABASE_URL')
  }

  get JWT_SECRET(): string {
    return this.nestConfigService.get('JWT_SECRET')
  }

  get JWT_EXPIRES_IN(): string {
    return this.nestConfigService.get('JWT_EXPIRES_IN')
  }

  get REDIS_HOST(): string {
    return this.nestConfigService.get('REDIS_HOST')
  }

  get REDIS_PORT(): number {
    return this.nestConfigService.get('REDIS_PORT')
  }

  get REDIS_PASSWORD(): string {
    return this.nestConfigService.get('REDIS_PASSWORD')
  }

  get EMAIL_HOST(): string {
    return this.nestConfigService.get('EMAIL_HOST')
  }

  get EMAIL_PORT(): number {
    return this.nestConfigService.get('EMAIL_PORT')
  }

  get EMAIL_USER(): string {
    return this.nestConfigService.get('EMAIL_USER')
  }

  get EMAIL_PASSWORD(): string {
    return this.nestConfigService.get('EMAIL_PASSWORD')
  }

  get EMAIL_FROM(): string {
    return this.nestConfigService.get('EMAIL_FROM')
  }

  get GOOGLE_CLIENT_ID(): string {
    return this.nestConfigService.get('GOOGLE_CLIENT_ID')
  }

  get MERCADOPAGO_ACCESS_TOKEN(): string {
    return this.nestConfigService.get('MERCADOPAGO_ACCESS_TOKEN')
  }

  get MERCADOPAGO_NOTIFICATION_URL(): string {
    return this.nestConfigService.get('MERCADOPAGO_NOTIFICATION_URL')
  }

  get IS_TESTING_ENV(): boolean {
    return this.nestConfigService.get('IS_TESTING_ENV')
  }

  get isDevelopment(): boolean {
    return this.NODE_ENV === 'development'
  }

  get isProduction(): boolean {
    return this.NODE_ENV === 'production'
  }

  get isTest(): boolean {
    return this.NODE_ENV === 'test'
  }
}
