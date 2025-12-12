import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfileDocument = Profile & Document;

@Schema({ timestamps: true })
export class Profile {
  // ========== RELACIÓN CON USER ==========
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId; // Referencia al usuario propietario (opcional para perfiles independientes)

  @Prop({ required: true })
  age: number;

  @Prop({ required: true })
  gender: number; // Genero enum numeric

  @Prop({ required: true })
  experienceMonths: number;

  @Prop({ required: true })
  weight: number;

  @Prop({ required: true })
  height: number; // meters

  @Prop({ required: true })
  nivelactividad: string; // NivelActividad enum string

  @Prop({ required: true })
  condicionmedica: boolean;

  @Prop()
  knownBodyFat?: number;

  // Método de 7 Pliegues Cutáneos (opcional)
  @Prop({ type: Object })
  pliegues?: {
    triceps: number;
    deltoides: number;
    pectoral: number;
    cintura: number;
    gluteo: number;
    cuadriceps: number;
    gastronemio: number;
  };

  // ========== Campos Calculados ==========
  
  @Prop({ required: true })
  sRpg: number; // Score de Capacidad

  @Prop({ required: true })
  level: string; // Básico | Intermedio | Avanzado

  @Prop({ required: true })
  estimatedBodyFat: number; // PGC calculado

  @Prop({ required: true })
  compositionMultiplier: number; // μ_comp

  @Prop()
  metodoCalculoPGC?: string; // Método utilizado para calcular PGC

  @Prop()
  puntajeExperiencia?: number; // P_exp

  @Prop()
  puntajeActividad?: number; // P_act

  @Prop()
  factorSeguridad?: number; // δ_salud

  // ========== Parámetros de Entrenamiento ==========
  
  @Prop({ type: Object })
  frecuenciaSemanal?: { min: number; max: number }; // Días por semana

  @Prop({ type: Object })
  rirTarget?: { min: number; max: number }; // Repeticiones en Reserva

  @Prop({ type: Object })
  cargaEstimada?: { min: number; max: number }; // % del 1RM
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

// Índices para optimizar queries
ProfileSchema.index({ userId: 1 }, { unique: true }); // Un usuario solo puede tener un perfil
ProfileSchema.index({ level: 1 }); // Búsqueda por nivel
ProfileSchema.index({ sRpg: -1 }); // Ordenar por score descendente
