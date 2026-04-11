import { ZodValidationPipe } from '@app/common/zod.validation.pipe'
import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Post } from '@nestjs/common'
import { Request } from 'express'
import { AuthGuard } from '../auth/auth.guard'
import { DonationService } from './donation.service'
import {
  DonationRequestBody,
  requestDonationSchema,
} from './dto/request-donation.dto'

@Controller('donation')
export class DonationController {
  private readonly logger = new Logger(DonationController.name)
  constructor(private readonly donationService: DonationService) {}

  @Post('request')
  @UseGuards(AuthGuard)
  requestDonation(
    @Body(new ZodValidationPipe(requestDonationSchema))
    requestDonationDto: DonationRequestBody,
    @Req() req: Request,
  ) {
    this.logger.log(
      { donation_info: requestDonationDto, requester: req.user.id },
      'Reciving donation notify',
    )
    const accountId = req.user.id
    return this.donationService.requestDonation(
      requestDonationDto,
      Number(accountId),
    )
  }

  @UseGuards(AuthGuard)
  @Get('institution/general')
  async findGeneralDonations(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('period') period: string = 'week',
    @Req() req: Request,
  ) {
    return this.donationService.getGeneralDonations(
      req.user,
      page,
      limit,
      period as 'week' | 'month' | '6months' | 'year' | 'all',
    )
  }

  @UseGuards(AuthGuard)
  @Get('institution/projects')
  findProjectsDonationsByInstitution(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('period') period: string = 'week',
    @Req() req: Request,
  ) {
    return this.donationService.getProjectsDonationsByInstitution(
      req.user,
      page,
      limit,
      period as 'week' | 'month' | '6months' | 'year' | 'all',
    )
  }

  @UseGuards(AuthGuard)
  @Get('institution')
  findByInstitution(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('period') period: string = 'week',
    @Req() req: Request,
  ) {
    return this.donationService.getDonationsByInstitution(
      req.user,
      page,
      limit,
      period as 'week' | 'month' | '6months' | 'year' | 'all',
    )
  }

  @UseGuards(AuthGuard)
  @Get('institution/:institutionId')
  findByInstitutionId(
    @Param('institutionId') institutionId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: Request,
  ) {
    const { user } = req
    return this.donationService.getDonationsByInstitutionId(
      +institutionId,
      +page,
      +limit,
      user,
    )
  }

  @UseGuards(AuthGuard)
  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: Request,
  ) {
    return this.donationService.getDonationsByInstitutionId(
      projectId,
      page,
      limit,
      req.user,
    )
  }

  @UseGuards(AuthGuard)
  @Get('donor/:donorId')
  findByDonor(
    @Req() req: Request,
    @Param('donorId') donorId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('institutionId') institutionId?: number,
    @Query('projectId') projectId?: number,
    @Query('period') period: string = 'week',
  ) {
    const user = req.user
    const parsedInstitutionId = institutionId ? +institutionId : null
    const parsedProjectId = projectId ? +projectId : null

    return this.donationService.getDonationsByDonor(
      +donorId,
      +page,
      +limit,
      parsedInstitutionId,
      parsedProjectId,
      user,
      period as 'week' | 'month' | '6months' | 'year' | 'all',
    )
  }

  @Post('notify')
  notifyDonation(@Body() body: any) {
    this.logger.log({ notify_body: body }, 'Reciving donation notify')
    return this.donationService.notifyDonation(body)
  }
}
