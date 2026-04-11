import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ConfigModule } from './config/config.module'
import { ConfigService } from './config/config.service'
import { AdminModule } from './modules/admin/admin.module'
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
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 30,
        },
      ],
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
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
    ConfigModule,
    AdminModule,
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
    ConfigService,
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
