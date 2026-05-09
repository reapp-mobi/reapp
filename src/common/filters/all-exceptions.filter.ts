import { BackendErrorCodes } from '@app/types/errors'
import { ReappException } from '@app/utils/error.utils'
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { PinoLogger } from 'nestjs-pino'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name)
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request & { id?: string }>()
    const correlationId = request?.id

    if (exception instanceof ReappException) {
      return response
        .status(exception.getStatus())
        .json(exception.getResponse())
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message

      return response.status(status).json({
        code: (exceptionResponse as any).code || 'HTTP_ERROR',
        message,
        data: (exceptionResponse as any).data || [],
      })
    }

    // Transform unhandled errors into INTERNAL_SERVER_ERROR (ReappException)
    this.logger.error({ err: exception, correlationId }, 'Unhandled exception')

    const internalError = new ReappException(
      BackendErrorCodes.INTERNAL_SERVER_ERROR,
    )
    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(internalError.getResponse())
  }
}
