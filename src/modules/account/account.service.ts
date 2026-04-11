import { BackendErrorCodes } from '@app/types/errors'
import { ReappException } from '@app/utils/error.utils'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { AccountStatus, AccountType, Prisma } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { ConfigService } from '../../config/config.service'
import { PrismaService } from '../../database/prisma.service'
import { MediaService } from '../media-attachment/media-attachment.service'
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from './dto/create-account.dto'
import { GetAccountsQuery } from './dto/get-account-query.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateAccountDto } from './dto/update-account.dto'

const donorResponseFields = {
  id: true,
  email: true,
  name: true,
  donor: {
    select: {
      donations: true,
      id: true,
    },
  },
  avatarId: true,
  media: true,
  institution: true,
  createdAt: true,
  updatedAt: true,
  accountType: true,
  note: true,
}

const institutionResponseFields = {
  id: true,
  email: true,
  name: true,
  institution: {
    select: {
      cnpj: true,
      phone: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  },
  avatarId: true,
  media: true,
  accountType: true,
  note: true,
}

const PASSWORD_HASH_SALT = 10

@Injectable()
export class AccountService {
  private client: OAuth2Client
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(AccountService.name) private readonly logger: PinoLogger,
  ) {
    this.client = new OAuth2Client(this.configService.GOOGLE_CLIENT_ID)
  }

  private async createInstitution(
    createAccountDto: CreateAccountDto,
    media?: Express.Multer.File,
  ) {
    const email = createAccountDto.email.toLowerCase()

    try {
      return await this.prismaService.$transaction(async (tx) => {
        const [emailExists, cnpjExists] = await Promise.all([
          tx.account.findFirst({ where: { email } }),
          tx.institution.findFirst({ where: { cnpj: createAccountDto.cnpj } }),
        ])

        if (emailExists) {
          this.logger.warn({ email }, 'createInstitution: email já cadastrado')
          throw new ReappException(BackendErrorCodes.EMAIL_ALREADY_REGISTERED)
        }
        if (cnpjExists) {
          this.logger.warn(
            { cnpj: createAccountDto.cnpj },
            'createInstitution: cnpj já cadastrado',
          )
          throw new ReappException(BackendErrorCodes.CNPJ_ALREADY_REGISTERED, {
            cnpj: createAccountDto.cnpj,
          })
        }

        let category = await tx.category.findFirst({
          where: { name: createAccountDto.category },
        })
        if (!category) {
          category = await tx.category.create({
            data: { name: createAccountDto.category },
          })
        }

        const hashedPassword = await bcrypt.hash(
          createAccountDto.password,
          PASSWORD_HASH_SALT,
        )

        const account = await tx.account.create({
          data: {
            accountType: AccountType.INSTITUTION,
            email,
            passwordHash: hashedPassword,
            name: createAccountDto.name,
            note: createAccountDto.note,
            institution: {
              create: {
                fields: { createMany: { data: [] } },
                category: { connect: { id: category.id } },
                cnpj: createAccountDto.cnpj,
                phone: createAccountDto.phone,
              },
            },
            status: AccountStatus.PENDING,
          },
          select: { id: true },
        })

        if (media) {
          if (!media.mimetype.startsWith('image/')) {
            this.logger.warn(
              { email, mimetype: media.mimetype },
              'createInstitution: avatar não é imagem',
            )
            throw new ReappException(BackendErrorCodes.AVATAR_MUST_BE_IMAGE)
          }

          try {
            const { mediaAttachment } = await this.mediaService.processMedia(
              media,
              { accountId: account.id },
              tx,
            )

            await tx.account.update({
              where: { id: account.id },
              data: { avatarId: mediaAttachment.id },
              select: { id: true },
            })
          } catch (err) {
            this.logger.error(
              { err, email },
              'createInstitution: falha ao processar avatar',
            )
            throw err
          }
        }

        return tx.account.findUnique({
          where: { id: account.id },
          select: institutionResponseFields,
        })
      })
    } catch (err) {
      if (err instanceof HttpException) throw err
      this.logger.error(
        { err, email, cnpj: createAccountDto.cnpj },
        'createInstitution: erro inesperado',
      )
      throw new ReappException(BackendErrorCodes.INTERNAL_SERVER_ERROR)
    }
  }

  private async createDonor(
    createAccountDto: CreateAccountDto,
    media?: Express.Multer.File,
  ) {
    const email = createAccountDto.email.toLowerCase()

    try {
      return await this.prismaService.$transaction(async (tx) => {
        const emailExists = await tx.account.findFirst({ where: { email } })
        if (emailExists) {
          this.logger.warn({ email }, 'createDonor: email já cadastrado')
          throw new ReappException(BackendErrorCodes.EMAIL_ALREADY_REGISTERED, {
            email,
          })
        }

        const hashedPassword = await bcrypt.hash(
          createAccountDto.password,
          PASSWORD_HASH_SALT,
        )
        const { id: accountId } = await tx.account.create({
          data: {
            accountType: AccountType.DONOR,
            email,
            passwordHash: hashedPassword,
            name: createAccountDto.name,
            note: createAccountDto.note,
            status: AccountStatus.ACTIVE,
            donor: { create: {} },
          },
          select: { id: true },
        })

        if (media) {
          if (!media.mimetype.startsWith('image/')) {
            this.logger.warn(
              { email, mimetype: media.mimetype },
              'createDonor: avatar não é imagem',
            )
            throw new ReappException(BackendErrorCodes.AVATAR_MUST_BE_IMAGE)
          }

          try {
            const { mediaAttachment } = await this.mediaService.processMedia(
              media,
              { accountId },
              tx,
            )

            await tx.account.update({
              where: { id: accountId },
              data: { avatarId: mediaAttachment.id },
              select: { id: true },
            })
          } catch (err) {
            this.logger.error(
              { err, email },
              'createDonor: falha ao processar avatar',
            )
            throw err
          }
        }

        return tx.account.findUnique({
          where: { id: accountId },
          select: donorResponseFields,
        })
      })
    } catch (err) {
      if (err instanceof HttpException) throw err
      this.logger.error({ err, email }, 'createDonor: erro inesperado')
      throw new ReappException(BackendErrorCodes.INTERNAL_SERVER_ERROR)
    }
  }

  private get accountResponseFields(): Prisma.AccountSelect {
    return Object.keys(Prisma.AccountScalarFieldEnum).reduce(
      (fields, field) => {
        fields[field] = true
        return fields
      },
      {} as Prisma.AccountSelect,
    )
  }

  async create(
    createAccountDto: CreateAccountDto,
    media?: Express.Multer.File,
  ) {
    if (createAccountDto.accountType === AccountType.INSTITUTION) {
      return await this.createInstitution(createAccountDto, media)
    }
    return await this.createDonor(createAccountDto, media)
  }

  async createWithGoogle(createAccountGoogleDto: CreateAccountGoogleDto) {
    const { idToken } = createAccountGoogleDto

    let payload: Record<string, any> | undefined
    try {
      const ticket = await this.client.verifyIdToken({ idToken })
      payload = ticket.getPayload() ?? undefined
    } catch (err) {
      this.logger.error({ err }, 'createWithGoogle: verifyIdToken falhou')
      throw new HttpException(
        'Não foi possível autenticar. Tente novamente mais tarde.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    if (!payload) {
      this.logger.error({}, 'createWithGoogle: payload do Google ausente')
      throw new HttpException(
        'Não foi possível autenticar. Tente novamente mais tarde.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    const email = payload['email'] as string
    const name = payload['name'] as string

    const emailExists = await this.prismaService.account.findFirst({
      where: { email },
    })
    if (emailExists) {
      this.logger.warn({ email }, 'createWithGoogle: email já cadastrado')
      throw new ReappException(BackendErrorCodes.EMAIL_ALREADY_REGISTERED, {
        email,
      })
    }

    const createAccountDto: CreateAccountDto = {
      accountType: AccountType.DONOR,
      email,
      name,
      password: idToken,
    }

    try {
      return await this.createDonor(createAccountDto)
    } catch (err) {
      if (err instanceof HttpException) throw err
      this.logger.error(
        { err, email },
        'createWithGoogle: erro ao criar doador',
      )
      throw new HttpException(
        'Não foi possível autenticar. Tente novamente mais tarde.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async findAll({ status, type: accountType }: GetAccountsQuery) {
    const where: Prisma.AccountWhereInput = {
      accountType,
      status,
    }

    return await this.prismaService.account.findMany({
      where,
      select: {
        ...this.accountResponseFields,
        passwordHash: false,
        institution: {
          include: {
            category: true,
          },
        },
        donor: true,
        media: true,
      },
    })
  }

  async findAllCategories() {
    return await this.prismaService.category.findMany({
      select: {
        id: true,
        name: true,
      },
    })
  }

  async findOne(id: number) {
    const account = await this.prismaService.account.findUnique({
      where: { id },
      select: {
        ...this.accountResponseFields,
        passwordHash: false,
        institution: true,
        donor: true,
        media: true,
      },
    })

    if (!account) {
      this.logger.warn({ id }, 'findOne: conta não encontrada')
      throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
        id,
      })
    }

    return account
  }

  async findAllInstitutions(followerId: number) {
    const allInstitutions = await this.prismaService.institution.findMany({
      where: {
        account: {
          status: AccountStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        cnpj: true,
        phone: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        fields: true,
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarId: true,
            media: true,
            followersCount: true,
          },
        },
      },
    })

    const institutionsWithFollowStatus = await Promise.all(
      allInstitutions.map(async (institution) => {
        const isFollowing = await this.prismaService.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId,
              followingId: institution.account.id,
            },
          },
        })

        return {
          ...institution,
          isFollowing: Boolean(isFollowing),
        }
      }),
    )

    return institutionsWithFollowStatus
  }

  async findOneInstitution(id: number, followerId: number = undefined) {
    const institutionAccount = await this.prismaService.institution.findUnique({
      where: { accountId: id },
      select: {
        id: true,
        phone: true,
        category: {
          select: {
            name: true,
          },
        },
        fields: true,
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarId: true,
            media: true,
            followersCount: true,
          },
        },
      },
    })

    if (!institutionAccount) {
      this.logger.warn(
        { accountId: id },
        'findOneInstitution: conta não encontrada',
      )
      throw new ReappException(
        BackendErrorCodes.INSTITUTION_ACCOUNT_NOT_FOUND_ERROR,
        { accountId: id },
      )
    }

    let isFollowing = false
    if (followerId) {
      isFollowing = Boolean(
        await this.prismaService.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId,
              followingId: id,
            },
          },
        }),
      )
    }
    return {
      ...institutionAccount,
      isFollowing: isFollowing,
    }
  }

  async findOneDonor(id: number) {
    const donorAccount = await this.prismaService.donor.findUnique({
      where: { accountId: id },
      select: {
        id: true,
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarId: true,
            media: true,
            note: true,
          },
        },
        donations: true,
      },
    })
    return donorAccount
  }

  async remove(accountId: number, id: number) {
    const account = await this.prismaService.account.findUnique({
      where: { id: accountId },
      include: {
        institution: true,
        donor: true,
      },
    })

    if (!account) {
      this.logger.warn({ accountId }, 'remove: conta não encontrada (auth)')
      throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
        id: accountId,
      })
    }
    if (account.id !== id) {
      this.logger.warn(
        { requesterId: accountId, targetId: id },
        'remove: acesso não autorizado',
      )
      throw new ReappException(BackendErrorCodes.USER_NOT_AUTHORIZED_ERROR)
    }

    if (account.avatarId) {
      try {
        await this.mediaService.deleteMediaAttachment(account.avatarId)
      } catch (err) {
        this.logger.error(
          { err, avatarId: account.avatarId, accountId: id },
          'remove: falha ao deletar arquivos de mídia',
        )
      }
    }
    try {
      return await this.prismaService.account.delete({ where: { id } })
    } catch (error: any) {
      if (error?.code === 'P2025') {
        this.logger.warn({ id }, 'remove: conta não encontrada (P2025)')
        throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
          id,
        })
      }
      this.logger.error(
        { err: error, id },
        'remove: erro inesperado ao deletar conta',
      )
      throw new HttpException(
        'erro ao deletar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async update(
    currentAccountId: number,
    accountId: number,
    updateAccountDto: UpdateAccountDto,
    media?: Express.Multer.File,
  ) {
    const currentAccount = await this.prismaService.account.findUnique({
      where: { id: currentAccountId },
      select: { accountType: true },
    })

    if (!currentAccount) {
      this.logger.warn(
        { requesterId: currentAccountId },
        'update: requisitante não encontrado',
      )
      throw new ReappException(BackendErrorCodes.USER_NOT_AUTHORIZED_ERROR)
    }

    if (
      currentAccountId !== accountId &&
      currentAccount.accountType !== AccountType.ADMIN
    ) {
      this.logger.warn(
        { requesterId: currentAccountId, targetId: accountId },
        'update: acesso não autorizado',
      )
      throw new ReappException(BackendErrorCodes.USER_NOT_AUTHORIZED_ERROR)
    }

    const account = await this.prismaService.account.findUnique({
      where: { id: accountId },
      include: { institution: true },
    })
    if (!account) {
      this.logger.warn({ accountId }, 'update: conta não encontrada')
      throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
        id: accountId,
      })
    }

    const data: Prisma.AccountUpdateInput = {
      name: updateAccountDto.name,
      note: updateAccountDto.note,
    }
    if (
      updateAccountDto.status &&
      currentAccount.accountType === AccountType.ADMIN
    ) {
      data.status = updateAccountDto.status
    }
    if (
      updateAccountDto.password &&
      updateAccountDto.password === updateAccountDto.confirmPassword
    ) {
      const hashedPassword = await bcrypt.hash(
        updateAccountDto.password,
        PASSWORD_HASH_SALT,
      )
      data.passwordHash = hashedPassword
    }

    if (media) {
      try {
        if (account.avatarId)
          await this.mediaService.deleteMediaAttachment(account.avatarId)
        const mediaAttachment = await this.mediaService.processMedia(media, {
          accountId,
        })
        data.media = { connect: { id: mediaAttachment.mediaAttachment.id } }
      } catch (err) {
        this.logger.error(
          { err, accountId },
          'update: falha ao processar novo avatar',
        )
        throw new HttpException(
          'erro ao atualizar conta',
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }
    }

    if (account.accountType === AccountType.INSTITUTION) {
      const institutionData: Prisma.InstitutionUpdateInput = {
        phone: account.institution.phone,
        cnpj: account.institution.cnpj,
      }
      if (updateAccountDto.category) {
        let category = await this.prismaService.category.findFirst({
          where: { name: updateAccountDto.category },
        })
        if (!category) {
          category = await this.prismaService.category.create({
            data: { name: updateAccountDto.category },
          })
        }
        institutionData.category = { connect: { id: category.id } }
      }
      data.institution = { update: institutionData }
    }

    try {
      const updatedAccount = await this.prismaService.account.update({
        where: { id: accountId },
        data,
        select: {
          ...this.accountResponseFields,
          institution: true,
          donor: true,
          media: true,
        },
      })
      return updatedAccount
    } catch (err) {
      this.logger.error(
        { err, accountId },
        'update: erro inesperado ao atualizar conta',
      )
      throw new HttpException(
        'erro ao atualizar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async followAccount(followerId: number, followingId: number) {
    const existRegister = await this.prismaService.follow.findFirst({
      where: { followerId: followerId, followingId: followingId },
    })

    if (existRegister) {
      throw new ReappException(BackendErrorCodes.ALREADY_FOLLOWING, {
        followerId,
        followingId,
      })
    }

    const existingFollowingAccount = await this.prismaService.account.findFirst(
      {
        where: { id: followingId },
      },
    )

    if (!existingFollowingAccount) {
      throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
        id: followingId,
      })
    }

    const existingFollowerAccount = await this.prismaService.account.findFirst({
      where: { id: followerId },
    })

    if (!existingFollowerAccount) {
      throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
        id: followerId,
      })
    }

    await this.prismaService.account.update({
      where: { id: followerId },
      data: { followingCount: { increment: 1 } },
    })

    await this.prismaService.account.update({
      where: { id: followingId },
      data: { followersCount: { increment: 1 } },
    })

    return this.prismaService.follow.create({
      data: {
        followerId,
        followingId,
      },
    })
  }

  async unfollowAccount(followerId: number, followingId: number) {
    const existRegister = await this.prismaService.follow.findFirst({
      where: { followerId: followerId, followingId: followingId },
    })

    if (!existRegister) {
      throw new ReappException(BackendErrorCodes.NOT_FOLLOWING, {
        followerId,
        followingId,
      })
    }

    const existingFollowingAccount = await this.prismaService.account.findFirst(
      {
        where: { id: followingId },
      },
    )

    if (!existingFollowingAccount) {
      throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
        id: followingId,
      })
    }

    const existingFollowerAccount = await this.prismaService.account.findFirst({
      where: { id: followerId },
    })

    if (!existingFollowerAccount) {
      throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
        id: followerId,
      })
    }

    await this.prismaService.account.update({
      where: { id: followerId },
      data: { followingCount: { decrement: 1 } },
    })

    await this.prismaService.account.update({
      where: { id: followingId },
      data: { followersCount: { decrement: 1 } },
    })

    return this.prismaService.follow.delete({
      where: { id: existRegister.id },
    })
  }

  async resetPassword(data: ResetPasswordDto) {
    const { token: tokenId, password, passwordConfirmation } = data
    if (!tokenId) {
      throw new ReappException(BackendErrorCodes.INVALID_TOKEN_ERROR)
    }

    if (password !== passwordConfirmation) {
      throw new ReappException(BackendErrorCodes.PASSWORD_MISMATCH)
    }

    const token = await this.prismaService.token.findFirst({
      where: {
        id: tokenId,
        AND: {
          expiresAt: { gte: new Date() },
          active: { equals: true },
          tokenType: 'PASSWORD_RESET',
        },
      },
      include: {
        account: {
          select: { id: true },
        },
      },
    })

    if (!token) {
      throw new ReappException(BackendErrorCodes.INVALID_TOKEN_ERROR, {
        token: tokenId,
      })
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD_HASH_SALT)

    await this.prismaService.account.update({
      where: { id: token.account.id },
      data: { passwordHash: hashedPassword },
    })

    await this.prismaService.token.update({
      where: { id: tokenId },
      data: { active: false },
    })

    return { message: 'Senha alterada com sucesso!' }
  }

  async blockAccount(blockerId: number, blockedId: number) {
    if (blockerId === blockedId) {
      throw new ReappException(BackendErrorCodes.CANNOT_BLOCK_SELF)
    }
    try {
      const block = await this.prismaService.block.upsert({
        where: {
          blockerId_blockedId: { blockerId, blockedId },
        },
        update: {
          active: true,
        },
        create: {
          blockerId,
          blockedId,
          active: true,
        },
      })
      return {
        success: true,
        message: 'Usuário bloqueado com sucesso.',
        data: {
          blocked_user_id: blockedId,
          blocked_at: block.createdAt,
        },
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
            id: blockedId,
          })
        }
      }
      throw error
    }
  }

  async unblockAccount(blockerId: number, blockedId: number) {
    try {
      const block = await this.prismaService.block.update({
        where: {
          blockerId_blockedId: { blockerId, blockedId },
          active: true,
        },
        data: { active: false },
      })

      return {
        success: true,
        message: 'Usuário desbloqueado com sucesso.',
        data: {
          unblocked_user_id: blockedId,
          unblocked_at: block.updatedAt,
        },
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025: "An operation failed because it depends on one or more records that were not found"
        if (error.code === 'P2025') {
          throw new ReappException(BackendErrorCodes.USER_NOT_BLOCKED)
        }
      }
      throw error
    }
  }

  async getBlockedUsers(blockerId: number) {
    const blocks = await this.prismaService.block.findMany({
      where: { blockerId, active: true },
      select: {
        blockedId: true,
        blocked: {
          select: {
            id: true,
            name: true,
            media: true,
          },
        },
      },
    })
    const data = blocks.map((b) => b.blocked)
    return {
      success: true,
      message: 'Lista de usuários bloqueados.',
      data,
      meta: { total: data.length },
    }
  }

  async getBlockedUserIds(accountId?: number): Promise<number[]> {
    if (!accountId) return []
    const blocks = await this.prismaService.block.findMany({
      where: { blockerId: accountId, active: true },
      select: { blockedId: true },
    })
    return blocks.map((b) => b.blockedId)
  }

  async updateStatus(id: number, status: AccountStatus) {
    const account = await this.prismaService.account.findUnique({
      where: { id },
    })
    if (!account) {
      this.logger.warn({ id }, 'updateStatus: conta não encontrada')
      throw new ReappException(BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR, {
        id,
      })
    }

    try {
      return await this.prismaService.account.update({
        where: { id },
        data: { status },
        select: {
          ...this.accountResponseFields,
          institution: true,
          donor: true,
          media: true,
        },
      })
    } catch (err) {
      this.logger.error({ err, id, status }, 'updateStatus: erro inesperado')
      throw new HttpException(
        'erro ao atualizar status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
