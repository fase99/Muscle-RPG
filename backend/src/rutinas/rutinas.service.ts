import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rutina, RutinaDocument } from '../schemas/rutina.schema';

@Injectable()
export class RutinasService {
    constructor(
        @InjectModel(Rutina.name) private rutinaModel: Model<RutinaDocument>,
    ) { }

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
