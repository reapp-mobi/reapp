import { Injectable } from '@nestjs/common'
import { AccountStatus } from '@prisma/client'
import { AccountService } from '../account/account.service'
import { GetAccountsQuery } from '../account/dto/get-account-query.dto'
import { DonationService } from '../donation/donation.service'

@Injectable()
export class AdminService {
  constructor(
    private readonly accountService: AccountService,
    private readonly donationService: DonationService,
  ) {}

  async findAllAccounts(query: GetAccountsQuery) {
    return await this.accountService.findAll(query)
  }

  async updateAccountStatus(id: number, status: AccountStatus) {
    return await this.accountService.updateStatus(id, status)
  }

  async findAllDonations(offset: number, limit: number) {
    return await this.donationService.getAllDonations(offset, limit)
  }
}
