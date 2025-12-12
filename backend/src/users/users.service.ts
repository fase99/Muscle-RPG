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
        const user = await this.userModel.findById(id).populate('profileId').select('-password').exec();
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
        }
        return user;
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email, activo: true }).exec();
    }

    async findByEmailWithProfile(email: string): Promise<UserDocument | null> {
        return this.userModel
            .findOne({ email, activo: true })
            .populate('profileId')
            .exec();
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

        // Sistema de nivelación
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

    /**
     * Obtiene estadísticas del usuario basadas en sus rutinas completadas
     */
    async getUserStats(userId: string): Promise<any> {
        const user = await this.userModel
            .findById(userId)
            .populate('profileId')
            .exec();

        if (!user) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }

        // Obtener rutinas del usuario desde la colección de rutinas
        const rutinas = await this.userModel.db.collection('rutinas')
            .find({ usuarioId: userId })
            .toArray();

        // Calcular estadísticas
        const stats = {
            // Datos personales
            personalData: {
                nombre: `${user.nombre} ${user.apellido}`,
                email: user.email,
                edad: user.edad,
                nivel: user.nivel,
                experiencia: user.experiencia,
                experienciaMaxima: user.experienciaMaxima,
            },
            
            // Datos del perfil
            profileData: user.profileId ? {
                level: (user.profileId as any).level,
                weight: (user.profileId as any).weight,
                height: (user.profileId as any).height,
                bmi: (user.profileId as any).weight / Math.pow((user.profileId as any).height / 100, 2),
                trainingExperience: (user.profileId as any).trainingExperience,
            } : null,

            // Atributos actuales
            atributos: user.atributos,

            // Estadísticas de rutinas
            rutinasStats: {
                totalRutinas: rutinas.length,
                rutinasCompletadas: rutinas.filter((r: any) => r.completada).length,
                totalEjercicios: rutinas.reduce((sum: number, r: any) => sum + (r.ejercicios?.length || 0), 0),
                ejerciciosCompletados: rutinas.reduce((sum: number, r: any) => 
                    sum + (r.ejercicios?.filter((e: any) => e.completado).length || 0), 0
                ),
                xpTotalGanado: rutinas.reduce((sum: number, r: any) => sum + (r.xpGanado || 0), 0),
                xpEstimadoTotal: rutinas.reduce((sum: number, r: any) => sum + (r.xpTotalEstimado || 0), 0),
                tiempoTotalMinutos: rutinas.reduce((sum: number, r: any) => sum + (r.tiempoTotal || 0), 0),
                diasEntrenamiento: new Set(rutinas.map((r: any) => 
                    new Date(r.createdAt).toDateString()
                )).size,
            },

            // Métricas calculadas
            metricas: [
                {
                    icon: '🏋️',
                    label: 'Rutinas Completadas',
                    subLabel: 'Total de sesiones',
                    value: rutinas.filter((r: any) => r.completada).length.toString(),
                    unit: 'sesiones',
                    trend: rutinas.length > 0 ? 'En progreso' : 'Sin datos'
                },
                {
                    icon: '📊',
                    label: 'Ejercicios Realizados',
                    subLabel: 'Ejercicios completados',
                    value: rutinas.reduce((sum: number, r: any) => 
                        sum + (r.ejercicios?.filter((e: any) => e.completado).length || 0), 0
                    ).toString(),
                    unit: 'ejercicios',
                    trend: rutinas.length > 0 ? `${rutinas.length} rutinas generadas` : 'Comienza a entrenar'
                },
                {
                    icon: '⚡',
                    label: 'XP Total Ganado',
                    subLabel: 'Puntos de experiencia',
                    value: user.experiencia.toString(),
                    unit: 'XP',
                    trend: `Nivel ${user.nivel}`
                },
                {
                    icon: '⏱️',
                    label: 'Tiempo de Entrenamiento',
                    subLabel: 'Minutos totales',
                    value: Math.round(rutinas.reduce((sum: number, r: any) => 
                        sum + (r.tiempoTotal || 0), 0
                    )).toString(),
                    unit: 'min',
                    trend: `${new Set(rutinas.map((r: any) => new Date(r.createdAt).toDateString())).size} días entrenados`
                }
            ],

            // Análisis de atributos
            atributosAnalisis: this.analizarAtributos(user.atributos),
        };

        return stats;
    }

    /**
     * Analiza los atributos del usuario y genera descripción
     */
    private analizarAtributos(atributos: any): any {
        const attrs = [
            { key: 'STR', value: atributos.STR, label: 'Fuerza' },
            { key: 'AGI', value: atributos.AGI, label: 'Agilidad' },
            { key: 'STA', value: atributos.STA, label: 'Resistencia' },
            { key: 'INT', value: atributos.INT, label: 'Técnica' },
            { key: 'DEX', value: atributos.DEX, label: 'Destreza' },
            { key: 'END', value: atributos.END, label: 'Durabilidad' },
        ];

        // Encontrar el atributo más alto
        const maxAttr = attrs.reduce((max, attr) => attr.value > max.value ? attr : max, attrs[0]);
        
        // Calcular promedio
        const avg = attrs.reduce((sum, attr) => sum + attr.value, 0) / attrs.length;

        let perfil = 'BALANCED';
        let descripcion = 'Tu perfil muestra un desarrollo equilibrado en todos los atributos.';

        if (maxAttr.value > avg * 1.3) {
            perfil = `${maxAttr.key} FOCUSED`;
            
            const descripciones: Record<string, string> = {
                STR: 'Tank/Warrior build. Fuerza y potencia son tus atributos principales.',
                AGI: 'Speedster build. Velocidad y explosividad definen tu entrenamiento.',
                STA: 'Endurance build. Resistencia cardiovascular es tu fuerte.',
                INT: 'Technical build. Dominas la técnica y ejecución perfecta.',
                DEX: 'Agility build. Coordinación y movimientos complejos son tu especialidad.',
                END: 'Tank build. Durabilidad y capacidad de trabajo son excepcionales.',
            };
            
            descripcion = descripciones[maxAttr.key] || descripcion;
        }

        return {
            perfil,
            descripcion,
            atributoDestacado: maxAttr.key,
            valorDestacado: maxAttr.value,
            promedio: Math.round(avg),
        };
    }
}
