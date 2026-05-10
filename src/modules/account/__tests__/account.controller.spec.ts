import { LoggedUser } from '@app/types/logged-user'
import { HttpException, HttpStatus } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Request } from 'express'
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../auth/auth.guard'
import { AccountController } from '../account.controller'
import { AccountService } from '../account.service'
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from '../dto/create-account.dto'
import { UpdateAccountDto } from '../dto/update-account.dto'

const getRequest = (opts?: Partial<LoggedUser>): Request => {
  return {
    user: {
      id: 1,
      email: 'user@test.com',
      name: 'Donor Test',
      accountType: 'DONOR',
      ...opts,
    },
  } as Request
}

describe('AccountController', () => {
  let controller: AccountController
  let accountService: AccountService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: {
            create: vi.fn(),
            createWithGoogle: vi.fn(),
            findAll: vi.fn(),
            findOne: vi.fn(),
            findOneInstitution: vi.fn(),
            findOneDonor: vi.fn(),
            remove: vi.fn(),
            update: vi.fn(),
            followAccount: vi.fn(),
            unfollowAccount: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      })
      .compile()

    controller = module.get<AccountController>(AccountController)
    accountService = module.get<AccountService>(AccountService)
  })

  describe('create', () => {
    it('should call accountService.create with the correct data', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: 'DONOR',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      }

      const file = {} as Express.Multer.File
      ;(accountService.create as Mock).mockResolvedValue({
        id: 1,
        ...createAccountDto,
      })

      const result = await controller.create(createAccountDto, file)
      expect(accountService.create).toHaveBeenCalledWith(createAccountDto, file)
      expect(result).toEqual({ id: 1, ...createAccountDto })
    })
  })

  describe('createWithGoogle', () => {
    it('should call accountService.createWithGoogle with the correct data', async () => {
      const createAccountGoogleDto: CreateAccountGoogleDto = {
        idToken: 'test-id-token',
      }
      ;(accountService.createWithGoogle as Mock).mockResolvedValue({
        id: 2,
        email: 'google@example.com',
        name: 'Google User',
      })

      const result = await controller.createWithGoogle(createAccountGoogleDto)
      expect(accountService.createWithGoogle).toHaveBeenCalledWith(
        createAccountGoogleDto,
      )
      expect(result).toEqual({
        id: 2,
        email: 'google@example.com',
        name: 'Google User',
      })
    })
  })

  describe('findAll', () => {
    it('should return all accounts', async () => {
      const accounts = [
        {
          id: 1,
          email: 'test1@example.com',
          name: 'Test1',
          accountType: 'donor',
        },
        {
          id: 2,
          email: 'test2@example.com',
          name: 'Test2',
          accountType: 'institution',
        },
      ]
      ;(accountService.findAll as Mock).mockResolvedValue(accounts)

      const result = await controller.findAll({})
      expect(accountService.findAll).toHaveBeenCalled()
      expect(result).toEqual(accounts)
    })
  })

  describe('findMe', () => {
    it('should return the authenticated account', async () => {
      const account = {
        id: 1,
        email: 'user@test.com',
        name: 'Donor Test',
        accountType: 'DONOR',
      }
      ;(accountService.findOne as Mock).mockResolvedValue(account)

      const request = getRequest()
      const result = await controller.findMe(request)
      expect(accountService.findOne).toHaveBeenCalledWith(request.user.id)
      expect(result).toEqual(account)
    })
  })

  describe('findOne', () => {
    it('should return one account by id', async () => {
      const account = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        accountType: 'donor',
      }
      ;(accountService.findOne as Mock).mockResolvedValue(account)

      const result = await controller.findOne('1')
      expect(accountService.findOne).toHaveBeenCalledWith(1)
      expect(result).toEqual(account)
    })

    it('should throw not found exception if account not exists', async () => {
      ;(accountService.findOne as Mock).mockRejectedValue(
        new HttpException('conta não encontrada', HttpStatus.NOT_FOUND),
      )

      await expect(controller.findOne('999')).rejects.toThrow(
        'conta não encontrada',
      )
    })
  })

  describe('findOneInstitution', () => {
    it('should return institution data', async () => {
      const institutionData = {
        id: 1,
        cnpj: '12345678901234',
        phone: '1234-5678',
        account: { id: 1, name: 'Inst' },
      }
      ;(accountService.findOneInstitution as Mock).mockResolvedValue(
        institutionData,
      )

      const request = getRequest()
      const result = await controller.findOneInsitution('1', request)
      expect(accountService.findOneInstitution).toHaveBeenCalledWith(
        1,
        request.user.id,
      )
      expect(result).toEqual(institutionData)
    })
  })

  describe('follow', () => {
    it('should follow an account', async () => {
      const request = getRequest()
      const targetAccountId = 2
      ;(accountService.followAccount as Mock).mockResolvedValue({
        message: `You are now following account ${targetAccountId}`,
      })

      const result = await controller.follow(request, targetAccountId)
      expect(accountService.followAccount).toHaveBeenCalledWith(
        1,
        targetAccountId,
      )
      expect(result).toEqual({
        message: `You are now following account ${targetAccountId}`,
      })
    })

    it('should handle error when trying to follow an invalid account', async () => {
      const request = getRequest()
      const targetAccountId = 999
      ;(accountService.followAccount as Mock).mockRejectedValue(
        new HttpException('Account not found', HttpStatus.NOT_FOUND),
      )

      await expect(controller.follow(request, targetAccountId)).rejects.toThrow(
        'Account not found',
      )
      expect(accountService.followAccount).toHaveBeenCalledWith(
        1,
        targetAccountId,
      )
    })
  })

  describe('unfollow', () => {
    it('should unfollow an account', async () => {
      const request = getRequest()
      const targetAccountId = 2
      ;(accountService.unfollowAccount as Mock).mockResolvedValue({
        message: `You have unfollowed account ${targetAccountId}`,
      })

      const result = await controller.unfollow(request, targetAccountId)
      expect(accountService.unfollowAccount).toHaveBeenCalledWith(
        1,
        targetAccountId,
      )
      expect(result).toEqual({
        message: `You have unfollowed account ${targetAccountId}`,
      })
    })

    it('should handle error when trying to unfollow an invalid account', async () => {
      const request = getRequest()
      const targetAccountId = 999
      ;(accountService.unfollowAccount as Mock).mockRejectedValue(
        new HttpException('Account not found', HttpStatus.NOT_FOUND),
      )

      await expect(
        controller.unfollow(request, targetAccountId),
      ).rejects.toThrow('Account not found')
      expect(accountService.unfollowAccount).toHaveBeenCalledWith(
        1,
        targetAccountId,
      )
    })
  })

  describe('findOneDonor', () => {
    it('should return donor data', async () => {
      const donorData = {
        id: 1,
        account: { id: 1, name: 'Donor', email: 'donor@example.com' },
        donations: [],
      }
      ;(accountService.findOneDonor as Mock).mockResolvedValue(donorData)

      const result = await controller.findOneDonor('1')
      expect(accountService.findOneDonor).toHaveBeenCalledWith(1)
      expect(result).toEqual(donorData)
    })
  })

  describe('remove', () => {
    it('should remove the account if authorized', async () => {
      const request = getRequest()
      ;(accountService.remove as Mock).mockResolvedValue({
        message: 'Account removed',
      })

      const result = await controller.remove('1', request)
      expect(accountService.remove).toHaveBeenCalledWith(1, 1)
      expect(result).toEqual({ message: 'Account removed' })
    })

    it('should throw unauthorized if user tries to remove another account', async () => {
      const request = getRequest()
      ;(accountService.remove as Mock).mockRejectedValue(
        new HttpException('Acesso não autorizado', HttpStatus.UNAUTHORIZED),
      )

      await expect(controller.remove('1', request)).rejects.toThrow(
        'Acesso não autorizado',
      )
    })
  })

  describe('update', () => {
    it('should update the account', async () => {
      const request = getRequest()
      const updateAccountDto: UpdateAccountDto = {
        name: 'Updated User',
        password: 'senha1234',
        confirmPassword: 'senha1234',
      }
      const file = {} as Express.Multer.File

      const updatedAccount = {
        id: 1,
        name: 'Updated User',
        email: 'test@example.com',
        media: { id: 'media-id', url: 'http://example.com/media.jpg' },
      }
      ;(accountService.update as Mock).mockResolvedValue(updatedAccount)

      const result = await controller.update(request, updateAccountDto, 1, file)
      expect(accountService.update).toHaveBeenCalledWith(
        request.user,
        1,
        updateAccountDto,
        file,
      )
      expect(result).toEqual(updatedAccount)
    })

    it('should handle not found exception on update', async () => {
      const request = getRequest({ id: 999 })
      const updateAccountDto: UpdateAccountDto = {
        name: 'Not Found',
        password: 'senha1234',
        confirmPassword: 'senha1234',
      }
      ;(accountService.update as Mock).mockRejectedValue(
        new HttpException('Conta não encontrada', HttpStatus.NOT_FOUND),
      )

      await expect(
        controller.update(request, updateAccountDto, 99, undefined),
      ).rejects.toThrow('Conta não encontrada')
    })
  })
})
