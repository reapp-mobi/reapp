import { PrismaService } from '@app/database/prisma.service'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '../../config/config.module'
import { ConfigService } from '../../config/config.service'
import { AuthGuard } from '../auth/auth.guard'
import { MediaAttachmentController } from './media-attachment.controller'
import { MediaService } from './media-attachment.service'

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
  controllers: [MediaAttachmentController],
  providers: [MediaService, PrismaService, AuthGuard],
  exports: [MediaService],
})
export class MediaAttachmentModule {}
