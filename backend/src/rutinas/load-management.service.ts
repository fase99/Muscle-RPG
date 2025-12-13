import { Injectable, Logger } from '@nestjs/common';
import { Profile } from '../schemas/profile.schema';
import { ExerciseDbService, ExerciseDbExercise } from '../exercises/exercisedb.service';

export interface ExerciseHistoryEntry {
    exerciseId: string;
    weight: number;
    reps: number;
    date: Date;
    estimated1RM?: number;
}


export interface PreparedExerciseSession {
    exerciseId: string;
    name: string;
    gifUrl: string;
    instructions?: string;
    
    targetWeight: number;
    rir: number;
    estimated1RM?: number;
    intensity: number;
    
    repsRange: string;
    targetReps: number;
    
    isNew: boolean;
    requiresTest: boolean;
    
    userLevel: string;
    notes?: string;
}


@Injectable()
export class LoadManagementService {
    private readonly logger = new Logger(LoadManagementService.name);

    private readonly EXPLORATORY_WEIGHT = 20;
    private readonly PLATE_INCREMENT = 2.5;
    private readonly HYPERTROPHY_RANGE = { min: 8, max: 12 };

    constructor(
        private readonly exerciseDbService: ExerciseDbService,
    ) {}


    async prepareExerciseSession(
        userProfile: Profile,
        exerciseHistory: ExerciseHistoryEntry[],
        exerciseId: string,
    ): Promise<PreparedExerciseSession> {
        this.logger.log(`📋 Preparando sesión para ejercicio: ${exerciseId}`);

        const exerciseData = await this.fetchExerciseVisualData(exerciseId);

        const userLevel = this.getUserLevel(userProfile.sRpg);
        this.logger.log(`👤 Nivel del usuario: ${userLevel} (SRPG: ${userProfile.sRpg})`);

        const { estimated1RM, isNew } = this.calculate1RM(exerciseHistory, exerciseId);

        const loadParams = this.determineLoadParameters(userLevel);

        const rawWeight = estimated1RM * loadParams.intensity;
        const targetWeight = this.roundToPlateIncrement(rawWeight);

        this.logger.log(
            `💪 Carga calculada: ${rawWeight.toFixed(1)}kg → ${targetWeight}kg (${loadParams.intensity * 100}% de 1RM ${estimated1RM}kg)`
        );

        const session: PreparedExerciseSession = {
            exerciseId: exerciseData.exerciseId,
            name: exerciseData.name,
            gifUrl: exerciseData.gifUrl,
            instructions: exerciseData.instructions,

            targetWeight,
            rir: loadParams.rir,
            estimated1RM: isNew ? undefined : estimated1RM,
            intensity: loadParams.intensity,

            repsRange: `${this.HYPERTROPHY_RANGE.min}-${this.HYPERTROPHY_RANGE.max}`,
            targetReps: Math.floor(
                (this.HYPERTROPHY_RANGE.min + this.HYPERTROPHY_RANGE.max) / 2
            ),

            isNew,
            requiresTest: isNew,

            userLevel,
            notes: this.generateSessionNotes(targetWeight, loadParams, isNew),
        };

        this.logger.log(
            `✅ Sesión preparada: ${targetWeight}kg @ RIR ${loadParams.rir} (${session.repsRange} reps)${isNew ? ' - ⚠️ NUEVO' : ''}`
        );

        return session;
    }


    private async fetchExerciseVisualData(exerciseId: string): Promise<{
        exerciseId: string;
        name: string;
        gifUrl: string;
        instructions?: string;
    }> {
        this.logger.log(`🔍 Recuperando datos visuales para: ${exerciseId}`);

        const exercises = await this.exerciseDbService.getExercisesByIds([exerciseId]);
        const exercise = exercises.length > 0 ? exercises[0] : null;

        if (!exercise) {
            this.logger.warn(`⚠️ Ejercicio no encontrado: ${exerciseId}`);
            return {
                exerciseId,
                name: 'Ejercicio Desconocido',
                gifUrl: '',
                instructions: undefined,
            };
        }

        return {
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            gifUrl: exercise.gifUrl || '',
            instructions: exercise.instructions?.join('\n'),
        };
    }

    private calculate1RM(
        history: ExerciseHistoryEntry[],
        exerciseId: string,
    ): { estimated1RM: number; isNew: boolean } {
        const exerciseRecords = history
            .filter(entry => entry.exerciseId === exerciseId)
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        if (exerciseRecords.length === 0) {
            this.logger.log(`🆕 Ejercicio nuevo, usando peso exploratorio: ${this.EXPLORATORY_WEIGHT}kg`);
            return {
                estimated1RM: this.EXPLORATORY_WEIGHT,
                isNew: true,
            };
        }

        const lastRecord = exerciseRecords[0];

        if (lastRecord.estimated1RM) {
            this.logger.log(`📊 Usando 1RM del historial: ${lastRecord.estimated1RM}kg`);
            return {
                estimated1RM: lastRecord.estimated1RM,
                isNew: false,
            };
        }

        const epley1RM = this.calculateEpley1RM(lastRecord.weight, lastRecord.reps);
        this.logger.log(
            `🧮 1RM calculado con Epley: ${epley1RM}kg (desde ${lastRecord.weight}kg x ${lastRecord.reps} reps)`
        );

        return {
            estimated1RM: epley1RM,
            isNew: false,
        };
    }


    private calculateEpley1RM(weight: number, reps: number): number {
        if (reps === 1) {
            return weight;
        }

        const epley = weight * (1 + reps / 30);
        return Math.round(epley * 10) / 10;
    }

    private determineLoadParameters(level: string): {
        intensity: number;
        rir: number;
    } {
        switch (level) {
            case 'Básico':
                return {
                    intensity: 0.7,
                    rir: 3,
                };

            case 'Intermedio':
                return {
                    intensity: 0.8,
                    rir: 2,
                };

            case 'Avanzado':
                return {
                    intensity: 0.9,
                    rir: 1,
                };

            default:
                this.logger.warn(`⚠️ Nivel desconocido: ${level}, usando Intermedio`);
                return {
                    intensity: 0.8,
                    rir: 2,
                };
        }
    }

    private roundToPlateIncrement(weight: number): number {
        return Math.round(weight / this.PLATE_INCREMENT) * this.PLATE_INCREMENT;
    }

    private getUserLevel(srpg: number): string {
        if (srpg < 45) return 'Básico';
        if (srpg < 65) return 'Intermedio';
        return 'Avanzado';
    }

    private generateSessionNotes(
        weight: number,
        params: { intensity: number; rir: number },
        isNew: boolean,
    ): string {
        if (isNew) {
            return `⚠️ EJERCICIO NUEVO - Test exploratorio con ${weight}kg. Ajusta según tu capacidad.`;
        }

        return `${weight}kg @ RIR ${params.rir} (${params.intensity * 100}% 1RM) - Hipertrofia`;
    }

    async prepareMultipleExercises(
        userProfile: Profile,
        exerciseHistory: ExerciseHistoryEntry[],
        exerciseIds: string[],
    ): Promise<Map<string, PreparedExerciseSession>> {
        const sessions = new Map<string, PreparedExerciseSession>();

        for (const exerciseId of exerciseIds) {
            const session = await this.prepareExerciseSession(
                userProfile,
                exerciseHistory,
                exerciseId,
            );
            sessions.set(exerciseId, session);
        }

        return sessions;
    }

    updateEstimated1RM(weight: number, reps: number): number {
        return this.calculateEpley1RM(weight, reps);
    }
}
