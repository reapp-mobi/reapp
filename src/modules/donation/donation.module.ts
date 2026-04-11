import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '../../config/config.module'
import { ConfigService } from '../../config/config.service'
import { PrismaService } from '../..//database/prisma.service'
import { MercadopagoService } from '../../services/mercadopago/mercadopago.service'
import { DonationController } from './donation.controller'
import { DonationService } from './donation.service'

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
  providers: [DonationService, PrismaService, MercadopagoService],
  controllers: [DonationController],
})
export class DonationModule {}
