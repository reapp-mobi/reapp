import { z } from 'zod'

export const updateReportSchema = z.object({
  resolved: z.boolean(),
})

export type UpdateReportData = z.infer<typeof updateReportSchema>
