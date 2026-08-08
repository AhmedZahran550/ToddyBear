import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.setGlobalPrefix('api');
  app.enableCors();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(
    `🚀 ToddyBear Backend Server running on http://localhost:${port}`,
  );
}
bootstrap();
