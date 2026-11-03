import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AddWhitelistMemberDto {
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  teamId?: string;
}

export class ImportWhitelistMemberItemDto {
  email: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  teamId?: string;
}
