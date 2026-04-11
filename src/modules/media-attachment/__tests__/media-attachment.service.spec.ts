import * as fs from 'node:fs'
import { HttpException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Queue } from 'bull'
import * as mime from 'mime-types'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigService } from '../../../config/config.service'
import { PrismaService } from '../../../database/prisma.service'
import { MediaService } from '../media-attachment.service'

const TEST_BASE_URL = 'http://test.local'
const TEST_UPLOAD_DIR = '/tmp/test-uploads'

const mockConfigService = {
  BASE_URL: TEST_BASE_URL,
  UPLOAD_DIR: TEST_UPLOAD_DIR,
}

vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
}))

vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue({
    raw: vi.fn().mockReturnThis(),
    ensureAlpha: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      data: new Uint8ClampedArray(32 * 32 * 4),
      info: { width: 32, height: 32, channels: 4 },
    }),
    toFile: vi.fn().mockReturnValue({
      size: 512,
    }),
  }),
}))

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}))

vi.mock('bull')
vi.mock('fluent-ffmpeg')
vi.mock('mime-types', () => ({
  extension: vi.fn(),
  lookup: vi.fn(),
}))

describe('MediaService', () => {
  let service = null
  let prismaService = null
  let mediaQueue = null

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: {
            mediaAttachment: {
              create: vi.fn(),
              findUnique: vi.fn(),
              update: vi.fn(),
              generateBlurhash: vi.fn(),
            },
          },
        },
        {
          provide: 'BullQueue_media-processing',
          useValue: {
            add: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<MediaService>(MediaService)
    prismaService = module.get<PrismaService>(PrismaService)
    mediaQueue = module.get<Queue>('BullQueue_media-processing')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('processMedia', () => {
    it('should throw an error if file is missing', async () => {
      const file = null
      const options = {
        accountId: 1,
        description: 'Test image',
        focus: '0.0,0.0',
      }

      await expect(service.processMedia(file, options)).rejects.toThrow(
        HttpException,
      )
      await expect(service.processMedia(file, options)).rejects.toThrow(
        'O arquivo é obrigatório',
      )
    })

    it('should throw an error if accountId is missing', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        size: 1024,
      } as Express.Multer.File

      const options = {
        accountId: null,
        description: 'Test image',
        focus: '0.0,0.0',
      }

      await expect(service.processMedia(file, options)).rejects.toThrow(
        HttpException,
      )
      await expect(service.processMedia(file, options)).rejects.toThrow(
        'A conta é obrigatória',
      )
    })

    it('should throw an error if file type is invalid', async () => {
      const file = {
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        originalname: 'test.pdf',
        size: 1024,
      } as Express.Multer.File

      const options = {
        accountId: 1,
        description: 'Test file',
        focus: '0.0,0.0',
      }

      await expect(service.processMedia(file, options)).rejects.toThrow(
        HttpException,
      )
      await expect(service.processMedia(file, options)).rejects.toThrow(
        'Formato de arquivo não suportado',
      )
    })

    it('should throw an error if file size exceeds limit', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        size: 20 * 1024 * 1024, // 20MB, exceeds 16MB limit
      } as Express.Multer.File

      const options = {
        accountId: 1,
        description: 'Test image',
        focus: '0.0,0.0',
      }

      await expect(service.processMedia(file, options)).rejects.toThrow(
        HttpException,
      )
      await expect(service.processMedia(file, options)).rejects.toThrow(
        'Tamanho do arquivo excede o limite',
      )
    })

    it('should process synchronously when media type is image', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        size: 1024,
      } as Express.Multer.File

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test image',
        focus: '0.0,0.0',
      }

      vi.spyOn(service, 'isSynchronous').mockReturnValue(true)
      vi.spyOn(service, 'processSynchronously').mockResolvedValue({
        id: 'mock-id',
        type: 'image',
        url: 'mock-url',
        preview_url: 'mock-preview-url',
        remote_url: null,
        text_url: 'mock-text-url',
        meta: {},
        description: 'mock-description',
        blurhash: 'mock-blurhash',
      })

      const result = await service.processMedia(file, options)

      expect(service.isSynchronous).toHaveBeenCalledWith(file)
      expect(service.processSynchronously).toHaveBeenCalledWith(
        file,
        options,
        undefined,
      )
      expect(result).toEqual({
        isSynchronous: true,
        mediaAttachment: {
          id: 'mock-id',
          type: 'image',
          url: 'mock-url',
          preview_url: 'mock-preview-url',
          remote_url: null,
          text_url: 'mock-text-url',
          meta: {},
          description: 'mock-description',
          blurhash: 'mock-blurhash',
        },
      })
    })

    it('should process asynchronously when media type is not image', async () => {
      const file = {
        mimetype: 'video/mp4',
        buffer: Buffer.from(''),
        originalname: 'test.mp4',
        size: 50 * 1024 * 1024, // 50MB
      } as Express.Multer.File

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test video',
        focus: '0.0,0.0',
      }

      vi.spyOn(service, 'isSynchronous').mockReturnValue(false)
      vi.spyOn(service, 'enqueueMediaProcessing').mockResolvedValue({
        id: 'mock-id',
        type: 'video',
        url: null,
        preview_url: null,
        remote_url: null,
        text_url: null,
        meta: null,
        description: 'mock-description',
        blurhash: null,
      })

      const result = await service.processMedia(file, options)

      expect(service.isSynchronous).toHaveBeenCalledWith(file)
      expect(service.enqueueMediaProcessing).toHaveBeenCalledWith(
        file,
        options,
        undefined,
      )
      expect(result).toEqual({
        isSynchronous: false,
        mediaAttachment: {
          id: 'mock-id',
          type: 'video',
          url: null,
          preview_url: null,
          remote_url: null,
          text_url: null,
          meta: null,
          description: 'mock-description',
          blurhash: null,
        },
      })
    })
  })

  describe('enqueueMediaProcessing', () => {
    it('should enqueue media processing job', async () => {
      const file = {
        mimetype: 'video/mp4',
        buffer: Buffer.from('video data'),
        originalname: 'test.mp4',
        size: 50 * 1024 * 1024,
      } as Express.Multer.File

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test video',
        focus: '0.0,0.0',
      }

      vi.mocked(fs.mkdirSync).mockResolvedValue('mock-dir' as never)
      vi.mocked(fs.writeFileSync).mockResolvedValue(undefined as never)
      vi.mocked(mime.extension).mockReturnValue('mp4')

      prismaService.mediaAttachment.create = vi.fn().mockResolvedValue({
        id: 'mock-uuid',
        description: options.description,
      })

      mediaQueue.add = vi.fn().mockResolvedValue(undefined)

      const result = await service.enqueueMediaProcessing(file, options)

      expect(fs.mkdirSync).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
      expect(prismaService.mediaAttachment.create).toHaveBeenCalled()
      expect(mediaQueue.add).toHaveBeenCalled()

      expect(result).toEqual({
        id: 'mock-uuid',
        type: 'video',
        url: null,
        preview_url: null,
        remote_url: null,
        text_url: null,
        meta: null,
        description: options.description,
        blurhash: null,
      })
    })
  })

  describe('processSynchronously', () => {
    it('should process image synchronously', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image data'),
        originalname: 'test.jpg',
        size: 1024,
      } as Express.Multer.File

      const options = {
        thumbnail: null,
        accountId: 1,
        description: 'Test image',
        focus: '0.0,0.0',
      }
      vi.mocked(mime.extension).mockReturnValue('jpg')
      vi.mocked(fs.mkdirSync).mockResolvedValue(undefined as never)
      vi.spyOn(service, 'createMediaMetadata').mockResolvedValue({})
      vi.spyOn(service, 'generateBlurhash').mockResolvedValue('blurhash')
      vi.spyOn(service, 'processImage').mockResolvedValue(sharp().toFile)

      prismaService.mediaAttachment.create = vi.fn().mockResolvedValue({
        id: 'mock-uuid',
        type: 'image',
        remoteUrl: 'mock-url',
        blurhash: 'blurhash',
        description: options.description,
        fileMeta: {},
        thumbnailFileName: null,
        thumbnailRemoteUrl: null,
        thumbnailContentType: null,
      })

      const actual = await service.processSynchronously(file, options)

      expect(fs.mkdirSync).toHaveBeenCalled()
      expect(service.processImage).toHaveBeenCalled()
      expect(service.createMediaMetadata).toHaveBeenCalled()
      expect(service.generateBlurhash).toHaveBeenCalled()
      expect(prismaService.mediaAttachment.create).toHaveBeenCalled()

      const expectedMediaAttachment = {
        id: 'mock-uuid',
        type: 'image',
        remoteUrl: expect.any(String),
        description: expect.any(String),
        blurhash: 'blurhash',
        fileMeta: expect.any(Object),
        thumbnailFileName: null,
        thumbnailRemoteUrl: null,
        thumbnailContentType: null,
      }

      expect(actual).toEqual(expectedMediaAttachment)
    })
    it('should throw error for unsupported media type', async () => {
      const file = {
        mimetype: 'video/mp4',
        buffer: Buffer.from('video data'),
        originalname: 'test.mp4',
        size: 50 * 1024 * 1024,
      } as Express.Multer.File

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test video',
        focus: '0.0,0.0',
      }

      await expect(service.processSynchronously(file, options)).rejects.toThrow(
        HttpException,
      )
      await expect(service.processSynchronously(file, options)).rejects.toThrow(
        'O processamento síncrono é suportado apenas para imagens',
      )
    })
  })

  describe('getMediaAttachmentById', () => {
    it('should return media attachment when processing is complete', async () => {
      prismaService.mediaAttachment.findUnique = vi.fn().mockResolvedValue({
        id: 'mock-uuid',
        type: 1,
        processing: 2,
        fileContentType: 'image/jpeg',
        thumbnailContentType: 'image/jpeg',
        remoteUrl: '',
        fileMeta: {},
        description: 'Test image',
        blurhash: 'blurhash',
      })

      const result = await service.getMediaAttachmentById('mock-uuid')

      const baseUrl = `${TEST_BASE_URL}/uploads/mock-uuid`

      expect(prismaService.mediaAttachment.findUnique).toHaveBeenCalledWith({
        where: { id: 'mock-uuid' },
      })

      expect(result).toEqual({
        mediaResponse: {
          id: 'mock-uuid',
          type: 'image',
          url: `${baseUrl}/original.jpeg`,
          preview_url: `${baseUrl}/thumbnail.jpeg`,
          remote_url: null,
          text_url: null,
          meta: {},
          description: 'Test image',
          blurhash: 'blurhash',
        },
        processing: 2,
      })
    })

    it('should return null when media attachment not found', async () => {
      prismaService.mediaAttachment.findUnique = vi.fn().mockResolvedValue(null)

      const result = await service.getMediaAttachmentById('non-existent-id')

      expect(prismaService.mediaAttachment.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      })

      expect(result).toEqual({ mediaResponse: null, processing: null })
    })
  })

  describe('isSynchronous', () => {
    it('should return true for image mimetype', () => {
      const file = { mimetype: 'image/jpeg' } as Express.Multer.File

      const result = service.isSynchronous(file)

      expect(result).toBe(true)
    })

    it('should return false for video mimetype', () => {
      const file = { mimetype: 'video/mp4' } as Express.Multer.File

      const result = service.isSynchronous(file)

      expect(result).toBe(false)
    })
  })

  describe('determineMediaType', () => {
    it('should return "image" for image mimetypes', () => {
      expect(service.getMediaTypeFromMime('image/jpeg')).toBe('image')
      expect(service.getMediaTypeFromMime('image/png')).toBe('image')
    })

    it('should return "video" for video mimetypes', () => {
      expect(service.getMediaTypeFromMime('video/mp4')).toBe('video')
    })

    it('should return "audio" for audio mimetypes', () => {
      expect(service.getMediaTypeFromMime('audio/mpeg')).toBe('audio')
    })

    it('should return "gifv" for image/gif mimetype', () => {
      expect(service.getMediaTypeFromMime('image/gif')).toBe('gifv')
    })

    it('should return "unknown" for unsupported mimetypes', () => {
      expect(service.getMediaTypeFromMime('application/pdf')).toBe('unknown')
    })
  })

  describe.skip('generateBlurhash', () => {
    it('should generate a blurhash string', async () => {
      const imageBuffer = Buffer.from('image data')

      const blurhash = await service.generateBlurhash(imageBuffer)

      expect(blurhash).toBeDefined()
    })
  })
})
