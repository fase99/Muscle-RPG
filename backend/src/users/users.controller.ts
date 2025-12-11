import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateProfileDto } from './dto/create-profile.dto';
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

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @Post('profile')
    createProfile(@Body() createProfileDto: CreateProfileDto) {
    return this.profilingService.calcularNivelUsuario(createProfileDto);
}   
}
