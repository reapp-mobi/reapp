import { Injectable } from '@nestjs/common'
import { Prisma, Report } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { IApiResponse } from '../../types/api-response'
import { BackendErrorCodes } from '../../types/errors'
import { PaginatedResponse } from '../../types/paginated.response'
import { ReappException } from '../../utils/error.utils'
import { CreateReportData } from './dto/create-report.dto'
import { ListReportQuery } from './dto/list-report.dto'
import { UpdateReportData } from './dto/update-report.dto'

@Injectable()
export class ReportService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    reporterId: number,
    { details, reason, targetId, targetType }: CreateReportData,
  ): Promise<IApiResponse<Report>> {
    const report = await this.prismaService.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason,
        details,
      },
    })

    return {
      success: true,
      message: 'Denúncia registrada com sucesso.',
      data: report,
    }
  }

  async findAll(query: ListReportQuery): Promise<PaginatedResponse<Report>> {
    const { offset, limit, resolved, targetType, reason } = query

    const where: Prisma.ReportWhereInput = {
      ...(resolved !== undefined ? { resolved } : {}),
      ...(targetType ? { targetType } : {}),
      ...(reason ? { reason } : {}),
    }

    const [reports, total] = await Promise.all([
      this.prismaService.report.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prismaService.report.count({ where }),
    ])

    const buildLink = (newOffset: number) =>
      `/report?offset=${newOffset}&limit=${limit}`

    return {
      data: reports,
      meta: { offset, limit, total },
      links: {
        self: buildLink(offset),
        next: buildLink(offset + limit),
        prev: buildLink(Math.max(0, offset - limit)),
      },
    }
  }

  async findOne(id: string): Promise<IApiResponse<Report>> {
    const report = await this.prismaService.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!report) {
      throw new ReappException(BackendErrorCodes.REPORT_NOT_FOUND_ERROR, { id })
    }

    return {
      success: true,
      message: 'Denúncia encontrada.',
      data: report,
    }
  }

  async update(
    id: string,
    { resolved }: UpdateReportData,
  ): Promise<IApiResponse<Report>> {
    const exists = await this.prismaService.report.findUnique({ where: { id } })
    if (!exists) {
      throw new ReappException(BackendErrorCodes.REPORT_NOT_FOUND_ERROR, { id })
    }

    const report = await this.prismaService.report.update({
      where: { id },
      data: { resolved },
    })

    return {
      success: true,
      message: 'Denúncia atualizada com sucesso.',
      data: report,
    }
  }

  async countPending(): Promise<IApiResponse<{ pending: number }>> {
    const pending = await this.prismaService.report.count({
      where: { resolved: false },
    })

    return {
      success: true,
      message: 'Total de denúncias pendentes.',
      data: { pending },
    }
  }
}
