import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.PORT || 4000;
  const app = await NestFactory.create(AppModule);
  console.log(`App listeining at ${port}`);
  await app.listen(port);
}
bootstrap();
