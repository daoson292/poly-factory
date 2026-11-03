import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'super_secret_jwt_key_polyfactory_2026'),
        signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRATION', '30d') as any) },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService, PrismaService],
  exports: [AuthService, UsersService, JwtModule],
})
export class AuthModule {}
