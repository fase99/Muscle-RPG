import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RutinaDocument = Rutina & Document;

// ========== EJERCICIO EN RUTINA (NODO DEL GRAFO) ==========
@Schema({ timestamps: true })
export class Ejercicio {
    @Prop({ required: true })
    externalId: string; // ID del ejercicio en ExerciseDB

    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    series: number;

    @Prop({ required: true })
    repeticiones: number;

    @Prop()
    peso: number;

    @Prop({ required: true })
    costoTiempo: number; // Tiempo estimado en minutos (t_j)

    @Prop({ required: true })
    costoFatiga: number; // Costo de Stamina (f_j)

    @Prop({ required: true })
    estimuloXP: number; // Ganancia de hipertrofia esperada (g_j)

    @Prop({ default: false })
    completado: boolean;

    @Prop()
    rir: number; // Repeticiones en Reserva target

    @Prop()
    notas: string;

    // Músculos trabajados (vectorial)
    @Prop({
        type: {
            STR: { type: Number, default: 0 },
            AGI: { type: Number, default: 0 },
            STA: { type: Number, default: 0 },
            INT: { type: Number, default: 0 },
            DEX: { type: Number, default: 0 },
            END: { type: Number, default: 0 },
        },
        default: {},
    })
    muscleTargets: {
        STR: number;
        AGI: number;
        STA: number;
        INT: number;
        DEX: number;
        END: number;
    };
}

const EjercicioSchema = SchemaFactory.createForClass(Ejercicio);

// ========== PROGRESO SEMANAL (PROGRAMACIÓN DINÁMICA) ==========
@Schema()
export class WeeklyProgress {
    @Prop({ required: true })
    weekNumber: number; // Semana del ciclo (1-12)

    @Prop({ required: true })
    volumeTotal: number; // Series totales realizadas

    @Prop({ required: true })
    xpGained: number; // XP acumulado en la semana

    @Prop({ required: true })
    fatigueLevel: number; // Fatiga sistémica acumulada (0-1)

    @Prop({ required: true })
    adherence: number; // % de rutinas completadas (0-1)

    @Prop()
    action: string; // 'increase', 'maintain', 'deload'
}

const WeeklyProgressSchema = SchemaFactory.createForClass(WeeklyProgress);

// ========== RUTINA PRINCIPAL ==========
@Schema({ timestamps: true })
export class Rutina {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    usuarioId: Types.ObjectId;

    @Prop({ required: true, trim: true })
    nombre: string;

    @Prop({ trim: true })
    descripcion: string;

    // ========== TIPO DE CICLO ==========
    @Prop({
        type: String,
        enum: ['daily-session', 'weekly-cycle', 'quarterly-cycle'],
        default: 'daily-session'
    })
    cycleType: string;

    @Prop({
        type: String,
        enum: ['hypertrophy', 'strength', 'endurance'],
        default: 'hypertrophy'
    })
    goal: string;

    // ========== GRAFO DE EJERCICIOS (CAMINO ÓPTIMO) ==========
    @Prop({ type: [EjercicioSchema], default: [] })
    ejercicios: Ejercicio[]; // Camino del DAG

    // ========== RESTRICCIONES CUMPLIDAS ==========
    @Prop({ required: true })
    tiempoTotal: number; // Tiempo total de la sesión (minutos)

    @Prop({ required: true })
    fatigaTotal: number; // Stamina consumida total

    @Prop({ required: true })
    xpTotalEstimado: number; // XP estimado de la sesión

    // ========== VOLUME LANDMARKS (HITOS) ==========
    @Prop({ type: Object })
    volumeLandmarks?: {
        MEV: number; // Minimum Effective Volume
        MAV: number; // Maximum Adaptive Volume
        MRV: number; // Maximum Recoverable Volume
    };

    @Prop()
    currentVolume?: number; // Volumen actual (series semanales)

    // ========== PROGRESO DEL CICLO ==========
    @Prop({ type: [WeeklyProgressSchema], default: [] })
    weeklyProgress: WeeklyProgress[];

    @Prop()
    quarterStartDate?: Date; // Inicio del ciclo trimestral

    @Prop()
    quarterEndDate?: Date; // Fin del ciclo trimestral

    // ========== DÍAS DE LA SEMANA ==========
    @Prop({
        type: [String],
        enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        default: []
    })
    diasSemana: string[];

    // ========== ESTADÍSTICAS ==========
    @Prop({ default: 0 })
    duracionEstimada: number; // en minutos

    @Prop({ default: 0 })
    vecesCompletada: number;

    @Prop({ type: Date })
    ultimaRealizacion: Date;

    @Prop({ default: true })
    activa: boolean;

    // ========== METADATOS DEL ALGORITMO ==========
    @Prop()
    algorithmVersion?: string; // Versión del algoritmo usado

    @Prop({ type: Object })
    algorithmMetadata?: {
        graphNodesEvaluated: number;
        pathsConsidered: number;
        optimizationTime: number; // ms
    };
}

export const RutinaSchema = SchemaFactory.createForClass(Rutina);
