// src/auth/dto/auth.dto.ts
// Você pode instalar a biblioteca 'class-validator' e 'class-transformer' para validação real
// npm install class-validator class-transformer
// Ou mantê-lo simples por enquanto

export class RegisterDto {
    email!: string; // '!' indica que a propriedade será definitivamente atribuída
    password!: string;
}

export class LoginDto {
    email!: string;
    password!: string;
}