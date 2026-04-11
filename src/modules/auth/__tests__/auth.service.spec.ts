import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigService } from '../../../config/config.service'
import { PrismaService } from '../../../database/prisma.service'
import { BackendErrorCodes } from '../../../types/errors'
import { ReappException } from '../../../utils/error.utils'
import { AuthService } from '../auth.service'
import { LoginDto } from '../dto/login.dto'
import { LoginGoogleDto } from '../dto/loginGoogle.dto'

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
  compare: vi.fn(),
}))

const mockPrismaService = {
  account: {
    findFirst: vi.fn(),
  },
}

const mockJwtService = {
  sign: vi.fn(),
}

const mockOAuth2Client = {
  verifyIdToken: vi.fn(),
}

const mockConfigService = {
  JWT_SECRET: 'test_secret',
  JWT_EXPIRES_IN: '7d',
  GOOGLE_CLIENT_ID: 'test_google_client_id',
}

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: OAuth2Client, useValue: mockOAuth2Client },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
  })

  it('should be defined', () => {
    expect(authService).toBeDefined()
  })

  describe('validateUser', () => {
    const email = 'test@example.com'
    const password = 'password'

    it('should return user data if email and password are valid', async () => {
      const user = {
        id: 1,
        email,
        passwordHash: 'hashed_password',
      }
      mockPrismaService.account.findFirst.mockResolvedValue(user)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const result = await authService.validateUser(email, password)
      expect(result).toEqual({ id: 1, email })
    })

    it('should return null if password is invalid', async () => {
      const user = {
        id: 1,
        email,
        passwordHash: 'hashed_password',
      }
      mockPrismaService.account.findFirst.mockResolvedValue(user)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

      const result = await authService.validateUser(email, password)
      expect(result).toBeNull()
    })

    it('should return null if user does not exist', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue(null)

      const result = await authService.validateUser(email, password)
      expect(result).toBeNull()
    })
  })

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password',
    }

    it('should throw an error if credentials are invalid', async () => {
      vi.spyOn(authService, 'validateUser').mockResolvedValue(null)

      await expect(authService.login(loginDto)).rejects.toThrowError(
        new ReappException(BackendErrorCodes.INVALID_EMAIL_OR_PASSWORD),
      )
    })

    it('should throw an error if account is not active', async () => {
      const user = {
        id: 1,
        email: loginDto.email,
        status: 'PENDING',
      } as Partial<Account>
      vi.spyOn(authService, 'validateUser').mockResolvedValue(user)

      await expect(authService.login(loginDto)).rejects.toThrowError(
        new ReappException(BackendErrorCodes.PENDING_AUTHORIZATION),
      )
    })

    it('should return token and user if credentials are valid', async () => {
      const user = {
        id: 1,
        email: loginDto.email,
        status: 'ACTIVE',
      } as Partial<Account>
      vi.spyOn(authService, 'validateUser').mockResolvedValue(user)
      mockJwtService.sign.mockReturnValue('mockToken')

      const result = await authService.login(loginDto)
      expect(result).toEqual({ token: 'mockToken', user })
    })
  })

  describe('loginWithGoogle', () => {
    const loginGoogleDto: LoginGoogleDto = {
      idToken: 'google_token',
    }

    it('should throw an error if google verification fails', async () => {
      vi.spyOn(authService['client'], 'verifyIdToken').mockResolvedValue({
        getPayload: () => null,
      } as any)

      await expect(
        authService.loginWithGoogle(loginGoogleDto),
      ).rejects.toThrowError(
        new ReappException(BackendErrorCodes.GOOGLE_AUTH_FAILED),
      )
    })

    it('should throw an error if user is not found', async () => {
      vi.spyOn(authService['client'], 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({ email: 'test@example.com' }),
      } as any)
      mockPrismaService.account.findFirst.mockResolvedValue(null)

      await expect(
        authService.loginWithGoogle(loginGoogleDto),
      ).rejects.toThrowError(
        new ReappException(BackendErrorCodes.USER_NOT_FOUND_ERROR),
      )
    })

    it('should return token and user if google login is successful', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      }
      vi.spyOn(authService['client'], 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({ email: 'test@example.com' }),
      } as any)
      mockPrismaService.account.findFirst.mockResolvedValue(user)
      mockJwtService.sign.mockReturnValue('mockToken')

      const result = await authService.loginWithGoogle(loginGoogleDto)
      expect(result).toEqual({ token: 'mockToken', user })
    })
  })
})
