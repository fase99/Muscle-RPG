import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    ) { }

    async create(createUserDto: {
        nombre: string;
        apellido: string;
        edad: number;
        email: string;
        password: string;
    }): Promise<UserDocument> {
        const existingUser = await this.userModel.findOne({ email: createUserDto.email });
        if (existingUser) {
            throw new ConflictException('El email ya está registrado');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const createdUser = new this.userModel({
            ...createUserDto,
            password: hashedPassword,
        });

        return createdUser.save();
    }

    async findAll(): Promise<User[]> {
        return this.userModel.find({ activo: true }).select('-password').exec();
    }

    async findOne(id: string): Promise<User> {
        const user = await this.userModel.findById(id).select('-password').exec();
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return user;
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email, activo: true }).exec();
    }

    async update(id: string, updateUserDto: Partial<User>): Promise<User> {
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        const updatedUser = await this.userModel
            .findByIdAndUpdate(id, updateUserDto, { new: true })
            .select('-password')
            .exec();

        if (!updatedUser) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        return updatedUser;
    }

    async updateAtributos(
        id: string,
        atributos: Partial<User['atributos']>,
    ): Promise<User> {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        user.atributos = { ...user.atributos, ...atributos };
        await user.save();

        return this.findOne(id);
    }

    async updateExperiencia(id: string, xpGanada: number): Promise<User> {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        user.experiencia += xpGanada;

        // Sistema de nivelación (REVISAR)
        while (user.experiencia >= user.experienciaMaxima) {
            user.experiencia -= user.experienciaMaxima;
            user.nivel += 1;
            user.experienciaMaxima = Math.floor(user.experienciaMaxima * 1.5);
        }

        await user.save();
        return this.findOne(id);
    }

    /**
     * Actualizar stamina del usuario
     * @param id ID del usuario
     * @param staminaCost Costo de stamina a restar (negativo para recuperar)
     */
    async updateStamina(id: string, staminaCost: number): Promise<User> {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        user.staminaActual = Math.max(0, Math.min(user.staminaMaxima, user.staminaActual - staminaCost));
        await user.save();
        return this.findOne(id);
    }

    /**
     * Marcar ejercicio como completado y actualizar historial
     * @param id ID del usuario
     * @param exerciseId ID del ejercicio completado
     */
    async completeExercise(id: string, exerciseId: string): Promise<User> {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        if (!user.ejerciciosCompletados.includes(exerciseId)) {
            user.ejerciciosCompletados.push(exerciseId);
            await user.save();
        }

        return this.findOne(id);
    }

    /**
     * Obtener historial de ejercicios completados
     * @param id ID del usuario
     */
    async getCompletedExercises(id: string): Promise<string[]> {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        return user.ejerciciosCompletados;
    }

    async updateMetrics(id: string, metricas: any[]): Promise<User> {
        const updatedUser = await this.userModel
            .findByIdAndUpdate(
                id,
                { 
                    metricas: metricas.map(m => ({
                        ...m,
                        updatedAt: new Date()
                    }))
                },
                { new: true }
            )
            .select('-password')
            .exec();

        if (!updatedUser) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }

        return updatedUser;
    }

    async remove(id: string): Promise<void> {
        const result = await this.userModel
            .findByIdAndUpdate(id, { activo: false }, { new: true })
            .exec();

        if (!result) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
    }

    async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    // ========== MÉTODOS DE RELACIÓN CON PROFILE ==========

    /**
     * Obtiene un usuario con su perfil de perfilamiento poblado
     */
    async findOneWithProfile(userId: string): Promise<any> {
        const user = await this.userModel
            .findById(userId)
            .populate('profileId')
            .select('-password')
            .exec();

        if (!user) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }

        return user;
    }

    /**
     * Obtiene el perfil asociado a un usuario
     */
    async getProfileByUserId(userId: string): Promise<Profile | null> {
        return this.profileModel.findOne({ userId }).exec();
    }

    /**
     * Verifica si un usuario tiene perfil de perfilamiento
     */
    async hasProfile(userId: string): Promise<boolean> {
        const profile = await this.profileModel.findOne({ userId }).exec();
        return !!profile;
    }

    /**
     * Actualiza la referencia al perfil en el usuario
     */
    async linkProfileToUser(userId: string, profileId: string): Promise<User> {
        const updatedUser = await this.userModel
            .findByIdAndUpdate(
                userId,
                { profileId },
                { new: true }
            )
            .select('-password')
            .exec();

        if (!updatedUser) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }

        return updatedUser;
    }
}
