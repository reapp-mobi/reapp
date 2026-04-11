import { HttpException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigService } from '../../../config/config.service'
import { PrismaService } from '../../../database/prisma.service'
import { MercadopagoService } from '../../../services/mercadopago/mercadopago.service'
import { DonationService } from '../donation.service'
import { NotificationRequestDto } from '../dto/notification.dto'
import { DonationRequestBody } from '../dto/request-donation.dto'

const TEST_NOTIFICATION_URL = 'https://test.local/donation/notify'

const mockConfigService = {
  MERCADOPAGO_NOTIFICATION_URL: TEST_NOTIFICATION_URL,
}

describe('DonationService tests', () => {
  let service: DonationService
  let mercadopagoService: MercadopagoService
  let prismaService: PrismaService
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationService,
        {
          provide: MercadopagoService,
          useValue: {
            processPayment: vi.fn(),
            getPayment: vi.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            project: {
              findUnique: vi.fn(),
            },
            institution: {
              findUnique: vi.fn(),
            },
            account: {
              findUnique: vi.fn(),
            },
            donation: {
              create: vi.fn(),
              update: vi.fn(),
              findMany: vi.fn(),
              aggregate: vi.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<DonationService>(DonationService)
    mercadopagoService = module.get<MercadopagoService>(MercadopagoService)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('error case', () => {
    const requestDonationDto: DonationRequestBody = {
      amount: 10,
      institutionId: 1,
      projectId: 1,
      description: 'test',
    }
    it('should throw an error if the institution does not exist', async () => {
      ;(prismaService.institution.findUnique as Mock).mockResolvedValue(null)
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
      })
      requestDonationDto.projectId = null
      const accountId = 1
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Instituição não encontrada')
    })

    it('should throw an error if the project does not exist', async () => {
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
      })
      ;(prismaService.project.findUnique as Mock).mockResolvedValue(null)
      requestDonationDto.institutionId = null
      requestDonationDto.projectId = 1
      const accountId = 1
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Projeto não encontrado')
    })

    it('should throw an error if the amount is less than or equal to 0', async () => {
      requestDonationDto.amount = 0
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
      })
      const accountId = 1
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('A quantidade de doação não pode ser negativa')
    })

    it('should throw an error if the amount is less than 0.01', async () => {
      requestDonationDto.amount = 0.001
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
      })
      const accountId = 1
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Valor inválido')
    })

    it('should throw an error if account is not exists', async () => {
      ;(prismaService.account.findUnique as Mock).mockResolvedValue(null)
      const accountId = 1
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Usuário não encontrado')
    })

    it('should throw an error if account is an institution', async () => {
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
        institution: {
          id: 1,
        },
      })
      const accountId = 1
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Usuário é uma instituição e não pode fazer doações')
    })
  })

  describe('success case', () => {
    const requestDonationDto: DonationRequestBody = {
      amount: 10,
      institutionId: 1,
      projectId: 1,
      description: 'test',
    }

    it('should call mercadopagoService.processPayment with correct data when donate to a project', async () => {
      ;(prismaService.project.findUnique as Mock).mockResolvedValue({
        name: 'test',
      })
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
        donor: {
          id: 1,
        },
      })
      ;(mercadopagoService.processPayment as Mock).mockResolvedValue({
        id: 'test_id',
        init_point: 'https://test_url',
      })

      const accountId = 1
      await service.requestDonation(requestDonationDto, accountId)
      expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
        items: [
          {
            id: 'test',
            title: 'test',
            description: requestDonationDto.description,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: requestDonationDto.amount,
          },
        ],
        payer: {
          name: 'test',
          email: 'test@test.com',
        },
        external_reference: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        notification_url: TEST_NOTIFICATION_URL,
      })
    })

    it('should call mercadopagoService.processPayment with correct data when donate to a institution', async () => {
      ;(prismaService.institution.findUnique as Mock).mockResolvedValue({
        account: {
          name: 'test',
        },
      })
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
        donor: {
          id: 1,
        },
      })
      ;(mercadopagoService.processPayment as Mock).mockResolvedValue({
        id: 'test_id',
        init_point: 'https://test_url',
      })
      requestDonationDto.projectId = null
      requestDonationDto.institutionId = 1
      const accountId = 1
      await service.requestDonation(requestDonationDto, accountId)
      expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
        items: [
          {
            id: 'test',
            title: 'test',
            description: requestDonationDto.description,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: requestDonationDto.amount,
          },
        ],
        payer: {
          name: 'test',
          email: 'test@test.com',
        },
        external_reference: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        notification_url: TEST_NOTIFICATION_URL,
      })
    })

    it('should call mercadopagoService.processPayment with correct data with a general donation', async () => {
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
        donor: {
          id: 1,
        },
      })
      ;(mercadopagoService.processPayment as Mock).mockResolvedValue({
        id: 'test_id',
        init_point: 'https://test_url',
      })
      requestDonationDto.projectId = null
      requestDonationDto.institutionId = null

      const accountId = 1
      await service.requestDonation(requestDonationDto, accountId)
      expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
        items: [
          {
            id: 'Reapp',
            title: 'Reapp',
            description: requestDonationDto.description,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: requestDonationDto.amount,
          },
        ],
        payer: {
          name: 'test',
          email: 'test@test.com',
        },
        external_reference: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        notification_url: TEST_NOTIFICATION_URL,
      })
    })
  })

  describe('notifyDonation', () => {
    const data: NotificationRequestDto = {
      id: 123,
      live_mode: true,
      type: 'payment',
      date_created: '2021-08-25T14:00:00Z',
      user_id: 123,
      api_version: 'v1',
      action: 'payment.created',
      data: {
        id: '123',
      },
      topic: '',
      resource: '',
    }

    it('should throw an error if payment is not found', async () => {
      ;(mercadopagoService.getPayment as Mock).mockResolvedValue(null)
      await expect(service.notifyDonation(data)).rejects.toThrow(
        'Pagamento não encontrado',
      )
    })

    it('should call mercadopagoService.getPayment with correct data', async () => {
      ;(mercadopagoService.getPayment as Mock).mockResolvedValue({
        id: '123',
        status: 'approved',
        transaction_amount: 10,
      })
      await service.notifyDonation(data)
      expect(mercadopagoService.getPayment).toHaveBeenCalledWith('123')
    })

    it('should call prismaService.donation.update with correct data to approved', async () => {
      ;(mercadopagoService.getPayment as Mock).mockResolvedValue({
        id: '123',
        status: 'approved',
        transaction_amount: 10,
        external_reference: '1234',
      })
      await service.notifyDonation(data)
      expect(prismaService.donation.update).toHaveBeenCalledWith({
        data: {
          status: 'APPROVED',
        },
        where: {
          paymentTransactionId: '1234',
        },
      })
    })

    it('should call prismaService.donation.update with correct data to cancelled', async () => {
      ;(mercadopagoService.getPayment as Mock).mockResolvedValue({
        id: '123',
        status: 'cancelled',
        transaction_amount: 10,
        external_reference: '1234',
      })
      await service.notifyDonation(data)
      expect(prismaService.donation.update).toHaveBeenCalledWith({
        data: {
          status: 'CANCELED',
        },
        where: {
          paymentTransactionId: '1234',
        },
      })
    })

    it('should call prismaService.donation.update with correct data to rejected', async () => {
      ;(mercadopagoService.getPayment as Mock).mockResolvedValue({
        id: '123',
        status: 'rejected',
        transaction_amount: 10,
        external_reference: '1234',
      })
      await service.notifyDonation(data)
      expect(prismaService.donation.update).toHaveBeenCalledWith({
        data: {
          status: 'REJECTED',
        },
        where: {
          paymentTransactionId: '1234',
        },
      })
    })

    it('should not call prismaService.donation.update if status is not approved, cancelled or rejected', async () => {
      ;(mercadopagoService.getPayment as Mock).mockResolvedValue({
        id: '123',
        status: 'in_process',
        transaction_amount: 10,
      })
      await service.notifyDonation(data)
      expect(prismaService.donation.update).not.toHaveBeenCalled()
    })
  })
  describe('getDonationsByInstitution', () => {
    it('should throw error if no user is provided', async () => {
      await expect(
        service.getDonationsByInstitution(null, 1, 10, 'week'),
      ).rejects.toThrow(HttpException)
    })

    it('should throw error if the user is not associated to an institution', async () => {
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        institution: null,
      })
      const user = { id: 1 }
      await expect(
        service.getDonationsByInstitution(user, 1, 10, 'week'),
      ).rejects.toThrow(HttpException)
    })

    it('should return donations data for institution', async () => {
      const user = { id: 1 }
      const institutionId = 100
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        institution: { id: institutionId },
      })

      const mockDonations = [{ id: 1, createdAt: new Date() }]
      const mockTotals = { _sum: { amount: 200 }, _count: 3 }
      ;(prismaService.donation.findMany as Mock).mockResolvedValue(
        mockDonations,
      )
      ;(prismaService.donation.aggregate as Mock).mockResolvedValue(mockTotals)

      const result = await service.getDonationsByInstitution(
        user,
        1,
        10,
        'month',
      )

      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: +user.id },
        select: { institution: { select: { id: true } } },
      })
      expect(result).toEqual({
        donations: mockDonations,
        totalAmount: mockTotals._sum.amount,
        totalDonations: mockTotals._count,
      })
    })
  })
  describe('getGeneralDonations', () => {
    it('should throw error if no user is provided', async () => {
      await expect(
        service.getGeneralDonations(null, 1, 10, 'week'),
      ).rejects.toThrow(HttpException)
    })

    it('should throw error if the user is not associated to an institution', async () => {
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        institution: null,
      })
      const user = { id: 1 }
      await expect(
        service.getGeneralDonations(user, 1, 10, 'week'),
      ).rejects.toThrow(HttpException)
    })

    it('should return general donations data (with period "all")', async () => {
      const user = { id: 1 }
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        institution: { id: 200 },
      })
      const mockDonations = [{ id: 2, createdAt: new Date() }]
      const mockTotals = { _sum: { amount: 50 }, _count: 1 }
      ;(prismaService.donation.findMany as Mock).mockResolvedValue(
        mockDonations,
      )
      ;(prismaService.donation.aggregate as Mock).mockResolvedValue(mockTotals)

      const result = await service.getGeneralDonations(user, 1, 10, 'all')
      expect(result).toEqual({
        donations: mockDonations,
        totalAmount: mockTotals._sum.amount,
        totalDonations: mockTotals._count,
      })
    })
  })

  describe('getProjectsDonationsByInstitution', () => {
    it('should throw error if no user is provided', async () => {
      await expect(
        service.getProjectsDonationsByInstitution(null, 1, 10, 'week'),
      ).rejects.toThrow(HttpException)
    })

    it('should throw error if the user is not associated to an institution', async () => {
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        institution: null,
      })
      const user = { id: 1 }
      await expect(
        service.getProjectsDonationsByInstitution(user, 1, 10, 'week'),
      ).rejects.toThrow(HttpException)
    })

    it('should return projects donations data for institution', async () => {
      const user = { id: 1 }
      const institutionId = 300
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        institution: { id: institutionId },
      })
      const mockDonations = [{ id: 3, createdAt: new Date() }]
      const mockTotals = { _sum: { amount: 350 }, _count: 4 }
      ;(prismaService.donation.findMany as Mock).mockResolvedValue(
        mockDonations,
      )
      ;(prismaService.donation.aggregate as Mock).mockResolvedValue(mockTotals)

      const result = await service.getProjectsDonationsByInstitution(
        user,
        1,
        10,
        'week',
      )

      expect(result).toEqual({
        donations: mockDonations,
        totalAmount: mockTotals._sum.amount,
        totalDonations: mockTotals._count,
      })
    })
  })

  describe('getDonationsByDonor', () => {
    it('should throw error if the logged user is different from the donor', async () => {
      const user = { id: 1 }
      // Simula que a conta possui um doador com id diferente
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        id: 1,
        donor: { id: 2 },
      })
      await expect(
        service.getDonationsByDonor(3, 1, 10, null, null, user, 'week'),
      ).rejects.toThrow(HttpException)
    })

    it('should return donations by donor with institutionId and projectId filters', async () => {
      const user = { id: 1, donor: { id: 1 } }
      // Conta com doador correspondente
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        id: 1,
        donor: { id: 1 },
      })
      const mockDonations = [{ id: 4, createdAt: new Date() }]
      const mockTotals = { _sum: { amount: 150 }, _count: 3 }
      ;(prismaService.donation.findMany as Mock).mockResolvedValue(
        mockDonations,
      )
      ;(prismaService.donation.aggregate as Mock).mockResolvedValue(mockTotals)

      const result = await service.getDonationsByDonor(
        1,
        1,
        10,
        5,
        10,
        user,
        'month',
      )

      expect(result).toEqual({
        donations: mockDonations,
        totalAmount: mockTotals._sum.amount,
        totalDonations: mockTotals._count,
      })
    })

    it('should return donations by donor without institutionId and projectId filters', async () => {
      const user = { id: 1, donor: { id: 1 } }
      ;(prismaService.account.findUnique as Mock).mockResolvedValue({
        id: 1,
        donor: { id: 1 },
      })
      const mockDonations = [{ id: 5, createdAt: new Date() }]
      const mockTotals = { _sum: { amount: 75 }, _count: 1 }
      ;(prismaService.donation.findMany as Mock).mockResolvedValue(
        mockDonations,
      )
      ;(prismaService.donation.aggregate as Mock).mockResolvedValue(mockTotals)

      const result = await service.getDonationsByDonor(
        1,
        1,
        10,
        null,
        null,
        user,
        'week',
      )

      expect(result).toEqual({
        donations: mockDonations,
        totalAmount: mockTotals._sum.amount,
        totalDonations: mockTotals._count,
      })
    })
  })
})
