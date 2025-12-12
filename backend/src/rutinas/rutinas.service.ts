import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rutina, RutinaDocument } from '../schemas/rutina.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { GraphOptimizerService } from './graph-optimizer.service';
import { DynamicProgrammingService } from './dynamic-programming.service';

@Injectable()
export class RutinasService {
    constructor(
        @InjectModel(Rutina.name) private rutinaModel: Model<RutinaDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
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

        // Determinar perfil según nivel (SRPG)
        const perfilConfig = this.determinarPerfilUsuario(user.nivel);
        console.log(`[RutinasService] Perfil: ${perfilConfig.perfil}, RIR: ${perfilConfig.rir}`);

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
            notas: `${perfilConfig.perfil} - RIR ${perfilConfig.rir} - ${perfilConfig.descripcion}`,
        }));

        const optimizationTime = Date.now() - startTime;

        const rutina = new this.rutinaModel({
            usuarioId: new Types.ObjectId(usuarioId),
            nombre: `Misión Diaria - ${perfilConfig.perfil}`,
            descripcion: `Hipertrofia - Perfil ${perfilConfig.perfil} (RIR ${perfilConfig.rir}). Algoritmo DAG. XP: ${Math.round(optimalPath.totalXP)}`,
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
     * Determina el perfil del usuario basado en su nivel (SRPG)
     * Retorna: { perfil, frecuencia, rir, objetivo }
     */
    private determinarPerfilUsuario(nivel: number): { 
        perfil: string; 
        frecuencia: number; 
        rir: number; 
        descripcion: string;
    } {
        if (nivel <= 35) {
            // Perfil Básico (Principiante)
            return {
                perfil: 'Básico',
                frecuencia: 3, // 2-3 sesiones (usamos 3)
                rir: 3,
                descripcion: 'Adaptación neuronal y aprendizaje técnico'
            };
        } else if (nivel <= 65) {
            // Perfil Intermedio
            return {
                perfil: 'Intermedio',
                frecuencia: 4, // 3-4 sesiones (usamos 4)
                rir: 2,
                descripcion: 'Sobrecarga progresiva y hipertrofia funcional'
            };
        } else {
            // Perfil Avanzado
            return {
                perfil: 'Avanzado',
                frecuencia: 5, // 4-5 sesiones (usamos 5)
                rir: 1, // 0-1 (usamos 1)
                descripcion: 'Hipertrofia máxima con alto volumen'
            };
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
    ): Promise<Rutina[]> {
        console.log(`[RutinasService] Generando rutina semanal para usuario ${usuarioId}`);
        
        const user = await this.userModel.findById(usuarioId).exec();
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const profile = await this.profileModel.findOne({ userId: usuarioId }).exec();
        if (!profile) {
            throw new NotFoundException(
                'Perfil no encontrado. Por favor complete el perfilamiento en /setup'
            );
        }

        // Determinar perfil según nivel (SRPG)
        const perfilConfig = this.determinarPerfilUsuario(user.nivel);
        console.log(`[RutinasService] Perfil: ${perfilConfig.perfil} (Nivel ${user.nivel})`);
        console.log(`[RutinasService] Frecuencia: ${perfilConfig.frecuencia} días/semana, RIR: ${perfilConfig.rir}`);

        const weekRoutines: Rutina[] = [];
        const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        // Calcular stamina disponible por día
        const trainingDays = perfilConfig.frecuencia;
        const staminaPerDay = 100; // Stamina fija por día

        // Generar una rutina para cada día de la semana
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const isRestDay = dayIndex >= trainingDays;
            
            if (isRestDay) {
                // Día de descanso
                const restRutina = new this.rutinaModel({
                    usuarioId: new Types.ObjectId(usuarioId),
                    nombre: `${daysOfWeek[dayIndex]} - Día de Descanso`,
                    descripcion: `Recuperación activa. Perfil ${perfilConfig.perfil} - ${perfilConfig.descripcion}`,
                    cycleType: 'daily-session',
                    goal: 'hypertrophy', // Siempre hipertrofia
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
            } else {
                // Día de entrenamiento
                const optimalPath = await this.graphOptimizer.optimizeSesionDiaria(
                    usuarioId,
                    maxTimePerSession,
                    staminaPerDay,
                    perfilConfig.rir, // Pasar el RIR del perfil
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
                    notas: `RIR ${perfilConfig.rir} - ${perfilConfig.perfil} - ${perfilConfig.descripcion}`,
                }));

                const rutina = new this.rutinaModel({
                    usuarioId: new Types.ObjectId(usuarioId),
                    nombre: `${daysOfWeek[dayIndex]} - ${perfilConfig.perfil}`,
                    descripcion: `Hipertrofia - Perfil ${perfilConfig.perfil} (RIR ${perfilConfig.rir}). Algoritmo DAG. XP: ${Math.round(optimalPath.totalXP)}`,
                    cycleType: 'daily-session',
                    goal: 'hypertrophy', // SIEMPRE hipertrofia
                    ejercicios,
                    tiempoTotal: optimalPath.totalTime,
                    fatigaTotal: optimalPath.totalFatigue,
                    xpTotalEstimado: optimalPath.totalXP,
                    volumeLandmarks,
                    currentVolume: ejercicios.reduce((sum, e) => sum + e.series, 0),
                    diasSemana: [daysOfWeek[dayIndex]],
                    duracionEstimada: optimalPath.totalTime,
                    activa: true,
                    algorithmVersion: '2.0-DAG',
                    algorithmMetadata: {
                        graphNodesEvaluated: optimalPath.nodes.length,
                        pathsConsidered: 1,
                        optimizationTime: 0,
                    },
                });

                const saved = await rutina.save();
                weekRoutines.push(saved);
            }
        }

        console.log(`[RutinasService] Rutina semanal generada exitosamente (${weekRoutines.length} días)`);
        return weekRoutines;
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

    async remove(id: string): Promise<void> {
        const result = await this.rutinaModel
            .findByIdAndUpdate(id, { activa: false }, { new: true })
            .exec();

        if (!result) {
            throw new NotFoundException(`Rutina con ID ${id} no encontrada`);
        }
    }
}
