import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { RutinasService } from './rutinas.service';
import { GenerateRoutineDto } from './dto/generate-routine.dto';

@Controller('rutinas')
export class RutinasController {
    constructor(private readonly rutinasService: RutinasService) { }

    // ========== NUEVOS ENDPOINTS - MUSCLE RPG v2.0 ==========


    @Post('generate/daily')
    @HttpCode(HttpStatus.CREATED)
    async generateDailyRoutine(@Body() generateDto: GenerateRoutineDto) {
        const rutina = await this.rutinasService.generateDailyRoutine(
            generateDto.userId,
            generateDto.availableTimeMinutes,
            generateDto.currentStamina,
        );
        
        return {
            message: '¡Misión Diaria generada! 💪',
            rutina,
            stats: {
                ejercicios: rutina.ejercicios.length,
                xpEstimado: Math.round(rutina.xpTotalEstimado),
                tiempo: `${rutina.tiempoTotal} minutos`,
            },
        };
    }


    @Post('generate/weekly')
    @HttpCode(HttpStatus.CREATED)
    async generateWeeklyRoutine(@Body() generateDto: GenerateRoutineDto) {
        const result = await this.rutinasService.generateWeeklyRoutine(
            generateDto.userId,
            generateDto.availableTimeMinutes,
        );
        
        const rutinas = result.rutinas;
        const totalXp = rutinas.reduce((sum, r) => sum + r.xpTotalEstimado, 0);
        const totalTiempo = rutinas.reduce((sum, r) => sum + r.tiempoTotal, 0);
        
        return {
            message: '¡Rutina Semanal generada! 📅',
            rutinas,
            stats: {
                totalDias: rutinas.length,
                diasEntrenamiento: rutinas.filter(r => r.ejercicios.length > 0).length,
                diasDescanso: rutinas.filter(r => r.ejercicios.length === 0).length,
                xpTotalSemana: Math.round(totalXp),
                tiempoTotalSemana: `${totalTiempo} minutos`,
            },
        };
    }

   
    @Post('complete')
    @HttpCode(HttpStatus.OK)
    async completeWorkout(@Body() completeWorkoutDto: {
        userId: string;
        rutinaId?: string;
        ejercicios: {
            externalId: string;
            nombre: string;
            series: number;
            repeticiones: number;
            pesoPlaneado: number;
            pesoReal: number;
            rirPlaneado: number;
            rirReal: number;
            completado: boolean;
            notas?: string;
        }[];
        duration: number;
        staminaUsada?: number;
    }) {
        const result = await this.rutinasService.completeWorkout(
            completeWorkoutDto.userId,
            completeWorkoutDto,
        );

        return {
            message: result.levelUp 
                ? `🎉 ¡Entrenamiento completado! ¡Subiste a ${result.newProfileLevel}!` 
                : '✅ Entrenamiento completado exitosamente',
            ...result,
            stats: {
                xpGanada: result.xpGanada,
                volumenTotal: `${result.totalVolumeLifted}kg`,
                historialId: (result.workoutHistory as any)._id,
            },
        };
    }

    
    @Post('plan/quarterly/:userId')
    @HttpCode(HttpStatus.CREATED)
    async planQuarterlyCycle(@Param('userId') userId: string) {
        const result = await this.rutinasService.planQuarterlyCycle(userId);
        
        return {
            message: 'Ciclo trimestral planificado exitosamente 🎯',
            ...result,
            summary: {
                semanas: result.cycle.weeklyDecisions.length,
                xpTotal: Math.round(result.cycle.totalXPGained),
                fechaInicio: result.cycle.startDate,
                fechaFin: result.cycle.endDate,
            },
        };
    }

   
    @Get('evaluate/quarterly/:userId')
    async evaluateQuarterlyCycle(@Param('userId') userId: string) {
        const evaluacion = await this.rutinasService.evaluateQuarterlyCycle(userId);
        
        return {
            message: 'Evaluación trimestral completada 📊',
            ...evaluacion,
        };
    }

    // ========== ENDPOINTS LEGACY (mantenidos para compatibilidad) ==========

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createRutinaDto: any) {
        return this.rutinasService.create(createRutinaDto);
    }

    @Get()
    findAll() {
        return this.rutinasService.findAll();
    }

    @Get('user/:usuarioId')
    findByUser(@Param('usuarioId') usuarioId: string) {
        return this.rutinasService.findByUser(usuarioId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.rutinasService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateRutinaDto: any) {
        return this.rutinasService.update(id, updateRutinaDto);
    }

    @Patch(':id/ejercicio/:index')
    marcarEjercicioCompletado(
        @Param('id') id: string,
        @Param('index') index: string,
        @Body() body: { completado: boolean },
    ) {
        return this.rutinasService.marcarEjercicioCompletado(
            id,
            parseInt(index),
            body.completado,
        );
    }

    @Patch(':id/completar')
    marcarRutinaCompletada(@Param('id') id: string) {
        return this.rutinasService.marcarRutinaCompletada(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.rutinasService.remove(id);
    }
}
