import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '../../config/config.module'
import { ConfigService } from '../../config/config.service'
import { PrismaService } from '../../database/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { MediaService } from '../media-attachment/media-attachment.service'
import { AccountController } from './account.controller'
import { AccountService } from './account.service'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.JWT_SECRET,
        signOptions: { expiresIn: configService.JWT_EXPIRES_IN },
      }),
    }),
    BullModule.registerQueue({
      name: 'media-processing',
    }),
  ],
  controllers: [AccountController],
  providers: [AccountService, PrismaService, AuthGuard, MediaService],
})
export class AccountModule {}
