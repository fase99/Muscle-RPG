import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rutina, RutinaDocument } from '../schemas/rutina.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { WorkoutHistory, WorkoutHistoryDocument } from '../schemas/workout-history.schema';
import { GraphOptimizerService } from './graph-optimizer.service';
import { DynamicProgrammingService } from './dynamic-programming.service';

@Injectable()
export class RutinasService {
    constructor(
        @InjectModel(Rutina.name) private rutinaModel: Model<RutinaDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
        @InjectModel(WorkoutHistory.name) private workoutHistoryModel: Model<WorkoutHistoryDocument>,
        private graphOptimizer: GraphOptimizerService,
        private dynamicProgramming: DynamicProgrammingService,
    ) { }

    /**
     * GENERA UNA RUTINA DIARIA OPTIMIZADA USANDO GRAFOS (NIVEL 1)
     * Este es el endpoint principal para generar la "Misión Diaria" del usuario
     */
    async generateDailyRoutine(
        usuarioId: string,
        maxTime: number = 120,
        availableStamina?: number,
    ): Promise<Rutina> {
        console.log(`[RutinasService] Generando rutina diaria para usuario ${usuarioId}`);
        
        const startTime = Date.now();

        // 1. Obtener datos del usuario y perfil
        const user = await this.userModel.findById(usuarioId).exec();
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const profile = await this.profileModel.findOne({ userId: usuarioId }).exec();
        if (!profile) {
            throw new NotFoundException(
                'Perfil no encontrado. Por favor complete el perfilamiento en /setup'
            );
        }

        // Usar el nivel directamente del perfil (ya calculado durante el profiling)
        console.log(`[RutinasService] 🔍 Datos del perfil:`, {
            sRpg: profile.sRpg,
            level: profile.level,
            profileId: profile._id,
        });
        
        // Usar el nivel guardado en el perfil en lugar de recalcularlo
        const perfilConfig = this.getConfigPorNivel(profile.level);
        console.log(`[RutinasService] 📊 Usando perfil guardado: ${profile.level} (SRPG: ${profile.sRpg}), RIR: ${perfilConfig.rir}, Frecuencia: ${perfilConfig.frecuenciaMin}-${perfilConfig.frecuenciaMax} días/semana`);

        // 2. Usar el optimizador de grafos para encontrar el camino óptimo
        const optimalPath = await this.graphOptimizer.optimizeSesionDiaria(
            usuarioId,
            maxTime,
            availableStamina,
            perfilConfig.rir, // Pasar el RIR del perfil
        );

        // 3. Calcular Volume Landmarks
        const volumeLandmarks = this.graphOptimizer.calculateVolumeLandmarks(profile);

        // 4. Crear la rutina en la base de datos
        const ejercicios = optimalPath.nodes.map(node => ({
            externalId: node.externalId,
            nombre: node.name,
            series: node.series,
            repeticiones: node.repeticiones,
            peso: 0, // Se calcula en tiempo real según el 1RM del usuario
            costoTiempo: node.costoTiempo,
            costoFatiga: node.costoFatiga,
            estimuloXP: node.estimuloXP,
            completado: false,
            rir: perfilConfig.rir, // Usar el RIR del perfil
            muscleTargets: node.muscleTargets,
            notas: `${perfilConfig.perfil} (SRPG: ${profile.sRpg}) - RIR ${perfilConfig.rir} - ${node.series} series x ${node.repeticiones} reps`,
        }));

        const optimizationTime = Date.now() - startTime;

        const rutina = new this.rutinaModel({
            usuarioId: new Types.ObjectId(usuarioId),
            nombre: `Misión Diaria - ${perfilConfig.perfil}`,
            descripcion: `Hipertrofia - Perfil ${perfilConfig.perfil} (SRPG: ${profile.sRpg}, RIR ${perfilConfig.rir}). ${ejercicios.length} ejercicios, ${Math.round(optimalPath.totalTime)}min, XP: ${Math.round(optimalPath.totalXP)}`,
            cycleType: 'daily-session',
            goal: 'hypertrophy',
            ejercicios,
            tiempoTotal: optimalPath.totalTime,
            fatigaTotal: optimalPath.totalFatigue,
            xpTotalEstimado: optimalPath.totalXP,
            volumeLandmarks,
            currentVolume: ejercicios.reduce((sum, e) => sum + e.series, 0),
            diasSemana: [this.getDayOfWeek()],
            duracionEstimada: optimalPath.totalTime,
            activa: true,
            algorithmVersion: '2.0-DAG',
            algorithmMetadata: {
                graphNodesEvaluated: optimalPath.nodes.length,
                pathsConsidered: 1,
                optimizationTime,
            },
        });

        const savedRutina = await rutina.save();

        console.log(`[RutinasService] Rutina generada exitosamente en ${optimizationTime}ms`);
        console.log(`[RutinasService] Ejercicios: ${ejercicios.length}, XP: ${Math.round(optimalPath.totalXP)}, Tiempo: ${optimalPath.totalTime}min`);

        return savedRutina;
    }

    /**
     * Determina el perfil del usuario basado en su SRPG (Score RPG del Profile)
     * Retorna: { perfil, frecuenciaMin, frecuenciaMax, rir, objetivo }
     * 
     * Perfiles según paper:
     * - Básico (SRPG ≤ 35): 2-3 sesiones semanales, RIR=3 (adaptación neuronal)
     * - Intermedio (36 ≤ SRPG ≤ 65): 3-4 sesiones semanales, RIR=2 (sobrecarga progresiva)
     * - Avanzado (SRPG > 65): 4-5 sesiones semanales, RIR=0-1 (hipertrofia máxima)
     */
    private determinarPerfilUsuario(srpg: number): { 
        perfil: string; 
        frecuenciaMin: number;
        frecuenciaMax: number;
        frecuencia: number; // Valor promedio para compatibilidad
        rir: number; 
        descripcion: string;
    } {
        if (srpg <= 35) {
            // Perfil Básico (Principiante)
            return {
                perfil: 'Básico',
                frecuenciaMin: 2,
                frecuenciaMax: 3,
                frecuencia: 3, // Usar el máximo por defecto
                rir: 3,
                descripcion: 'Adaptación neuronal y aprendizaje técnico. Minimizar riesgo de lesión.'
            };
        } else if (srpg <= 65) {
            // Perfil Intermedio
            return {
                perfil: 'Intermedio',
                frecuenciaMin: 3,
                frecuenciaMax: 4,
                frecuencia: 4, // Usar el máximo por defecto
                rir: 2,
                descripcion: 'Sobrecarga progresiva y hipertrofia funcional. Balance volumen-intensidad.'
            };
        } else {
            // Perfil Avanzado
            return {
                perfil: 'Avanzado',
                frecuenciaMin: 4,
                frecuenciaMax: 5,
                frecuencia: 5, // Usar el máximo por defecto
                rir: 1, // RIR 0-1 (usamos 1 como promedio)
                descripcion: 'Hipertrofia máxima con alto volumen. Series al fallo o muy cerca.'
            };
        }
    }

    /**
     * Obtiene la configuración de entrenamiento basada en el nivel del perfil guardado
     * Este método usa directamente el nivel calculado durante el profiling (Básico/Intermedio/Avanzado)
     * en lugar de recalcularlo desde el SRPG
     */
    private getConfigPorNivel(nivel: string): { 
        perfil: string; 
        frecuenciaMin: number;
        frecuenciaMax: number;
        frecuencia: number;
        rir: number; 
        descripcion: string;
    } {
        // Normalizar el nivel por si viene con mayúsculas/minúsculas diferentes
        const nivelNormalizado = nivel.toLowerCase();

        if (nivelNormalizado.includes('básico') || nivelNormalizado.includes('basico')) {
            return {
                perfil: 'Básico',
                frecuenciaMin: 2,
                frecuenciaMax: 3,
                frecuencia: 3,
                rir: 3,
                descripcion: 'Adaptación neuronal y aprendizaje técnico. Minimizar riesgo de lesión.'
            };
        } else if (nivelNormalizado.includes('intermedio')) {
            return {
                perfil: 'Intermedio',
                frecuenciaMin: 3,
                frecuenciaMax: 4,
                frecuencia: 4,
                rir: 2,
                descripcion: 'Sobrecarga progresiva y hipertrofia funcional. Balance volumen-intensidad.'
            };
        } else if (nivelNormalizado.includes('avanzado')) {
            return {
                perfil: 'Avanzado',
                frecuenciaMin: 4,
                frecuenciaMax: 5,
                frecuencia: 5,
                rir: 1,
                descripcion: 'Hipertrofia máxima con alto volumen. Series al fallo o muy cerca.'
            };
        } else {
            // Por defecto, usar Básico si el nivel no es reconocido
            console.warn(`[RutinasService] ⚠️ Nivel no reconocido: ${nivel}, usando Básico por defecto`);
            return {
                perfil: 'Básico',
                frecuenciaMin: 2,
                frecuenciaMax: 3,
                frecuencia: 3,
                rir: 3,
                descripcion: 'Adaptación neuronal y aprendizaje técnico. Minimizar riesgo de lesión.'
            };
        }
    }

    /**
     * Define la división de grupos musculares según la frecuencia de entrenamiento
     * Retorna un array con los grupos musculares a trabajar cada día
     * 
     * Soporta frecuencias de 2 a 5 días/semana según el perfil del usuario
     */
    private getMuscleGroupSplit(frecuencia: number): string[][] {
        switch (frecuencia) {
            case 2:
                // 2 días/semana (Básico - mínimo) - Full body muy simplificado
                return [
                    ['chest', 'back', 'shoulders'],  // Día 1: Tren superior
                    ['legs', 'core'],                 // Día 2: Tren inferior
                ];
            
            case 3:
                // 3 días/semana (Básico - máximo) - Full body dividido
                return [
                    ['chest', 'shoulders', 'triceps'],  // Día 1: Push
                    ['back', 'biceps'],                  // Día 2: Pull
                    ['legs', 'core'],                    // Día 3: Piernas + Core
                ];
            
            case 4:
                // 4 días/semana (Intermedio) - Upper/Lower split
                return [
                    ['chest', 'triceps'],      // Día 1: Pecho + Tríceps
                    ['back', 'biceps'],        // Día 2: Espalda + Bíceps
                    ['legs', 'core'],          // Día 3: Piernas + Core
                    ['shoulders', 'triceps', 'biceps'], // Día 4: Hombros + Brazos
                ];
            
            case 5:
                // 5 días/semana (Avanzado) - Bro split
                return [
                    ['chest'],                  // Día 1: Pecho
                    ['back'],                   // Día 2: Espalda
                    ['legs'],                   // Día 3: Piernas
                    ['shoulders'],              // Día 4: Hombros
                    ['biceps', 'triceps', 'core'], // Día 5: Brazos + Core
                ];
            
            default:
                // Fallback a 3 días
                return [
                    ['chest', 'shoulders', 'triceps'],
                    ['back', 'biceps'],
                    ['legs', 'core'],
                ];
        }
    }

    /**
     * GENERA UNA RUTINA SEMANAL (7 DÍAS) OPTIMIZADA USANDO GRAFOS
     * Genera una sesión diaria para cada día de la semana con diferentes grupos musculares
     * Respeta las restricciones según el nivel del usuario (SRPG)
     */
    async generateWeeklyRoutine(
        usuarioId: string,
        maxTimePerSession: number = 120,
    ): Promise<{ rutinas: Rutina[] }> {
        console.log(`[RutinasService] Generando rutina semanal para usuario ${usuarioId}`);
        
        const user = await this.userModel.findById(usuarioId).exec();
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const profile = await this.profileModel.findOne({ userId: usuarioId }).exec();
        if (!profile) {
            throw new NotFoundException(
                'Perfil no encontrado. Por favor complete el perfilamiento en /setup'
            );
        }

        // Usar el nivel directamente del perfil (ya calculado durante el profiling)
        const perfilConfig = this.getConfigPorNivel(profile.level);
        console.log(`[RutinasService] Perfil: ${profile.level} (SRPG: ${profile.sRpg})`);
        console.log(`[RutinasService] Frecuencia: ${perfilConfig.frecuenciaMin}-${perfilConfig.frecuenciaMax} días/semana, RIR: ${perfilConfig.rir}`);
        console.log(`[RutinasService] ${perfilConfig.descripcion}`);

        // Definir división de grupos musculares según frecuencia
        const muscleGroupSplits = this.getMuscleGroupSplit(perfilConfig.frecuencia);
        console.log(`[RutinasService] División muscular:`, muscleGroupSplits);

        const weekRoutines: Rutina[] = [];
        const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        // Calcular stamina disponible por día
        const trainingDays = perfilConfig.frecuencia;
        const staminaPerDay = 100; // Stamina fija por día

        // Generar una rutina para cada día de entrenamiento
        for (let dayIndex = 0; dayIndex < trainingDays; dayIndex++) {
            const muscleGroups = muscleGroupSplits[dayIndex];
            const dayName = daysOfWeek[dayIndex];
            
            console.log(`[RutinasService] Generando ${dayName} - Grupos: ${muscleGroups.join(' + ')}`);

            // Día de entrenamiento con grupos musculares específicos
            const optimalPath = await this.graphOptimizer.optimizeSesionDiaria(
                usuarioId,
                maxTimePerSession,
                staminaPerDay,
                perfilConfig.rir,
                muscleGroups, // Pasar los grupos musculares del día
            );

            const volumeLandmarks = this.graphOptimizer.calculateVolumeLandmarks(profile);

            const ejercicios = optimalPath.nodes.map(node => ({
                externalId: node.externalId,
                nombre: node.name,
                series: node.series,
                repeticiones: node.repeticiones,
                peso: 0,
                costoTiempo: node.costoTiempo,
                costoFatiga: node.costoFatiga,
                estimuloXP: node.estimuloXP,
                completado: false,
                rir: perfilConfig.rir, // Usar el RIR del perfil
                muscleTargets: node.muscleTargets,
                notas: `${muscleGroups.join(' + ')} - RIR ${perfilConfig.rir} - ${node.series} series x ${node.repeticiones} reps`,
            }));

            const rutina = new this.rutinaModel({
                usuarioId: new Types.ObjectId(usuarioId),
                nombre: `${dayName} - ${muscleGroups.join(' + ')}`,
                descripcion: `${muscleGroups.join(' + ')} - Perfil ${perfilConfig.perfil} (SRPG: ${profile.sRpg}, RIR ${perfilConfig.rir}). ${ejercicios.length} ejercicios, XP: ${Math.round(optimalPath.totalXP)}`,
                cycleType: 'daily-session',
                goal: 'hypertrophy',
                ejercicios,
                tiempoTotal: optimalPath.totalTime,
                fatigaTotal: optimalPath.totalFatigue,
                xpTotalEstimado: optimalPath.totalXP,
                volumeLandmarks,
                currentVolume: ejercicios.reduce((sum, e) => sum + e.series, 0),
                diasSemana: [dayName],
                duracionEstimada: optimalPath.totalTime,
                activa: true,
                algorithmVersion: '2.0-DAG',
                algorithmMetadata: {
                    graphNodesEvaluated: optimalPath.nodes.length,
                    pathsConsidered: 1,
                    optimizationTime: 0,
                    muscleGroups, // Guardar los grupos musculares trabajados
                },
            });

            const saved = await rutina.save();
            weekRoutines.push(saved);
        }

        // Agregar días de descanso
        for (let dayIndex = trainingDays; dayIndex < 7; dayIndex++) {
            const restRutina = new this.rutinaModel({
                usuarioId: new Types.ObjectId(usuarioId),
                nombre: `${daysOfWeek[dayIndex]} - Descanso`,
                descripcion: `Recuperación activa - ${perfilConfig.perfil}`,
                cycleType: 'daily-session',
                goal: 'hypertrophy',
                ejercicios: [],
                tiempoTotal: 0,
                fatigaTotal: 0,
                xpTotalEstimado: 0,
                currentVolume: 0,
                diasSemana: [daysOfWeek[dayIndex]],
                duracionEstimada: 0,
                activa: true,
                algorithmVersion: '2.0-DAG',
            });
            const saved = await restRutina.save();
            weekRoutines.push(saved);
        }

        console.log(`[RutinasService] ✅ Rutina semanal generada: ${trainingDays} días de entrenamiento + ${7 - trainingDays} días de descanso`);

        return { rutinas: weekRoutines };
    }

    /**
     * PLANIFICA UN CICLO TRIMESTRAL USANDO PROGRAMACIÓN DINÁMICA (NIVEL 2)
     */
    async planQuarterlyCycle(usuarioId: string): Promise<any> {
        console.log(`[RutinasService] Planificando ciclo trimestral para usuario ${usuarioId}`);

        const cycle = await this.dynamicProgramming.planQuarterlyCycle(usuarioId);

        // Guardar el plan del ciclo en una rutina especial tipo 'quarterly-cycle'
        const quarterlyCycleRutina = new this.rutinaModel({
            usuarioId: new Types.ObjectId(usuarioId),
            nombre: `Ciclo Trimestral - ${cycle.startDate.toLocaleDateString()}`,
            descripcion: `Planificación de 12 semanas usando Programación Dinámica`,
            cycleType: 'quarterly-cycle',
            goal: 'hypertrophy',
            ejercicios: [],
            tiempoTotal: 0,
            fatigaTotal: 0,
            xpTotalEstimado: cycle.totalXPGained,
            quarterStartDate: cycle.startDate,
            quarterEndDate: cycle.endDate,
            weeklyProgress: cycle.weeklyDecisions.map(d => ({
                weekNumber: d.semana,
                volumeTotal: d.estado.volumen,
                xpGained: d.ganancia,
                fatigueLevel: d.estado.fatiga,
                adherence: 0, // Se actualizará en tiempo real
                action: d.accion.tipo,
            })),
            activa: true,
            algorithmVersion: '2.0-DP',
        });

        await quarterlyCycleRutina.save();

        console.log(`[RutinasService] Ciclo trimestral planificado: ${cycle.weeklyDecisions.length} semanas`);

        return {
            cycle,
            rutinaId: quarterlyCycleRutina._id,
        };
    }

    /**
     * EVALÚA EL CICLO TRIMESTRAL COMPLETADO
     */
    async evaluateQuarterlyCycle(usuarioId: string): Promise<any> {
        return this.dynamicProgramming.evaluarCicloCompleto(usuarioId);
    }

    /**
     * Obtiene el día de la semana actual en español
     */
    private getDayOfWeek(): string {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[new Date().getDay()];
    }

    // ========== MÉTODOS LEGACY (mantenidos para compatibilidad) ==========

    async create(createRutinaDto: {
        usuarioId: string;
        nombre: string;
        descripcion?: string;
        tipo?: string;
        ejercicios?: any[];
        diasSemana?: string[];
        duracionEstimada?: number;
    }): Promise<Rutina> {
        const createdRutina = new this.rutinaModel({
            ...createRutinaDto,
            usuarioId: new Types.ObjectId(createRutinaDto.usuarioId),
        });
        return createdRutina.save();
    }

    async findAll(): Promise<Rutina[]> {
        return this.rutinaModel.find({ activa: true }).exec();
    }

    async findByUser(usuarioId: string): Promise<Rutina[]> {
        return this.rutinaModel
            .find({ usuarioId: new Types.ObjectId(usuarioId), activa: true })
            .exec();
    }

    async findOne(id: string): Promise<Rutina> {
        const rutina = await this.rutinaModel.findById(id).exec();
        if (!rutina) {
            throw new NotFoundException(`Rutina con ID ${id} no encontrada`);
        }
        return rutina;
    }

    async update(id: string, updateRutinaDto: Partial<Rutina>): Promise<Rutina> {
        const updatedRutina = await this.rutinaModel
            .findByIdAndUpdate(id, updateRutinaDto, { new: true })
            .exec();

        if (!updatedRutina) {
            throw new NotFoundException(`Rutina con ID ${id} no encontrada`);
        }

        return updatedRutina;
    }

    async marcarEjercicioCompletado(
        rutinaId: string,
        ejercicioIndex: number,
        completado: boolean,
    ): Promise<Rutina> {
        const rutina = await this.rutinaModel.findById(rutinaId);
        if (!rutina) {
            throw new NotFoundException(`Rutina con ID ${rutinaId} no encontrada`);
        }

        if (ejercicioIndex < 0 || ejercicioIndex >= rutina.ejercicios.length) {
            throw new NotFoundException(`Ejercicio en índice ${ejercicioIndex} no encontrado`);
        }

        rutina.ejercicios[ejercicioIndex].completado = completado;
        await rutina.save();

        return rutina;
    }

    async marcarRutinaCompletada(id: string): Promise<Rutina> {
        const rutina = await this.rutinaModel.findById(id);
        if (!rutina) {
            throw new NotFoundException(`Rutina con ID ${id} no encontrada`);
        }

        rutina.vecesCompletada += 1;
        rutina.ultimaRealizacion = new Date();

        // Reiniciar el estado de completado de todos los ejercicios
        rutina.ejercicios.forEach(ejercicio => {
            ejercicio.completado = false;
        });

        await rutina.save();
        return rutina;
    }

    /**
     * COMPLETA UNA RUTINA Y ACTUALIZA EL HISTORIAL Y PERFIL DEL USUARIO
     * Este método se llama cuando el usuario finaliza su sesión de entrenamiento
     * 
     * @param usuarioId - ID del usuario
     * @param completeWorkoutDto - Datos de la sesión completada
     * @returns WorkoutHistory guardado y datos actualizados del usuario
     */
    async completeWorkout(usuarioId: string, completeWorkoutDto: {
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
        duration: number; // Duración en minutos
        staminaUsada?: number;
    }): Promise<{
        workoutHistory: WorkoutHistory;
        xpGanada: number;
        totalVolumeLifted: number;
        newProfileLevel?: string;
        levelUp?: boolean;
    }> {
        console.log(`[RutinasService] 🏁 Completando entrenamiento para usuario ${usuarioId}`);

        // 1. Obtener datos del usuario y perfil
        const user = await this.userModel.findById(usuarioId).exec();
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const profile = await this.profileModel.findOne({ userId: usuarioId }).exec();
        if (!profile) {
            throw new NotFoundException('Perfil no encontrado');
        }

        // 2. Calcular volumen total levantado: Σ(peso × series × reps)
        const totalVolumeLifted = completeWorkoutDto.ejercicios.reduce((total, ejercicio) => {
            if (ejercicio.completado && ejercicio.pesoReal > 0) {
                return total + (ejercicio.pesoReal * ejercicio.series * ejercicio.repeticiones);
            }
            return total;
        }, 0);

        console.log(`[RutinasService] 📊 Volumen total levantado: ${totalVolumeLifted}kg`);

        // 3. Calcular XP ganada basada en el volumen levantado
        // Fórmula: XP = volumeLifted × multiplicador de nivel
        const nivelMultiplicador = this.getNivelMultiplicador(profile.level);
        const xpGanada = Math.round(totalVolumeLifted * nivelMultiplicador);

        console.log(`[RutinasService] ⭐ XP ganada: ${xpGanada} (volumen: ${totalVolumeLifted}kg × ${nivelMultiplicador})`);

        // 4. Contar ejercicios completados
        const ejerciciosCompletados = completeWorkoutDto.ejercicios.filter(e => e.completado).length;
        const ejerciciosTotales = completeWorkoutDto.ejercicios.length;

        // 5. Guardar en WorkoutHistory
        const workoutHistory = await this.workoutHistoryModel.create({
            userId: new Types.ObjectId(usuarioId),
            rutinaId: completeWorkoutDto.rutinaId ? new Types.ObjectId(completeWorkoutDto.rutinaId) : undefined,
            date: new Date(),
            duration: completeWorkoutDto.duration,
            completed: ejerciciosCompletados === ejerciciosTotales,
            ejercicios: completeWorkoutDto.ejercicios,
            totalVolumeLifted,
            xpGanada,
            staminaUsada: completeWorkoutDto.staminaUsada,
            ejerciciosCompletados,
            ejerciciosTotales,
            perfilNivel: profile.level,
            userLevel: user.nivel || 1,
        });

        console.log(`[RutinasService] 💾 Historial guardado con ID: ${workoutHistory._id}`);

        // 6. Actualizar perfil del usuario
        // Incrementar XP acumulada y volumen total
        const xpAnterior = profile.sRpg || 0;
        const nuevoSRPG = xpAnterior + (xpGanada * 0.01); // Incremento gradual del SRPG

        // Actualizar el campo de volumen total si existe
        if (profile.schema.path('totalVolumeLifted')) {
            (profile as any).totalVolumeLifted = ((profile as any).totalVolumeLifted || 0) + totalVolumeLifted;
        }

        profile.sRpg = nuevoSRPG;

        // 7. Verificar si sube de nivel
        let levelUp = false;
        let newLevel = profile.level;

        const nivelAnterior = profile.level;
        const nivelCalculado = this.calcularNivelDesdeSRPG(nuevoSRPG);

        if (nivelCalculado !== nivelAnterior) {
            profile.level = nivelCalculado;
            newLevel = nivelCalculado;
            levelUp = true;
            console.log(`[RutinasService] 🎉 ¡LEVEL UP! ${nivelAnterior} → ${nivelCalculado} (SRPG: ${nuevoSRPG})`);
        }

        await profile.save();

        // 8. Actualizar XP del usuario (modelo User)
        user.experiencia = (user.experiencia || 0) + xpGanada;
        
        // Verificar si el usuario sube de nivel en el modelo User
        const xpParaSiguienteNivel = this.calcularXPParaNivel(user.nivel || 1);
        if (user.experiencia >= xpParaSiguienteNivel) {
            user.nivel = (user.nivel || 1) + 1;
            console.log(`[RutinasService] 🎊 Usuario subió al nivel ${user.nivel}`);
        }

        await user.save();

        console.log(`[RutinasService] ✅ Entrenamiento completado exitosamente`);

        return {
            workoutHistory: workoutHistory.toObject(),
            xpGanada,
            totalVolumeLifted,
            newProfileLevel: levelUp ? newLevel : undefined,
            levelUp,
        };
    }

    /**
     * Obtiene el multiplicador de XP según el nivel del perfil
     */
    private getNivelMultiplicador(nivel: string): number {
        const nivelNormalizado = nivel.toLowerCase();
        
        if (nivelNormalizado.includes('básico') || nivelNormalizado.includes('basico')) {
            return 1.0; // Básico: 1.0x XP
        } else if (nivelNormalizado.includes('intermedio')) {
            return 1.2; // Intermedio: 1.2x XP
        } else if (nivelNormalizado.includes('avanzado')) {
            return 1.5; // Avanzado: 1.5x XP
        }
        
        return 1.0; // Por defecto
    }

    /**
     * Calcula el nivel del perfil desde el SRPG
     */
    private calcularNivelDesdeSRPG(srpg: number): string {
        if (srpg <= 35) return 'Básico';
        if (srpg <= 65) return 'Intermedio';
        return 'Avanzado';
    }

    /**
     * Calcula la XP necesaria para alcanzar un nivel específico
     * Fórmula: XP = 100 × nivel²
     */
    private calcularXPParaNivel(nivel: number): number {
        return 100 * Math.pow(nivel, 2);
    }

    async remove(id: string): Promise<void> {
        const result = await this.rutinaModel
            .findByIdAndUpdate(id, { activa: false }, { new: true })
            .exec();

        if (!result) {
            throw new NotFoundException(`Rutina con ID ${id} no encontrada`);
        }
    }
}
