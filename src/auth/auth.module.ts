// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // Importe o JwtModule
import { PassportModule } from '@nestjs/passport'; // Importe o PassportModule
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy'; // Importe a JwtStrategy
import { PrismaModule } from '../prisma/prisma.module'; // Já está global, mas boa prática importar se usar explicitamente aqui

@Module({
  imports: [
    PrismaModule, // PrismaService é injetado globalmente, mas importamos aqui para clareza
    PassportModule, // Necessário para usar estratégias de autenticação
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Chave secreta para assinar e verificar tokens
      signOptions: { expiresIn: '60m' }, // Token expira em 60 minutos
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // Adicione JwtStrategy como provedor
  exports: [AuthService], // Exporte AuthService se outros módulos precisarem dele
})
export class AuthModule {}