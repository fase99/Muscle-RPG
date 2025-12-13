import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateProfileDto, Genero, NivelActividad } from './dto/create-profile.dto';

interface PerfilParametros {
  frecuenciaSemanal: { min: number; max: number };
  rirTarget: { min: number; max: number };
  cargaEstimada: { min: number; max: number };
}

@Injectable()
export class profilingService{
    constructor(
      @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
      @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) {}


    async updateProfile(profileId: string, updateData: Partial<CreateProfileDto>) {
    return await this.profileModel.findByIdAndUpdate(profileId, updateData, { new: true });
    }
    async calcularNivelUsuario(data: CreateProfileDto){
        let age = data.age;
        if (!age && data.userId) {
            const user = await this.userModel.findById(data.userId);
            if (user) {
                age = user.edad;
                console.log(`[ProfilingService] Edad obtenida del usuario: ${age}`);
            } else {
                throw new Error('Usuario no encontrado y edad no proporcionada');
            }
        }
        
        if (!age) {
            throw new Error('Edad es requerida para calcular el perfil');
        }

        const deltaSalud = data.condicionmedica ? 0 : 1;

        let pExp = 0;

        if (data.experienceMonths < 3){
            pExp = 5;
        }
        else if(data.experienceMonths < 6){
            pExp = 15;
        }
        else if(data.experienceMonths < 12){
            pExp = 30;
        }
        else if(data.experienceMonths < 24){
            pExp = 45;
        }
        else{
            pExp = 60;
        }

        let pAct = 0;
        switch (data.nivelactividad) {
          case NivelActividad.SEDENTARY: pAct = 0; break;
          case NivelActividad.ACTIVE: pAct = 10; break;
          case NivelActividad.SPORT: pAct = 20; break;
        }

        let pgc: number;
        let metodoUtilizado: string;

        if (this.tiene7Pliegues(data)) {
            pgc = this.calcularPGC7Pliegues(data, age);
            metodoUtilizado = '7 Pliegues (Gold Standard)';
        }
        else if (data.knownBodyFat) {
            pgc = data.knownBodyFat;
            metodoUtilizado = 'Valor Proporcionado';
        }
        else {
            const imc = data.weight / (data.height * data.height);
            pgc = (1.20 * imc) + (0.23 * age) - (10.8 * data.gender) - 5.4;
            metodoUtilizado = 'Estimación Deurenberg (IMC)';
        }

        const muComp = this.getCompositionMultiplier(pgc, data.gender, data.weight, data.height);

        const sRpg = (pExp + pAct) * muComp * deltaSalud;

        let level = 'Básico';
        if (sRpg > 65) level = 'Avanzado';
        else if (sRpg >= 36) level = 'Intermedio';

        const parametrosCarga = this.getParametrosPorPerfil(level);

        const result = {
          sRpg,
          level,
          estimatedBodyFat: pgc,
          compositionMultiplier: muComp,
          metodoCalculoPGC: metodoUtilizado,
          puntajeExperiencia: pExp,
          puntajeActividad: pAct,
          factorSeguridad: deltaSalud,
          frecuenciaSemanal: parametrosCarga.frecuenciaSemanal,
          rirTarget: parametrosCarga.rirTarget,
          cargaEstimada: parametrosCarga.cargaEstimada,
        };

        const profileData: any = {
          age: age,
          gender: data.gender,
          experienceMonths: data.experienceMonths,
          weight: data.weight,
          height: data.height,
          nivelactividad: data.nivelactividad,
          condicionmedica: data.condicionmedica,
          knownBodyFat: data.knownBodyFat,
          pliegues: this.tiene7Pliegues(data) ? {
            triceps: data.pliegue_triceps,
            deltoides: data.pliegue_deltoides,
            pectoral: data.pliegue_pectoral,
            cintura: data.pliegue_cintura,
            gluteo: data.pliegue_gluteo,
            cuadriceps: data.pliegue_cuadriceps,
            gastronemio: data.pliegue_gastronemio,
          } : undefined,
          ...result,
        };

        if (data.userId) {
          profileData.userId = data.userId;
          console.log(`[ProfilingService] Vinculando perfil con usuario: ${data.userId}`);
        }

        let profileDocument: ProfileDocument;
        
        if (data.userId) {
          const existingProfile = await this.profileModel.findOne({ userId: data.userId });
          
          if (existingProfile) {
            console.log(`[ProfilingService] Actualizando perfil existente: ${existingProfile._id}`);
            const updated = await this.profileModel.findByIdAndUpdate(
              existingProfile._id,
              profileData,
              { new: true }
            );
            
            if (!updated) {
              throw new Error(`No se pudo actualizar el perfil ${existingProfile._id}`);
            }
            profileDocument = updated;
          } else {
            console.log(`[ProfilingService] Creando nuevo perfil para usuario: ${data.userId}`);
            profileDocument = await this.profileModel.create(profileData);
          }
        } else {
          profileDocument = await this.profileModel.create(profileData);
        }

        console.log(`[ProfilingService] Perfil guardado con ID: ${profileDocument._id}`);

        if (data.userId) {
          try {
            const updatedUser = await this.userModel.findByIdAndUpdate(
              data.userId,
              { profileId: profileDocument._id },
              { new: true }
            );
            
            if (!updatedUser) {
              console.warn(`[ProfilingService] Usuario no encontrado: ${data.userId}`);
            } else {
              console.log(`[ProfilingService] Usuario actualizado con profileId: ${profileDocument._id}`);
            }
          } catch (error) {
            console.error(`[ProfilingService] Error actualizando usuario:`, error);
          }
        }

        return {
          ...result,
          profileId: profileDocument._id.toString(),
          userId: data.userId
        };
    }

    private tiene7Pliegues(data: CreateProfileDto): boolean {
        return !!(
            data.pliegue_triceps &&
            data.pliegue_deltoides &&
            data.pliegue_pectoral &&
            data.pliegue_cintura &&
            data.pliegue_gluteo &&
            data.pliegue_cuadriceps &&
            data.pliegue_gastronemio
        );
    }

    private calcularPGC7Pliegues(data: CreateProfileDto, age: number): number {
        const suma7 = 
            data.pliegue_triceps! +
            data.pliegue_deltoides! +
            data.pliegue_pectoral! +
            data.pliegue_cintura! +
            data.pliegue_gluteo! +
            data.pliegue_cuadriceps! +
            data.pliegue_gastronemio!;

        let densidad: number;
        const genero = data.gender;

        if (genero === Genero.Male) {
            densidad = 1.112 - (0.00043499 * suma7) + (0.00000055 * suma7 * suma7) - (0.00028826 * age);
        } else {
            densidad = 1.097 - (0.00046971 * suma7) + (0.00000056 * suma7 * suma7) - (0.00012828 * age);
        }

        const pgc = (495 / densidad) - 450;

        return Math.max(0, Math.min(pgc, 60));
    }


    private getCompositionMultiplier(pgc: number, gender: Genero, weight: number, height: number): number {
        const imc = weight / (height * height);

        if (imc < 18.5) return 0.90;

        if (gender === Genero.Male) {
            if (pgc < 13) return 1.20;
            if (pgc <= 17) return 1.10;
            if (pgc <= 24) return 1.00;
            if (pgc <= 29) return 0.90;
            return 0.80;
        } else {
            if (pgc < 20) return 1.20;
            if (pgc <= 24) return 1.10;
            if (pgc <= 31) return 1.00;
            if (pgc <= 37) return 0.90;
            return 0.80;
        }
    }

    private getParametrosPorPerfil(level: string): PerfilParametros {
        switch (level) {
            case 'Básico':
                return {
                    frecuenciaSemanal: { min: 2, max: 3 },
                    rirTarget: { min: 3, max: 3 },
                    cargaEstimada: { min: 70, max: 75 },
                };
            
            case 'Intermedio':
                return {
                    frecuenciaSemanal: { min: 3, max: 4 },
                    rirTarget: { min: 2, max: 2 },
                    cargaEstimada: { min: 75, max: 80 },
                };
            
            case 'Avanzado':
                return {
                    frecuenciaSemanal: { min: 4, max: 5 },
                    rirTarget: { min: 0, max: 1 },
                    cargaEstimada: { min: 85, max: 90 },
                };
            
            default:
                return {
                    frecuenciaSemanal: { min: 2, max: 3 },
                    rirTarget: { min: 3, max: 3 },
                    cargaEstimada: { min: 70, max: 75 },
                };
        }
    }

    async getProfileWithUser(profileId: string): Promise<any> {
        return this.profileModel
            .findById(profileId)
            .populate('userId', '-password')
            .exec();
    }

    async getProfilesByLevel(level: string): Promise<Profile[]> {
        return this.profileModel.find({ level }).exec();
    }

    async getProfileStats(): Promise<any> {
        const total = await this.profileModel.countDocuments().exec();
        const basico = await this.profileModel.countDocuments({ level: 'Básico' }).exec();
        const intermedio = await this.profileModel.countDocuments({ level: 'Intermedio' }).exec();
        const avanzado = await this.profileModel.countDocuments({ level: 'Avanzado' }).exec();

        return {
            total,
            porNivel: {
                basico,
                intermedio,
                avanzado
            },
            porcentajes: {
                basico: total > 0 ? ((basico / total) * 100).toFixed(2) : 0,
                intermedio: total > 0 ? ((intermedio / total) * 100).toFixed(2) : 0,
                avanzado: total > 0 ? ((avanzado / total) * 100).toFixed(2) : 0
            }
        };
    }
}