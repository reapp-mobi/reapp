import { Test, TestingModule } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigService } from '../../config/config.service'
import { MercadopagoService } from './mercadopago.service'

const mockConfigService = {
  MERCADOPAGO_ACCESS_TOKEN: 'test_access_token',
}

const createMock = vi.fn()
const getMock = vi.fn()

vi.mock('mercadopago', () => {
  return {
    Preference: vi.fn(
      class {
        create = createMock
      },
    ),
    Payment: vi.fn(
      class {
        get = getMock
      },
    ),
    MercadoPagoConfig: vi.fn(class {}),
  }
})

describe('MercadopagoService', () => {
  let service: MercadopagoService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadopagoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<MercadopagoService>(MercadopagoService)
    createMock.mockClear()
    getMock.mockClear()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('processPayment', () => {
    it('should call mercadopago.create with correct data', async () => {
      const data = {
        items: [
          {
            id: '1',
            title: 'Test',
            description: 'Test description',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: 10,
          },
        ],
        payer: {
          name: 'Test',
          email: 'test@test.com',
        },
        notification_url: 'https://test.com/webhook',
      }
      const response = {
        body: {
          init_point: 'https://test.com/payment',
        },
      }
      createMock.mockResolvedValue(response as any)
      const result = await service.processPayment(data)
      expect(createMock).toHaveBeenCalledWith({
        body: data,
      })
      expect(result).toEqual(response)
    })

    it('should return error if mercadopago.create throws an error', async () => {
      const data = {
        items: [
          {
            id: '1',
            title: 'Test',
            description: 'Test description',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: 10,
          },
        ],
        payer: {
          name: 'Test',
          email: 'test@test.com',
        },
        notification_url: 'https://test.com/webhook',
      }
      const error = new Error('Test error')
      createMock.mockRejectedValue(error)
      const result = await service.processPayment(data)
      expect(createMock).toHaveBeenCalledWith({
        body: data,
      })
      expect(result).toEqual(error)
    })
  })

  describe('getPayment', () => {
    it('should call mercadopago.get with correct data', async () => {
      const preferenceId = '123'
      const response = {
        body: {
          status: 'approved',
        },
      }
      getMock.mockResolvedValue(response as any)

      const result = await service.getPayment(preferenceId)

      expect(getMock).toHaveBeenCalledWith({
        id: preferenceId,
      })
      expect(result).toEqual(response)
    })

    it('should return error if mercadopago.get throws an error', async () => {
      const preferenceId = '123'
      const error = new Error('Test error')
      getMock.mockRejectedValue(error)

      const result = await service.getPayment(preferenceId)

      expect(getMock).toHaveBeenCalledWith({
        id: preferenceId,
      })
      expect(result).toEqual(error)
    })
  })
})
