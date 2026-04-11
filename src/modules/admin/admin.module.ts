import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AccountModule } from '../account/account.module'
import { AuthGuard } from '../auth/auth.guard'
import { DonationModule } from '../donation/donation.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  imports: [
    AccountModule,
    DonationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AuthGuard],
})
export class AdminModule {}
