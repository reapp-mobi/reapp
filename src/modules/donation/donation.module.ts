import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PrismaService } from '../..//database/prisma.service'
import { MercadopagoService } from '../../services/mercadopago/mercadopago.service'
import { DonationController } from './donation.controller'
import { DonationService } from './donation.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [DonationService, PrismaService, MercadopagoService],
  controllers: [DonationController],
  exports: [DonationService],
})
export class DonationModule {}
