import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RutinaDocument = Rutina & Document;

@Schema({ timestamps: true })
export class Ejercicio {
    @Prop({ required: true })
    nombre: string;

    @Prop({ required: true })
    series: number;

    @Prop({ required: true })
    repeticiones: number;

    @Prop()
    peso: number;

    @Prop()
    duracion: number; 

    @Prop({ default: false })
    completado: boolean;

    @Prop()
    notas: string;
}

const EjercicioSchema = SchemaFactory.createForClass(Ejercicio);

@Schema({ timestamps: true })
export class Rutina {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    usuarioId: Types.ObjectId;

    @Prop({ required: true, trim: true })
    nombre: string;

    @Prop({ trim: true })
    descripcion: string;

    @Prop({
        type: String,
        enum: ['Fuerza', 'Hipertrofia', 'Resistencia', 'Cardio', 'Mixto'],
        default: 'Mixto'
    })
    tipo: string;

    @Prop({ type: [EjercicioSchema], default: [] })
    ejercicios: Ejercicio[];

    @Prop({
        type: [String],
        enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        default: []
    })
    diasSemana: string[];

    @Prop({ default: 0 })
    duracionEstimada: number; // en minutos

    @Prop({ default: 0 })
    vecesCompletada: number;

    @Prop({ type: Date })
    ultimaRealizacion: Date;

    @Prop({ default: true })
    activa: boolean;
}

export const RutinaSchema = SchemaFactory.createForClass(Rutina);
