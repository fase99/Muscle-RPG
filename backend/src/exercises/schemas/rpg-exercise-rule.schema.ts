import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RpgExerciseRuleDocument = RpgExerciseRule & Document;

@Schema({ collection: 'rpg_exercise_rules' })
export class RpgExerciseRule {
  @Prop({ required: true, unique: true })
  externalId: string; // El ID que viene de ExerciseDB (ej: "0001")

  @Prop({ required: true })
  levelRequired: number; // Nivel de usuario para desbloquear

  @Prop({ required: true, type: Number })
  baseXP: number; // (g_j) Ganancia de Hipertrofia

  @Prop({ required: true, type: Number })
  fatigueCost: number; // (f_j) Costo de Stamina

  // DEFINICIÓN DEL GRAFO (ARISTAS E)
  // IDs de ejercicios que deben dominarse antes que este
  @Prop({ type: [String], default: [] })
  prerequisites: string[];

  // IDs de ejercicios que este desbloquea
  @Prop({ type: [String], default: [] })
  unlocks: string[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const RpgExerciseRuleSchema = SchemaFactory.createForClass(RpgExerciseRule);

// Índices para mejorar performance de búsquedas
RpgExerciseRuleSchema.index({ externalId: 1 });
RpgExerciseRuleSchema.index({ levelRequired: 1 });
