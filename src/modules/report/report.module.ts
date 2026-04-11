import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '../../config/config.module'
import { ConfigService } from '../../config/config.service'
import { PrismaService } from '../../database/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { ReportController } from './report.controller'
import { ReportService } from './report.service'

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
  ],
  controllers: [ReportController],
  providers: [ReportService, PrismaService, AuthGuard],
})
export class ReportModule {}
