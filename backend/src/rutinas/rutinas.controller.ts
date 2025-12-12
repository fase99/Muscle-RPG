import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { RutinasService } from './rutinas.service';
import { GenerateRoutineDto } from './dto/generate-routine.dto';

@Controller('rutinas')
export class RutinasController {
    constructor(private readonly rutinasService: RutinasService) { }

    // ========== NUEVOS ENDPOINTS - MUSCLE RPG v2.0 ==========

    /**
     * GENERA UNA RUTINA DIARIA OPTIMIZADA (NIVEL 1: GRAFOS DAG)
     * POST /rutinas/generate/daily
     */
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

    /**
     * GENERA UNA RUTINA SEMANAL COMPLETA (7 DÍAS)
     * POST /rutinas/generate/weekly
     */
    @Post('generate/weekly')
    @HttpCode(HttpStatus.CREATED)
    async generateWeeklyRoutine(@Body() generateDto: GenerateRoutineDto) {
        const rutinas = await this.rutinasService.generateWeeklyRoutine(
            generateDto.userId,
            generateDto.availableTimeMinutes,
        );
        
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

    /**
     * PLANIFICA UN CICLO TRIMESTRAL (NIVEL 2: PROGRAMACIÓN DINÁMICA)
     * POST /rutinas/plan/quarterly/:userId
     */
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

    /**
     * EVALÚA EL CICLO TRIMESTRAL COMPLETADO
     * GET /rutinas/evaluate/quarterly/:userId
     */
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
