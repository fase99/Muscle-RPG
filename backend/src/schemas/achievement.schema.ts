import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AchievementDocument = Achievement & Document;

export enum AchievementType {
  // Logros de entrenamiento
  WORKOUT_STREAKS = 'workout_streaks',
  TOTAL_WORKOUTS = 'total_workouts',
  
  // Logros de atributos
  ATTRIBUTE_MILESTONE = 'attribute_milestone',
  BALANCED_ATTRIBUTES = 'balanced_attributes',
  
  // Logros de progresión
  LEVEL_MILESTONE = 'level_milestone',
  XP_MILESTONE = 'xp_milestone',
  
  // Logros de perfil
  PROFILE_COMPLETED = 'profile_completed',
  PROFILE_LEVEL_UP = 'profile_level_up',
  
  // Logros especiales
  PERFECT_WEEK = 'perfect_week',
  CONSISTENCY = 'consistency'
}

@Schema({ timestamps: true })
export class Achievement {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: AchievementType, required: true })
  type: AchievementType;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ default: 10 }) // Puntos XP por logro
  xpReward: number;

  @Prop({ type: Object })
  metadata?: {
    value?: number; // Valor del logro (ej: 10 rutinas completadas)
    target?: number; // Valor objetivo
    data?: any;
  };

  @Prop({ default: false })
  hidden: boolean; // Logro secreto hasta desbloquearlo

  @Prop({ default: Date.now })
  unlockedAt: Date;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);

// Índices
AchievementSchema.index({ userId: 1 });
AchievementSchema.index({ type: 1 });
AchievementSchema.index({ userId: 1, type: 1 }, { unique: true }); // Un logro por tipo por usuario
