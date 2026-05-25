import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import * as compression from 'compression'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  })

  // Trust Nginx reverse proxy — makes req.protocol return 'https' correctly
  app.set('trust proxy', 1)

  // Security
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(compression())

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-plugin-session'],
  })

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // API prefix — public plugin routes excluded from versioned prefix
  const PLUGIN_ROUTES = [
    { path: 'api/health',            method: RequestMethod.GET },
    { path: 'api/config',            method: RequestMethod.GET },
    { path: 'api/validate',          method: RequestMethod.POST },
    { path: 'api/verify_activity',   method: RequestMethod.POST },
    { path: 'api/heartbeat',         method: RequestMethod.POST },
    { path: 'api/discover',          method: RequestMethod.GET },
    { path: 'api/check-ip',          method: RequestMethod.GET },
    { path: 'api/plugin/session',    method: RequestMethod.POST },
    { path: 'api/selectors',         method: RequestMethod.POST },
    { path: 'api/secret',            method: RequestMethod.POST },
    { path: 'r/(.*)',                method: RequestMethod.ALL },
    { path: 'plugin/(.*)',           method: RequestMethod.ALL },
  ]
  app.setGlobalPrefix('api/v1', { exclude: PLUGIN_ROUTES })

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('CloudStream SaaS API')
    .setDescription('Enterprise License Management Platform API')
    .setVersion('2.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  })

  const port = process.env.PORT || 4000
  await app.listen(port)
  logger.log(`🚀 CloudStream API running on http://localhost:${port}`)
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`)
}

bootstrap()
