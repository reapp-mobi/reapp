import { ReportReason, ReportTargetType } from '@prisma/client'
import { z } from 'zod'

export const listReportSchema = z.object({
  offset: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(200).default(20),
  resolved: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
  targetType: z.nativeEnum(ReportTargetType).optional(),
  reason: z.nativeEnum(ReportReason).optional(),
})

export type ListReportQuery = z.infer<typeof listReportSchema>
