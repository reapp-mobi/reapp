export interface BackendBaseError {
  status: number
  description: string
  data: string[]
}

export enum BackendErrorCodes {
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  USER_NOT_FOUND_ERROR = 'USER_NOT_FOUND_ERROR',
  INVALID_TOKEN_ERROR = 'INVALID_TOKEN_ERROR',
  USER_NOT_AUTHORIZED_ERROR = 'USER_NOT_AUTHORIZED_ERROR',
  INVALID_EMAIL_OR_PASSWORD = 'INVALID_EMAIL_OR_PASSWORD',
  PENDING_AUTHORIZATION = 'PENDING_AUTHORIZATION',
  GOOGLE_AUTH_FAILED = 'GOOGLE_AUTH_FAILED',

  ZOD_VALIDATION_ERROR = 'ZOD_VALIDATION_ERROR',

  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
  CNPJ_ALREADY_REGISTERED = 'CNPJ_ALREADY_REGISTERED',
  AVATAR_MUST_BE_IMAGE = 'AVATAR_MUST_BE_IMAGE',
  ACCOUNT_NOT_FOUND_ERROR = 'ACCOUNT_NOT_FOUND_ERROR',
  INSTITUTION_ACCOUNT_NOT_FOUND_ERROR = 'INSTITUTION_ACCOUNT_NOT_FOUND_ERROR',
  ALREADY_FOLLOWING = 'ALREADY_FOLLOWING',
  NOT_FOLLOWING = 'NOT_FOLLOWING',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  CANNOT_BLOCK_SELF = 'CANNOT_BLOCK_SELF',
  USER_ALREADY_BLOCKED = 'USER_ALREADY_BLOCKED',
  USER_NOT_BLOCKED = 'USER_NOT_BLOCKED',

  REPORT_NOT_FOUND_ERROR = 'REPORT_NOT_FOUND_ERROR',
}

const GenericErrors = {
  [BackendErrorCodes.INTERNAL_SERVER_ERROR]: {
    status: 500,
    description: 'Erro inter do servidor',
    data: [],
  },
}

const AuthErrors = {
  [BackendErrorCodes.USER_NOT_FOUND_ERROR]: {
    status: 404,
    description: 'Erro interno do servidor',
    data: [],
  },
  [BackendErrorCodes.INVALID_TOKEN_ERROR]: {
    status: 401,
    description: 'O token fornecido está inválido ou já expirou',
    data: ['invitationToken'],
  },
  [BackendErrorCodes.USER_NOT_AUTHORIZED_ERROR]: {
    status: 401,
    description: 'O usuário não tem permissão para acessar este recurso',
    data: [],
  },
  [BackendErrorCodes.INVALID_EMAIL_OR_PASSWORD]: {
    status: 401,
    description:
      'Dados de acesso incorretos. Verifique seu e-mail e senha e tente novamente',
    data: [],
  },
  [BackendErrorCodes.PENDING_AUTHORIZATION]: {
    status: 403,
    description:
      'Sua conta ainda está em processo de aprovação. Avisaremos você assim que estiver tudo pronto!',
    data: [],
  },
  [BackendErrorCodes.GOOGLE_AUTH_FAILED]: {
    status: 401,
    description: 'Falha na autenticação com o Google. Tente novamente.',
    data: [],
  },
}

const ZodErrors = {
  [BackendErrorCodes.ZOD_VALIDATION_ERROR]: {
    status: 400,
    description: 'Erro de validação de dados',
    data: [],
  },
}

const AccountErrors = {
  [BackendErrorCodes.EMAIL_ALREADY_REGISTERED]: {
    status: 400,
    description: 'Este e-mail já está cadastrado',
    data: ['email'],
  },
  [BackendErrorCodes.CNPJ_ALREADY_REGISTERED]: {
    status: 400,
    description: 'Este CNPJ já está cadastrado',
    data: ['cnpj'],
  },
  [BackendErrorCodes.AVATAR_MUST_BE_IMAGE]: {
    status: 422,
    description: 'Avatar deve ser uma imagem',
    data: ['mimetype'],
  },
  [BackendErrorCodes.ACCOUNT_NOT_FOUND_ERROR]: {
    status: 404,
    description: 'Conta não encontrada',
    data: ['id'],
  },
  [BackendErrorCodes.INSTITUTION_ACCOUNT_NOT_FOUND_ERROR]: {
    status: 404,
    description: 'Conta da instituição não encontrada',
    data: ['accountId'],
  },
  [BackendErrorCodes.ALREADY_FOLLOWING]: {
    status: 400,
    description: 'O usuário já segue essa conta',
    data: ['followerId', 'followingId'],
  },
  [BackendErrorCodes.NOT_FOLLOWING]: {
    status: 400,
    description: 'O usuário não segue essa conta',
    data: ['followerId', 'followingId'],
  },
  [BackendErrorCodes.PASSWORD_MISMATCH]: {
    status: 400,
    description: 'Senhas não conferem',
    data: ['password', 'passwordConfirmation'],
  },
}

const BlockErrors = {
  [BackendErrorCodes.CANNOT_BLOCK_SELF]: {
    status: 400,
    description: 'Você não pode bloquear a si mesmo',
    data: [],
  },
  [BackendErrorCodes.USER_ALREADY_BLOCKED]: {
    status: 400,
    description: 'Este usuário já está bloqueado',
    data: [],
  },
  [BackendErrorCodes.USER_NOT_BLOCKED]: {
    status: 400,
    description: 'Este usuário não está bloqueado',
    data: [],
  },
}

const ReportErrors = {
  [BackendErrorCodes.REPORT_NOT_FOUND_ERROR]: {
    status: 404,
    description: 'Denúncia não encontrada',
    data: ['id'],
  },
}

export const BackendErrors = {
  ...GenericErrors,
  ...AuthErrors,
  ...ZodErrors,
  ...AccountErrors,
  ...BlockErrors,
  ...ReportErrors,
} as const
