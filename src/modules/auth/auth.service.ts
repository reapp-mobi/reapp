import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'

import { BackendErrorCodes } from '@app/types/errors'
import { ReappException } from '@app/utils/error.utils'
import { OAuth2Client } from 'google-auth-library'
import { ConfigService } from '../../config/config.service'
import { PrismaService } from '../../database/prisma.service'
import { LoginDto } from './dto/login.dto'
import { LoginGoogleDto } from './dto/loginGoogle.dto'

@Injectable()
export class AuthService {
  private client: OAuth2Client

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.client = new OAuth2Client(this.configService.GOOGLE_CLIENT_ID)
  }

  private async generateJwtToken(accountId: number): Promise<string> {
    return this.jwtService.sign(
      { sub: accountId },
      {
        secret: this.configService.JWT_SECRET,
        expiresIn: this.configService.JWT_EXPIRES_IN,
      },
    )
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<{ id: number; status: string } | null> {
    const user = await this.prismaService.account.findFirst({
      where: { email },
      select: {
        id: true,
        status: true,
        passwordHash: true,
      },
    })

    if (user) {
      if (await bcrypt.compare(password, user.passwordHash)) {
        return { id: user.id, status: user.status }
      }
    }
    return null
  }

  async login({ email, password }: LoginDto) {
    const user = await this.validateUser(email.toLowerCase(), password)
    if (!user) {
      throw new ReappException(BackendErrorCodes.INVALID_EMAIL_OR_PASSWORD)
    }
    if (user.status != 'ACTIVE') {
      throw new ReappException(BackendErrorCodes.PENDING_AUTHORIZATION)
    }
    const token = await this.generateJwtToken(user.id)
    return { token }
  }

  async loginWithGoogle(loginGoogleDto: LoginGoogleDto) {
    const { idToken } = loginGoogleDto

    const ticket = await this.client.verifyIdToken({ idToken })
    const payload = ticket.getPayload()

    if (!payload) {
      throw new ReappException(BackendErrorCodes.GOOGLE_AUTH_FAILED)
    }

    const email = payload?.email
    const user = await this.prismaService.account.findFirst({
      where: { email },
      select: { id: true },
    })

    if (!user) {
      throw new ReappException(BackendErrorCodes.USER_NOT_FOUND_ERROR)
    }

    const token = await this.generateJwtToken(user.id)
    return { token }
  }
}
