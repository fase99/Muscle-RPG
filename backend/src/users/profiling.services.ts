import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateProfileDto, Genero, NivelActividad } from './dto/create-profile.dto';

// Interfaz para parámetros de carga según perfil
interface PerfilParametros {
  frecuenciaSemanal: { min: number; max: number };
  rirTarget: { min: number; max: number };
  cargaEstimada: { min: number; max: number }; // % del 1RM
}

@Injectable()
export class profilingService{
    constructor(
      @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
      @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) {}


    /**
     * Algoritmo de Clasificación Multifactorial del Usuario
     * Calcula el Score de Capacidad (S_RPG) y determina el perfil de entrenamiento
     */
    async calcularNivelUsuario(data: CreateProfileDto){
        // ========== FACTOR DE SEGURIDAD (δ_salud) ==========
        // δ = 0 si hay patologías de riesgo, δ = 1 si está sano
        const deltaSalud = data.condicionmedica ? 0 : 1;

        // ========== PUNTAJE DE EXPERIENCIA (P_exp) ==========
        // Valora la adaptación neuromuscular previa
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

        // ========== PUNTAJE DE ACTIVIDAD OMS (P_act) ==========
        // Valora el cumplimiento de mínimos de actividad física
        let pAct = 0;
        switch (data.nivelactividad) {
          case NivelActividad.SEDENTARY: pAct = 0; break;   // No cumple mínimos
          case NivelActividad.ACTIVE: pAct = 10; break;     // Cumple mínimos OMS
          case NivelActividad.SPORT: pAct = 20; break;      // Supera mínimos
        }

        // ========== DETERMINACIÓN DE COMPOSICIÓN CORPORAL (PGC) ==========
        let pgc: number;
        let metodoUtilizado: string;

        // Método B: Precisión Antropométrica (7 Pliegues) - Gold Standard
        if (this.tiene7Pliegues(data)) {
            pgc = this.calcularPGC7Pliegues(data);
            metodoUtilizado = '7 Pliegues (Gold Standard)';
        }
        // Método A alternativo: Si se proporciona PGC conocido directamente
        else if (data.knownBodyFat) {
            pgc = data.knownBodyFat;
            metodoUtilizado = 'Valor Proporcionado';
        }
        // Método A: Estimación General (Deurenberg)
        else {
            const imc = data.weight / (data.height * data.height);
            pgc = (1.20 * imc) + (0.23 * data.age) - (10.8 * data.gender) - 5.4;
            metodoUtilizado = 'Estimación Deurenberg (IMC)';
        }

        // ========== MULTIPLICADOR DE COMPOSICIÓN (μ_comp) ==========
        // Factor de ajuste basado en PGC y estado físico
        const muComp = this.getCompositionMultiplier(pgc, data.gender, data.weight, data.height);

        // ========== CÁLCULO DEL SCORE RPG (S_RPG) ==========
        // S_RPG = (P_exp + P_act) × μ_comp × δ_salud
        const sRpg = (pExp + pAct) * muComp * deltaSalud;

        // ========== CLASIFICACIÓN FINAL DEL USUARIO ==========
        let level = 'Básico';
        if (sRpg > 65) level = 'Avanzado';
        else if (sRpg >= 36) level = 'Intermedio';

        // ========== DEFINICIÓN DE PARÁMETROS DE CARGA ==========
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
          // Parámetros de entrenamiento
          frecuenciaSemanal: parametrosCarga.frecuenciaSemanal,
          rirTarget: parametrosCarga.rirTarget,
          cargaEstimada: parametrosCarga.cargaEstimada,
        };

        // Persist profile + result con relación al usuario
        const profileData: any = {
          age: data.age,
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

        // Si se proporciona userId, agregarlo a la relación
        if (data.userId) {
          profileData.userId = data.userId;
          console.log(`[ProfilingService] Vinculando perfil con usuario: ${data.userId}`);
        }

        const createdProfile = await this.profileModel.create(profileData);
        console.log(`[ProfilingService] Perfil creado con ID: ${createdProfile._id}`);

        // Si hay userId, actualizar el User con la referencia al Profile (relación bidireccional)
        if (data.userId) {
          try {
            const updatedUser = await this.userModel.findByIdAndUpdate(
              data.userId,
              { profileId: createdProfile._id },
              { new: true }
            );
            
            if (!updatedUser) {
              console.warn(`[ProfilingService] Usuario no encontrado: ${data.userId}`);
            } else {
              console.log(`[ProfilingService] Usuario actualizado con profileId: ${createdProfile._id}`);
            }
          } catch (error) {
            console.error(`[ProfilingService] Error actualizando usuario:`, error);
          }
        }

        return {
          ...result,
          profileId: createdProfile._id.toString(),
          userId: data.userId
        };
    }

    /**
     * Verifica si el usuario proporcionó los 7 pliegues cutáneos
     */
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

    /**
     * Método B: Cálculo de PGC mediante 7 Pliegues Cutáneos (Gold Standard)
     * Utiliza la ecuación de Siri y la regresión generalizada
     * 
     * Σ₇ = P_tri + P_del + P_pec + P_cin + P_glu + P_cua + P_gem
     * PGC_real = (495 / D) - 450
     */
    private calcularPGC7Pliegues(data: CreateProfileDto): number {
        // Suma de los 7 pliegues cutáneos (en mm)
        const suma7 = 
            data.pliegue_triceps! +
            data.pliegue_deltoides! +
            data.pliegue_pectoral! +
            data.pliegue_cintura! +
            data.pliegue_gluteo! +
            data.pliegue_cuadriceps! +
            data.pliegue_gastronemio!;

        // Cálculo de la densidad corporal (D) - Fórmula de Jackson & Pollock
        let densidad: number;
        const edad = data.age;
        const genero = data.gender;

        if (genero === Genero.Male) {
            // Fórmula para hombres (7 pliegues)
            densidad = 1.112 - (0.00043499 * suma7) + (0.00000055 * suma7 * suma7) - (0.00028826 * edad);
        } else {
            // Fórmula para mujeres (7 pliegues)
            densidad = 1.097 - (0.00046971 * suma7) + (0.00000056 * suma7 * suma7) - (0.00012828 * edad);
        }

        // Ecuación de Siri para calcular el porcentaje de grasa corporal
        const pgc = (495 / densidad) - 450;

        return Math.max(0, Math.min(pgc, 60)); // Limitamos entre 0% y 60%
    }

    /**
     * Multiplicador de Composición (μ_comp)
     * Factor de ajuste basado en el PGC y estado físico
     * Un porcentaje atlético mejora el puntaje (μ > 1.0)
     * La obesidad lo penaliza (μ < 1.0) por seguridad articular
     */
    private getCompositionMultiplier(pgc: number, gender: Genero, weight: number, height: number): number {
        const imc = weight / (height * height);

        // Caso Especial: Bajo Peso Crítico (Penalización por Fragilidad Muscular)
        // Si el IMC indica bajo peso, se ignora el PGC bajo y se aplica penalización
        if (imc < 18.5) return 0.90;

        if (gender === Genero.Male) {
            // Matriz de ajuste para Hombres
            if (pgc < 13) return 1.20;       // Muy Definido (+20%)
            if (pgc <= 17) return 1.10;      // Atlético (+10%)
            if (pgc <= 24) return 1.00;      // Saludable (Neutro)
            if (pgc <= 29) return 0.90;      // Sobrepeso (-10%)
            return 0.80;                     // Obesidad ≥30% (-20%)
        } else {
            // Matriz de ajuste para Mujeres
            if (pgc < 20) return 1.20;       // Muy Definido (+20%)
            if (pgc <= 24) return 1.10;      // Atlético (+10%)
            if (pgc <= 31) return 1.00;      // Saludable (Neutro)
            if (pgc <= 37) return 0.90;      // Sobrepeso (-10%)
            return 0.80;                     // Obesidad ≥38% (-20%)
        }
    }

    /**
     * Definición de Parámetros de Carga según Perfil
     * Configura la frecuencia, intensidad (RIR) y carga estimada (%1RM)
     */
    private getParametrosPorPerfil(level: string): PerfilParametros {
        switch (level) {
            case 'Básico':
                return {
                    frecuenciaSemanal: { min: 2, max: 3 },
                    rirTarget: { min: 3, max: 3 },        // 3 reps en reserva
                    cargaEstimada: { min: 70, max: 75 },  // 70-75% del 1RM
                };
            
            case 'Intermedio':
                return {
                    frecuenciaSemanal: { min: 3, max: 4 },
                    rirTarget: { min: 2, max: 2 },        // 2 reps en reserva
                    cargaEstimada: { min: 75, max: 80 },  // 75-80% del 1RM
                };
            
            case 'Avanzado':
                return {
                    frecuenciaSemanal: { min: 4, max: 5 },
                    rirTarget: { min: 0, max: 1 },        // Al fallo o muy cerca
                    cargaEstimada: { min: 85, max: 90 },  // 85-90% del 1RM
                };
            
            default:
                return {
                    frecuenciaSemanal: { min: 2, max: 3 },
                    rirTarget: { min: 3, max: 3 },
                    cargaEstimada: { min: 70, max: 75 },
                };
        }
    }

    // ========== MÉTODOS DE CONSULTA CON RELACIONES ==========

    /**
     * Obtiene un perfil por ID con el usuario asociado
     */
    async getProfileWithUser(profileId: string): Promise<any> {
        return this.profileModel
            .findById(profileId)
            .populate('userId', '-password') // Populate del usuario sin password
            .exec();
    }

    /**
     * Obtiene todos los perfiles de un nivel específico
     */
    async getProfilesByLevel(level: string): Promise<Profile[]> {
        return this.profileModel.find({ level }).exec();
    }

    /**
     * Obtiene estadísticas de perfiles
     */
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