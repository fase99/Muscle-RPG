import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AchievementsService } from '../users/achievements.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private achievementsService: AchievementsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const user = await this.usersService.create(registerDto);

    const userObj = user.toObject();
    const { password, ...result } = userObj;
    return {
      message: 'Usuario registrado exitosamente',
      user: result,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithProfile(loginDto.email);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.achievementsService.checkAndUnlockAchievements(user._id.toString()).catch(err => {
      console.error('Error al verificar logros:', err);
    });

    const userObj = user.toObject();
    const { password, ...result } = userObj;
    
    return {
      message: 'Login exitoso',
      user: result,
    };
  }
}
