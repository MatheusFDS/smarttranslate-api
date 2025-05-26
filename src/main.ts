import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = `${process.cwd()}/${process.env.GOOGLE_CREDENTIALS_FILE}`;

  const app = await NestFactory.create(AppModule);
  app.enableCors(); 

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();