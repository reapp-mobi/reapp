import * as fs from 'fs'
import * as path from 'path'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import * as express from 'express'
import helmet from 'helmet'

import { Logger, LoggerErrorInterceptor } from 'nestjs-pino'
import { AppModule } from './app.module'
import { ConfigService } from './config/config.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const appLogger = app.get(Logger)
  app.useLogger(appLogger)
  app.useGlobalInterceptors(new LoggerErrorInterceptor())

  const configService = app.get(ConfigService)

  const defaultCors = [configService.CLIENT_URL]
  const additionalTestingCors = configService.IS_TESTING_ENV
    ? [
        'http://localhost:5173',
        'http://localhost',
        'https://localhost',
        'localhost',
      ]
    : []

  app.enableCors({
    origin: [...defaultCors, ...additionalTestingCors],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })

  // Helmet must run before static serving so uploads inherit its headers.
  app.use(helmet())

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  appLogger.log('GlobalPipes (ValidationPipe) configured.', 'Bootstrap')

  const uploadsDirectoryName = 'uploads'
  const resolvedUploadsPath = path.resolve(process.cwd(), uploadsDirectoryName)

  appLogger.log(
    `Attempting to serve static files from virtual path '/${uploadsDirectoryName}'.`,
    'Bootstrap',
  )
  appLogger.log(`Current working dir is ${process.cwd()}`)
  appLogger.log(
    `Physical path mapped to: '${resolvedUploadsPath}'`,
    'Bootstrap',
  )

  // Check if the resolved path actually exists
  if (fs.existsSync(resolvedUploadsPath)) {
    const stats = fs.statSync(resolvedUploadsPath)
    if (stats.isDirectory()) {
      appLogger.log(
        `Verified: Directory exists at '${resolvedUploadsPath}'.`,
        'Bootstrap',
      )
      // Serve static files. Harden against stored-XSS via uploaded HTML/SVG:
      //  - nosniff prevents MIME confusion
      //  - a restrictive CSP stops inline scripts from executing
      //  - dotfiles:deny blocks hidden files, index:false disables listing
      app.use(
        `/${uploadsDirectoryName}`,
        express.static(resolvedUploadsPath, {
          dotfiles: 'deny',
          index: false,
          setHeaders: (res) => {
            res.setHeader('X-Content-Type-Options', 'nosniff')
            res.setHeader(
              'Content-Security-Policy',
              "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
            )
          },
        }),
      )
      appLogger.log(
        `Successfully configured static serving for '/${uploadsDirectoryName}'. Access files at /${uploadsDirectoryName}/<filename>`,
        'Bootstrap',
      )
    } else {
      appLogger.error(
        `Error: Path '${resolvedUploadsPath}' exists but is not a directory. Static serving NOT configured.`,
        'Bootstrap',
      )
    }
  } else {
    appLogger.error(
      `Error: Directory '${resolvedUploadsPath}' does NOT exist. Static serving NOT configured.`,
      'Bootstrap',
    )
  }
  // --- End Static files ---

  await app.listen(configService.PORT)
}

bootstrap()
