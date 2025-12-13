import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkoutHistoryDocument = WorkoutHistory & Document;

/**
 * Schema para registrar el historial de entrenamientos completados
 * Almacena los datos reales de cada sesión (pesos levantados, series, reps, etc.)
 */
@Schema({ timestamps: true })
export class WorkoutHistory {
  // ========== RELACIÓN CON USER Y RUTINA ==========
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Rutina' })
  rutinaId?: Types.ObjectId; // Referencia a la rutina que se completó (opcional)

  // ========== DATOS DE LA SESIÓN ==========
  @Prop({ required: true })
  date: Date; // Fecha y hora de inicio de la sesión

  @Prop({ required: true })
  duration: number; // Duración en minutos

  @Prop({ default: false })
  completed: boolean; // Si se completó toda la rutina o fue parcial

  // ========== EJERCICIOS REALIZADOS ==========
  @Prop({
    type: [{
      externalId: String,
      nombre: String,
      series: Number,
      repeticiones: Number,
      pesoPlaneado: Number, // Peso que se planeaba usar
      pesoReal: Number, // Peso que realmente se usó
      rirPlaneado: Number, // RIR planeado
      rirReal: Number, // RIR real alcanzado
      completado: Boolean,
      notas: String, // Notas del usuario sobre el ejercicio
    }],
    default: []
  })
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

  // ========== ESTADÍSTICAS DE LA SESIÓN ==========
  @Prop({ required: true })
  totalVolumeLifted: number; // Volumen total levantado (kg): Σ(peso × series × reps)

  @Prop({ required: true })
  xpGanada: number; // XP ganada en esta sesión

  @Prop()
  staminaUsada?: number; // Stamina/energía consumida

  @Prop()
  ejerciciosCompletados: number; // Cantidad de ejercicios completados

  @Prop()
  ejerciciosTotales: number; // Cantidad total de ejercicios planeados

  // ========== METADATOS ==========
  @Prop()
  perfilNivel?: string; // Nivel del perfil cuando se realizó (Básico/Intermedio/Avanzado)

  @Prop()
  userLevel?: number; // Nivel del usuario cuando se realizó

  @Prop({ type: Object })
  algorithmMetadata?: {
    version?: string;
    optimizationScore?: number;
  };
}

export const WorkoutHistorySchema = SchemaFactory.createForClass(WorkoutHistory);

// Índices para mejorar consultas
WorkoutHistorySchema.index({ userId: 1, date: -1 }); // Buscar por usuario y ordenar por fecha
WorkoutHistorySchema.index({ userId: 1, completed: 1 }); // Filtrar por sesiones completadas
