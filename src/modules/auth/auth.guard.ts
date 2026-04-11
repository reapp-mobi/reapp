import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'

import { BackendErrorCodes } from '@app/types/errors'
import { ReappException } from '@app/utils/error.utils'
import { Request } from 'express'
import { ConfigService } from '../../config/config.service'
import { PrismaService } from '../../database/prisma.service'
import { ROLES_KEY } from './docorators/roles.decorator'
import { Role } from './enums/role.enum'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const roles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler())

    const token = this.extractTokenFromHeader(request)
    if (!token) {
      throw new ReappException(BackendErrorCodes.INVALID_TOKEN_ERROR)
    }

    let accountId: number
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.JWT_SECRET,
      })
      accountId = payload.sub
    } catch {
      throw new ReappException(BackendErrorCodes.INVALID_TOKEN_ERROR)
    }

    if (!accountId) {
      throw new ReappException(BackendErrorCodes.INVALID_TOKEN_ERROR)
    }

    request['user'] = { id: accountId }

    if (!roles) {
      return true
    }

    const account = await this.prismaService.account.findUnique({
      where: { id: accountId },
      select: { accountType: true },
    })

    if (!account) {
      throw new ReappException(BackendErrorCodes.INVALID_TOKEN_ERROR)
    }

    const hasRole = () => roles.some((role) => account.accountType === role)
    if (!hasRole()) {
      throw new ReappException(BackendErrorCodes.USER_NOT_AUTHORIZED_ERROR)
    }

    return true
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
