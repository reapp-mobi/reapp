import { ConfigService } from '@app/config/config.service'
import { PrismaService } from '@app/database/prisma.service'
import { AuthGuard } from '@app/modules/auth/auth.guard'
import { ReportController } from '@app/modules/report/report.controller'
import { ReportService } from '@app/modules/report/report.service'
import { INestApplication } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const JWT_SECRET = 'test-secret'

const mockPrismaService = {
  report: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
}

const mockConfigService = {
  JWT_SECRET,
} as unknown as ConfigService

const buildToken = (jwt: JwtService, accountType: string[]) =>
  jwt.sign({ user: { id: 1, accountType } })

describe('ReportController (e2e)', () => {
  let app: INestApplication
  let jwtService: JwtService
  let adminToken: string
  let donorToken: string

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [ReportController],
      providers: [
        ReportService,
        AuthGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    jwtService = moduleRef.get(JwtService)
    adminToken = buildToken(jwtService, ['ADMIN'])
    donorToken = buildToken(jwtService, ['DONOR'])
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /report', () => {
    it('returns paginated reports for admin', async () => {
      const reports = [
        {
          id: 'r1',
          reporterId: 1,
          targetType: 'POST',
          targetId: 10,
          reason: 'SPAM',
          details: null,
          resolved: false,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]
      mockPrismaService.report.findMany.mockResolvedValue(reports)
      mockPrismaService.report.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get('/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data).toHaveLength(1)
      expect(res.body.meta.total).toBe(1)
      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 20 }),
      )
    })

    it('forwards filters resolved/targetType/reason to prisma', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([])
      mockPrismaService.report.count.mockResolvedValue(0)

      await request(app.getHttpServer())
        .get('/report?resolved=true&targetType=POST&reason=SPAM&offset=10&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { resolved: true, targetType: 'POST', reason: 'SPAM' },
          skip: 10,
          take: 5,
        }),
      )
    })

    it('rejects non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/report')
        .set('Authorization', `Bearer ${donorToken}`)
        .expect((r) => {
          expect([401, 403]).toContain(r.status)
        })
    })

    it('rejects requests without token', async () => {
      await request(app.getHttpServer())
        .get('/report')
        .expect((r) => {
          expect([401, 403]).toContain(r.status)
        })
    })
  })

  describe('GET /report/pending/count', () => {
    it('returns pending count', async () => {
      mockPrismaService.report.count.mockResolvedValue(7)

      const res = await request(app.getHttpServer())
        .get('/report/pending/count')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.pending).toBe(7)
      expect(mockPrismaService.report.count).toHaveBeenCalledWith({
        where: { resolved: false },
      })
    })
  })

  describe('GET /report/:id', () => {
    it('returns one report', async () => {
      const report = {
        id: 'rep_1',
        reporterId: 1,
        targetType: 'POST',
        targetId: 10,
        reason: 'SPAM',
        details: null,
        resolved: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }
      mockPrismaService.report.findUnique.mockResolvedValue(report)

      const res = await request(app.getHttpServer())
        .get('/report/rep_1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.data.id).toBe('rep_1')
    })

    it('404 when not found', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get('/report/missing')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })
  })

  describe('PATCH /report/:id', () => {
    it('updates resolved flag', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({ id: 'rep_1' })
      mockPrismaService.report.update.mockResolvedValue({
        id: 'rep_1',
        resolved: true,
      })

      const res = await request(app.getHttpServer())
        .patch('/report/rep_1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolved: true })
        .expect(200)

      expect(res.body.data.resolved).toBe(true)
      expect(mockPrismaService.report.update).toHaveBeenCalledWith({
        where: { id: 'rep_1' },
        data: { resolved: true },
      })
    })

    it('rejects invalid body', async () => {
      await request(app.getHttpServer())
        .patch('/report/rep_1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolved: 'maybe' })
        .expect((r) => {
          expect(r.status).toBeGreaterThanOrEqual(400)
        })
    })
  })
})
