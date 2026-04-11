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
import { Account } from '@prisma/client'
import { Request } from 'express'
import { AuthGuard } from '../auth/auth.guard'
import { AccountService } from './account.service'
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from './dto/create-account.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateAccountDto } from './dto/update-account.dto'

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @UseInterceptors(FileInterceptor('media'))
  create(
    @Body() createAccountDto: CreateAccountDto,
    @UploadedFile() media: Express.Multer.File,
  ) {
    return this.accountService.create(createAccountDto, media)
  }

  @Post('google')
  createWithGoogle(@Body() createAccountGoogleDto: CreateAccountGoogleDto) {
    return this.accountService.createWithGoogle(createAccountGoogleDto)
  }

  @Get('categories')
  findAllCategories() {
    return this.accountService.findAllCategories()
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

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.accountService.resetPassword(body)
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
