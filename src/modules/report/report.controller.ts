import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { ZodValidationPipe } from '../../common/zod.validation.pipe'
import { AuthGuard } from '../auth/auth.guard'
import { Roles } from '../auth/docorators/roles.decorator'
import { Role } from '../auth/enums/role.enum'
import { CreateReportData, createReportSchema } from './dto/create-report.dto'
import { ListReportQuery, listReportSchema } from './dto/list-report.dto'
import { UpdateReportData, updateReportSchema } from './dto/update-report.dto'
import { ReportService } from './report.service'

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() request: Request,
    @Body(new ZodValidationPipe(createReportSchema))
    createReportData: CreateReportData,
  ) {
    const reporterId = request.user.id
    return this.reportService.create(reporterId, createReportData)
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Get()
  findAll(
    @Query(new ZodValidationPipe(listReportSchema))
    query: ListReportQuery,
  ) {
    return this.reportService.findAll(query)
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Get('pending/count')
  countPending() {
    return this.reportService.countPending()
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id)
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateReportSchema))
    body: UpdateReportData,
  ) {
    return this.reportService.update(id, body)
  }
}
