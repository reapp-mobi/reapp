import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { Account } from '@prisma/client'
import { Request } from 'express'
import { AuthGuard } from '../auth/auth.guard'
import { Roles } from '../auth/docorators/roles.decorator'
import { Role } from '../auth/enums/role.enum'
import { AccountService } from './account.service'
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from './dto/create-account.dto'
import { GetAccountsQuery } from './dto/get-account-query.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateAccountStatusDto } from './dto/update-account-dto'
import { UpdateAccountDto } from './dto/update-account.dto'

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  // Registration: long-window cap to curb automated account farming.
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @Post()
  @UseInterceptors(FileInterceptor('media'))
  create(
    @Body() createAccountDto: CreateAccountDto,
    @UploadedFile() media: Express.Multer.File,
  ) {
    return this.accountService.create(createAccountDto, media)
  }

  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @Post('google')
  createWithGoogle(@Body() createAccountGoogleDto: CreateAccountGoogleDto) {
    return this.accountService.createWithGoogle(createAccountGoogleDto)
  }

  @Get('categories')
  findAllCategories() {
    return this.accountService.findAllCategories()
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Get()
  findAll(@Query() query: GetAccountsQuery) {
    return this.accountService.findAll(query)
  }

  @UseGuards(AuthGuard)
  @Post('follow/:id')
  follow(@Req() request: Request, @Param('id') id: number) {
    const userId = request.user.id
    return this.accountService.followAccount(userId, +id)
  }

  @UseGuards(AuthGuard)
  @Delete('unfollow/:id')
  unfollow(@Req() request: Request, @Param('id') id: number) {
    const userId = request.user.id
    return this.accountService.unfollowAccount(userId, +id)
  }

  @UseGuards(AuthGuard)
  @Get('institution')
  findAllInstitutions(@Req() request: Request) {
    const userId = request.user.id
    return this.accountService.findAllInstitutions(userId)
  }

  @UseGuards(AuthGuard)
  @Get('blocked/list')
  getBlockedUsers(@Req() request: Request) {
    const userId = request.user.id
    return this.accountService.getBlockedUsers(userId)
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(+id)
  }

  @UseGuards(AuthGuard)
  @Get('institution/:id')
  findOneInsitution(@Param('id') id: string, @Req() request: Request) {
    const userId = request.user.id
    return this.accountService.findOneInstitution(+id, userId)
  }

  @UseGuards(AuthGuard)
  @Get('donor/:id')
  findOneDonor(@Param('id') id: string) {
    return this.accountService.findOneDonor(+id)
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: Request) {
    const accountId = request.user.id
    return this.accountService.remove(accountId, +id)
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  @UseInterceptors(FileInterceptor('media'))
  async update(
    @Req() request: Request,
    @Body() body: UpdateAccountDto,
    @Param('id') id: number,
    @UploadedFile() media: Express.Multer.File,
  ) {
    const user = request.user as Account
    return this.accountService.update(user, +id, body, media)
  }

  // Reset-password uses the recovery token; cap retries like other auth flows.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.accountService.resetPassword(body)
  }

  @UseGuards(AuthGuard)
  @Roles(Role.Admin)
  @Patch(':id/status')
  updateStatus(@Param('id') id: number, @Body() body: UpdateAccountStatusDto) {
    return this.accountService.updateStatus(+id, body.status)
  }

  @UseGuards(AuthGuard)
  @Post('block/:id')
  block(@Req() request: Request, @Param('id') id: number) {
    const userId = request.user.id
    return this.accountService.blockAccount(userId, +id)
  }

  @UseGuards(AuthGuard)
  @Delete('unblock/:id')
  unblock(@Req() request: Request, @Param('id') id: number) {
    const userId = request.user.id
    return this.accountService.unblockAccount(userId, +id)
  }
}
