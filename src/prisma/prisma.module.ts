// src/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// O decorator `@Global()` faz com que este módulo seja automaticamente disponível em toda a aplicação.
// Isso é útil para serviços como o PrismaService que são usados por muitos outros módulos.
@Global()
@Module({
  providers: [PrismaService], // Declara que o PrismaService é um provedor deste módulo.
  exports: [PrismaService],   // Exporta o PrismaService para que outros módulos possam injetá-lo.
})
export class PrismaModule {}