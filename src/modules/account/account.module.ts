import { Module } from '@nestjs/common'
import { AccountService } from './account.service'
import { AccountController } from './account.controller'
import { PrismaService } from '../../database/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { JwtModule } from '@nestjs/jwt'
import { BullModule } from '@nestjs/bull'
import { MediaService } from '../media-attachment/media-attachment.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    BullModule.registerQueue({
      name: 'media-processing',
    }),
  ],
  controllers: [AccountController],
  providers: [AccountService, PrismaService, AuthGuard, MediaService],
  exports: [AccountService],
})
export class AccountModule {}
