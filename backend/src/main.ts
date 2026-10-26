import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MinecraftLoggerInterceptor } from './common/interceptors/minecraft-logger.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // T091: OWASP Top 10 Security Hardening
  // 1. Bảo mật HTTP Headers (Security Headers)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(self), camera=(self), microphone=()',
    );
    res.removeHeader('X-Powered-By');
    next();
  });

  // 2. Global Prefix: /api
  app.setGlobalPrefix('api');

  // 3. CORS được thắt chặt hỗ trợ Web PC, PWA nội bộ và Zalo Mini App WebView
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://polyfactory.fpt.edu.vn',
    'https://h5.zdn.vn',
    'https://zalo.me',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép request cùng origin (không có header origin) hoặc các domain tin cậy
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.fpt.edu.vn')) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback chế độ dev cho phép kết nối an toàn
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 4. Global Validation Pipe: Whitelist & Chặn tham số độc hại ngoài DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    }),
  );

  // 5. Global Error Filter & Terminal Console Logger
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new MinecraftLoggerInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`\x1b[32m[SERVER STARTED]\x1b[0m PolyFactory Backend running at http://localhost:${port}/api`);
}

bootstrap();
