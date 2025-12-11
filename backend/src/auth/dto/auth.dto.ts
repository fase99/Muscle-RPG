import { IsEmail, IsString, MinLength, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsString()
  @MinLength(2)
  apellido: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsNumber()
  @Min(13)
  @Max(120)
  edad: number;

  @IsString()
  @IsOptional()
  username?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
