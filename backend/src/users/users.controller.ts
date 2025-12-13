import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateMetricsDto } from './dto/update-metrics.dto';
import { profilingService } from './profiling.services';
import { AchievementsService } from './achievements.service';
import { RutinasService } from '../rutinas/rutinas.service';


@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly profilingService: profilingService,
        private readonly achievementsService: AchievementsService,
        @Inject(forwardRef(() => RutinasService))
        private readonly rutinasService: RutinasService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createUserDto: {
        nombre: string;
        apellido: string;
        edad: number;
        email: string;
        password: string;
    }) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: any) {
        return this.usersService.update(id, updateUserDto);
    }

    @Patch(':id/atributos')
    updateAtributos(
        @Param('id') id: string,
        @Body() atributos: any,
    ) {
        return this.usersService.updateAtributos(id, atributos);
    }

    @Patch(':id/experiencia')
    updateExperiencia(
        @Param('id') id: string,
        @Body() body: { xpGanada: number },
    ) {
        return this.usersService.updateExperiencia(id, body.xpGanada);
    }

    @Patch(':id/stamina')
    updateStamina(
        @Param('id') id: string,
        @Body() body: { staminaCost: number },
    ) {
        return this.usersService.updateStamina(id, body.staminaCost);
    }

    @Patch(':id/complete-exercise')
    completeExercise(
        @Param('id') id: string,
        @Body() body: { exerciseId: string },
    ) {
        return this.usersService.completeExercise(id, body.exerciseId);
    }

    @Get(':id/completed-exercises')
    getCompletedExercises(@Param('id') id: string) {
        return this.usersService.getCompletedExercises(id);
    }

    @Patch(':id/metricas')
    updateMetrics(
        @Param('id') id: string,
        @Body() updateMetricsDto: UpdateMetricsDto,
    ) {
        return this.usersService.updateMetrics(id, updateMetricsDto.metricas);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @Post('profile')
    @HttpCode(HttpStatus.CREATED)
    async createProfile(@Body() createProfileDto: CreateProfileDto) {
        try {
            console.log('========== CREANDO PERFIL ==========');
            console.log('DTO recibido:', JSON.stringify(createProfileDto, null, 2));
            
            if (!createProfileDto.userId) {
                throw new BadRequestException('El campo userId es requerido para crear un perfil');
            }
            
            const result = await this.profilingService.calcularNivelUsuario(createProfileDto);
            
            console.log('========== PERFIL CREADO EXITOSAMENTE ==========');
            console.log('Resultado:', JSON.stringify(result, null, 2));
            
            try {
                console.log('========== GENERANDO RUTINA SEMANAL AUTOMÁTICAMENTE ==========');
                const rutinaSemanal = await this.rutinasService.generateWeeklyRoutine(createProfileDto.userId, 120);
                console.log(`✅ Rutina semanal generada: ${rutinaSemanal.rutinas.length} días`);
                
                return {
                    ...result,
                    rutinaSemanal: rutinaSemanal.rutinas
                };
            } catch (rutinaError) {
                console.error('⚠️ Error generando rutina semanal:', rutinaError);
                return result;
            }
        } catch (err) {
            console.error('========== ERROR CREANDO PERFIL ==========');
            console.error('Error completo:', err);
            console.error('Stack:', err?.stack);
            
            throw new BadRequestException({
                message: 'Error al crear el perfil',
                error: err?.message ?? 'Error desconocido',
                details: err
            });
        }
    }

    @Get(':id/with-profile')
    async getUserWithProfile(@Param('id') id: string) {
        return this.usersService.findOneWithProfile(id);
    }

    @Get(':id/profile')
    async getUserProfile(@Param('id') id: string) {
        const profile = await this.usersService.getProfileByUserId(id);
        if (!profile) {
            return {
                message: 'Este usuario no tiene un perfil de perfilamiento creado',
                hasProfile: false
            };
        }
        return profile;
    }

    @Get(':id/has-profile')
    async checkHasProfile(@Param('id') id: string) {
        const hasProfile = await this.usersService.hasProfile(id);
        return { userId: id, hasProfile };
    }

    @Get(':id/stats')
    async getUserStats(@Param('id') id: string) {
        return this.usersService.getUserStats(id);
    }

    @Get(':id/profile-relationship')
    async getProfileRelationship(@Param('id') id: string) {
        const user = await this.usersService.findOne(id);
        const profile = await this.usersService.getProfileByUserId(id);
        
        return {
            userId: id,
            userHasProfileId: !!user.profileId,
            profileExists: !!profile,
            profileHasUserId: profile ? !!(profile as any).userId : false,
            relationshipComplete: !!(user.profileId && profile && (profile as any).userId),
            details: {
                user: {
                    id: id,
                    nombre: user.nombre,
                    profileId: user.profileId || null
                },
                profile: profile ? {
                    id: (profile as any)._id?.toString(),
                    userId: (profile as any).userId?.toString() || null,
                    level: profile.level,
                    sRpg: profile.sRpg
                } : null
            }
        };
    }

    @Get('profiles/stats')
    async getProfileStats() {
        return this.profilingService.getProfileStats();
    }

    @Get('profiles/level/:level')
    async getProfilesByLevel(@Param('level') level: string) {
        return this.profilingService.getProfilesByLevel(level);
    }

    @Patch('profiles/:profileId')
    async updateProfile(
        @Param('profileId') profileId: string,
        @Body() updateData: Partial<CreateProfileDto>
    ) {
        return this.profilingService.updateProfile(profileId, updateData);
    }

    @Get(':id/achievements')
    async getUserAchievements(@Param('id') id: string) {
        return this.achievementsService.getUserAchievements(id);
    }

    @Get(':id/achievements/next')
    async getNextAchievement(@Param('id') id: string) {
        return this.achievementsService.getNextAchievement(id);
    }

    @Post(':id/achievements/check')
    async checkAchievements(@Param('id') id: string) {
        const newAchievements = await this.achievementsService.checkAndUnlockAchievements(id);
        return {
            message: 'Logros verificados',
            newAchievements,
            totalCount: (await this.achievementsService.getUserAchievements(id)).length
        };
    }

    @Post(':id/achievements/workout-complete')
    async recordWorkoutCompletion(@Param('id') id: string) {
        const newAchievements = await this.achievementsService.recordWorkoutCompletion(id);
        return {
            message: 'Entrenamiento registrado',
            newAchievements,
        };
    }
}
