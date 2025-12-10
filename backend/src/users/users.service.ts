import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async create(createUserDto: {
        nombre: string;
        apellido: string;
        edad: number;
        email: string;
        password: string;
    }): Promise<User> {
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
}
