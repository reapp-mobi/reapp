import { ZodValidationPipe } from '@app/common/zod.validation.pipe'
import { Body, Controller, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  PasswordRecoveryDto,
  passwordRecoverySchema,
} from './dto/password-recovery.dto'
import {
  SendRecoveryEmailDto,
  sendRecoveryEmailSchema,
} from './dto/send-recovery-email.dto'
import { PasswordRecoveryService } from './password-recovery.service'

@Controller('password-recovery')
export class PasswordRecoveryController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  // Token+code verification: tight per-minute cap to prevent code brute-force.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  async recoveryPassword(
    @Body(new ZodValidationPipe(passwordRecoverySchema))
    { token, code }: PasswordRecoveryDto,
  ) {
    return this.passwordRecoveryService.recoveryPassword(token, code)
  }

  // Email dispatch: long-window cap to prevent email-bombing / abuse.
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @Post('send-email')
  async sendRecoveryEmail(
    @Body(new ZodValidationPipe(sendRecoveryEmailSchema)) {
      email,
    }: SendRecoveryEmailDto,
  ) {
    return this.passwordRecoveryService.sendRecoveryEmail(email)
  }
}
