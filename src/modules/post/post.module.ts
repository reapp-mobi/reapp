import { PrismaService } from '@app/database/prisma.service'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '../../config/config.module'
import { ConfigService } from '../../config/config.service'
import { AccountService } from '../account/account.service'
import { AuthGuard } from '../auth/auth.guard'
import { MediaService } from '../media-attachment/media-attachment.service'
import { PostController } from './post.controller'
import { PostService } from './post.service'

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
  controllers: [PostController],
  providers: [
    PostService,
    PrismaService,
    AuthGuard,
    MediaService,
    AccountService,
  ],
})
export class PostModule {}
