import { paginationSchema } from '@app/common/schemas/pagination.schema'
import { ZodValidationPipe } from '@app/common/zod.validation.pipe'
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import { GetAccountsQuery } from '../account/dto/get-account-query.dto'
import { UpdateAccountStatusDto } from '../account/dto/update-account-dto'
import { AuthGuard } from '../auth/auth.guard'
import { Roles } from '../auth/docorators/roles.decorator'
import { Role } from '../auth/enums/role.enum'
import { AdminService } from './admin.service'

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Get('accounts')
  findAllAccounts(@Query() query: GetAccountsQuery) {
    return this.adminService.findAllAccounts(query)
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Patch('accounts/:id/status')
  updateAccountStatus(
    @Param('id') id: number,
    @Body() body: UpdateAccountStatusDto,
  ) {
    return this.adminService.updateAccountStatus(+id, body.status)
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Get('donations')
  findAllDonations(
    @Query(new ZodValidationPipe(paginationSchema)) { offset, limit },
  ) {
    return this.adminService.findAllDonations(offset, limit)
  }
}
