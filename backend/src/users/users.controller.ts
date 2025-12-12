import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateMetricsDto } from './dto/update-metrics.dto';
import { profilingService } from './profiling.services';


@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly profilingService: profilingService,
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
            
            const result = await this.profilingService.calcularNivelUsuario(createProfileDto);
            
            console.log('========== PERFIL CREADO EXITOSAMENTE ==========');
            console.log('Resultado:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (err) {
            console.error('========== ERROR CREANDO PERFIL ==========');
            console.error('Error completo:', err);
            console.error('Stack:', err?.stack);
            
            throw new BadRequestException({
                message: 'Error al crear el perfil',
                error: err?.message ?? 'Unknown error',
                details: err
            });
        }
    }

    // ========== ENDPOINTS DE RELACIÓN USER-PROFILE ==========

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

    // ========== ENDPOINTS DE PERFILES ==========

    @Get('profiles/stats')
    async getProfileStats() {
        return this.profilingService.getProfileStats();
    }

    @Get('profiles/level/:level')
    async getProfilesByLevel(@Param('level') level: string) {
        return this.profilingService.getProfilesByLevel(level);
    }
}
