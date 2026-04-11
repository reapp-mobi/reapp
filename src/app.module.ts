import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ConfigModule } from './config/config.module'
import { ConfigService } from './config/config.service'
import { AccountModule } from './modules/account/account.module'
import { AuthenticationModule } from './modules/auth/auth.module'
import { DonationModule } from './modules/donation/donation.module'
import { HealthModule } from './modules/health/health.module'
import { InstitutionMemberModule } from './modules/institutionMember/institutionMember.module'
import { MailModule } from './modules/mail/mail.module'
import { MailService } from './modules/mail/mail.service'
import { MediaAttachmentModule } from './modules/media-attachment/media-attachment.module'
import { MediaProcessingModule } from './modules/media-processing/media-processing.module'
import { PasswordRecoveryModule } from './modules/password-recovery/password-recovery.module'
import { PostModule } from './modules/post/post.module'
import { ProjectModule } from './modules/project/project.module'
import { ReportModule } from './modules/report/report.module'

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 30,
        },
      ],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.REDIS_HOST,
          port: configService.REDIS_PORT,
          password: configService.REDIS_PASSWORD || undefined,
        },
      }),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.isProduction ? 'info' : 'debug',
          base: {
            pid: false,
          },
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        },
      }),
    }),
    AccountModule,
    AuthenticationModule,
    DonationModule,
    InstitutionMemberModule,
    MailModule,
    MediaAttachmentModule,
    MediaProcessingModule,
    PasswordRecoveryModule,
    PostModule,
    ProjectModule,
    ReportModule,
    HealthModule,
  ],
  providers: [
    MailService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
