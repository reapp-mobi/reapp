import { Test, TestingModule } from '@nestjs/testing'
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../auth/auth.guard'
import { AdminController } from '../admin.controller'
import { AdminService } from '../admin.service'

describe('AdminController', () => {
  let controller: AdminController
  let adminService: AdminService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            findAllAccounts: vi.fn(),
            updateAccountStatus: vi.fn(),
            findAllDonations: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      })
      .compile()

    controller = module.get<AdminController>(AdminController)
    adminService = module.get<AdminService>(AdminService)
  })

  describe('findAllAccounts', () => {
    it('should return all accounts with pagination', async () => {
      const accounts = {
        data: [
          {
            id: 1,
            email: 'test1@example.com',
            name: 'Test1',
            accountType: 'DONOR',
          },
          {
            id: 2,
            email: 'test2@example.com',
            name: 'Test2',
            accountType: 'INSTITUTION',
          },
        ],
        total: 2,
        offset: 0,
        limit: 10,
      }
      ;(adminService.findAllAccounts as Mock).mockResolvedValue(accounts)

      const result = await controller.findAllAccounts({})
      expect(adminService.findAllAccounts).toHaveBeenCalled()
      expect(result).toEqual(accounts)
    })
  })

  describe('updateAccountStatus', () => {
    it('should update account status and return result', async () => {
      const updatedAccount = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        accountType: 'DONOR',
        status: 'ACTIVE',
      }
      ;(adminService.updateAccountStatus as Mock).mockResolvedValue(
        updatedAccount,
      )

      const result = await controller.updateAccountStatus(1, {
        status: 'ACTIVE',
      })
      expect(adminService.updateAccountStatus).toHaveBeenCalledWith(1, 'ACTIVE')
      expect(result).toEqual(updatedAccount)
    })
  })

  describe('findAllDonations', () => {
    it('should return all donations with pagination', async () => {
      const donations = {
        data: [
          { id: 1, amount: 50, donorId: 1 },
          { id: 2, amount: 100, donorId: 2 },
        ],
        total: 2,
        offset: 0,
        limit: 10,
      }
      ;(adminService.findAllDonations as Mock).mockResolvedValue(donations)

      const result = await controller.findAllDonations({ offset: 0, limit: 10 })
      expect(adminService.findAllDonations).toHaveBeenCalledWith(0, 10)
      expect(result).toEqual(donations)
    })
  })
})
