// src/prisma/prisma.service.ts
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // `onModuleInit` é um hook do Nest.js. Ele é executado quando o módulo é inicializado.
  // Aqui, conectamos ao banco de dados, garantindo que o Prisma esteja pronto para uso.
  async onModuleInit() {
    await this.$connect();
  }

  // `enableShutdownHooks` é um método que adiciona hooks para o desligamento da aplicação.
  // Isso garante que o Prisma se desconecte graciosamente do banco de dados quando o Nest.js for encerrado.
  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}