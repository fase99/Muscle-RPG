import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, trim: true })
    nombre: string;

    @Prop({ required: true, trim: true })
    apellido: string;

    @Prop({ required: true, min: 13, max: 120 })
    edad: number;

    @Prop({ required: true, unique: true, lowercase: true, trim: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ default: 1 })
    nivel: number;

    @Prop({ default: 0 })
    experiencia: number;

    @Prop({ default: 1000 })
    experienciaMaxima: number;

    @Prop({
        type: {
            STR: { type: Number, default: 50 },
            AGI: { type: Number, default: 50 },
            STA: { type: Number, default: 50 },
            INT: { type: Number, default: 50 },
            DEX: { type: Number, default: 50 },
            END: { type: Number, default: 50 },
        },
        default: {},
    })
    atributos: {
        STR: number;
        AGI: number;
        STA: number;
        INT: number;
        DEX: number;
        END: number;
    };

    @Prop({ default: 100 })
    staminaActual: number; // (s_actual) Stamina disponible del usuario

    @Prop({ default: 100 })
    staminaMaxima: number; // (s_max) Stamina máxima del usuario

    @Prop({ type: [String], default: [] })
    ejerciciosCompletados: string[]; // (H) Historial de ejercicios dominados

    @Prop({ default: 0 })
    rachasDias: number;

    @Prop({ default: 0 })
    logrosObtenidos: number;

    @Prop({ type: [String], default: [] })
    rutinas: string[];

    @Prop({
        type: [{
            icon: String,
            label: String,
            subLabel: String,
            value: String,
            unit: String,
            trend: String,
            updatedAt: { type: Date, default: Date.now }
        }],
        default: []
    })
    metricas: {
        icon: string;
        label: string;
        subLabel: string;
        value: string;
        unit: string;
        trend: string;
        updatedAt: Date;
    }[];

    @Prop({ default: true })
    activo: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
