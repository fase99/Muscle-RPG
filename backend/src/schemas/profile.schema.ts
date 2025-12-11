import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProfileDocument = Profile & Document;

@Schema({ timestamps: true })
export class Profile {
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

  // Computed result fields
  @Prop({ required: true })
  sRpg: number;

  @Prop({ required: true })
  level: string;

  @Prop({ required: true })
  estimatedBodyFat: number;

  @Prop({ required: true })
  compositionMultiplier: number;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
