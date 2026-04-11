import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'

import { BackendErrorCodes } from '@app/types/errors'
import { ReappException } from '@app/utils/error.utils'
import { Request } from 'express'
import { ConfigService } from '../../config/config.service'
import { ROLES_KEY } from './docorators/roles.decorator'
import { Role } from './enums/role.enum'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const roles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler())

    const token = this.extractTokenFromHeader(request)
    if (!token) {
      throw new ReappException(BackendErrorCodes.INVALID_TOKEN_ERROR)
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.JWT_SECRET,
      })
      request['user'] = payload.user
    } catch {
      throw new ReappException(BackendErrorCodes.INVALID_TOKEN_ERROR)
    }

    if (!roles) {
      return true
    }

    const userRoles = request['user'].accountType as Role[]
    const hasRole = () => roles.some((role) => userRoles.includes(role))
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
