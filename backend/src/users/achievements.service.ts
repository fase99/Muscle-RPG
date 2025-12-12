import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Achievement, AchievementDocument, AchievementType } from '../schemas/achievement.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';

interface AchievementDefinition {
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  condition: (user: UserDocument, profile: ProfileDocument | null) => boolean;
  xpReward: number;
}

@Injectable()
export class AchievementsService {
  private achievementDefinitions: AchievementDefinition[] = [
    // ========== LOGROS DE ENTRENAMIENTO ==========
    {
      type: AchievementType.WORKOUT_STREAKS,
      name: 'Week Warrior 🔥',
      description: 'Completa 7 días consecutivos de entrenamiento',
      icon: '🔥',
      condition: (user) => (user.rachasDias || 0) >= 7,
      xpReward: 50,
    },
    {
      type: AchievementType.TOTAL_WORKOUTS,
      name: 'Committed Athlete 💪',
      description: 'Completa 5 rutinas',
      icon: '💪',
      condition: (user) => {
        // Esta será actualizada por rutinas service
        return (user.ejerciciosCompletados?.length || 0) >= 5;
      },
      xpReward: 25,
    },

    // ========== LOGROS DE ATRIBUTOS ==========
    {
      type: AchievementType.ATTRIBUTE_MILESTONE,
      name: 'Strength Master 💎',
      description: 'Alcanza 80+ en un atributo',
      icon: '💎',
      condition: (user) => {
        const attrs = user.atributos;
        return Object.values(attrs).some((val) => val >= 80);
      },
      xpReward: 40,
    },
    {
      type: AchievementType.BALANCED_ATTRIBUTES,
      name: 'Balanced Fighter ⚖️',
      description: 'Todos tus atributos están en 70+',
      icon: '⚖️',
      condition: (user) => {
        const attrs = user.atributos;
        return Object.values(attrs).every((val) => val >= 70);
      },
      xpReward: 60,
    },

    // ========== LOGROS DE PROGRESIÓN ==========
    {
      type: AchievementType.LEVEL_MILESTONE,
      name: 'Rising Star ⭐',
      description: 'Alcanza nivel 5',
      icon: '⭐',
      condition: (user) => (user.nivel || 1) >= 5,
      xpReward: 100,
    },
    {
      type: AchievementType.XP_MILESTONE,
      name: 'Experience Seeker 📚',
      description: 'Gana 5000 XP totales',
      icon: '📚',
      condition: (user) => (user.experiencia || 0) >= 5000,
      xpReward: 30,
    },

    // ========== LOGROS DE PERFIL ==========
    {
      type: AchievementType.PROFILE_COMPLETED,
      name: 'Health Conscious 🏥',
      description: 'Completa tu perfil de salud',
      icon: '🏥',
      condition: (user, profile) => {
        return profile != null && profile.level !== undefined;
      },
      xpReward: 35,
    },
    {
      type: AchievementType.PROFILE_LEVEL_UP,
      name: 'Athletic Evolution 🚀',
      description: 'Tu nivel de perfil cambió a Intermedio o superior',
      icon: '🚀',
      condition: (user, profile) => {
        return (
          profile != null &&
          (profile.level === 'Intermedio' || profile.level === 'Avanzado')
        );
      },
      xpReward: 75,
    },

    // ========== LOGROS ESPECIALES ==========
    {
      type: AchievementType.CONSISTENCY,
      name: 'Iron Will 🛡️',
      description: 'Mantén un streak de 14 días',
      icon: '🛡️',
      condition: (user) => (user.rachasDias || 0) >= 14,
      xpReward: 150,
    },
  ];

  constructor(
    @InjectModel(Achievement.name)
    private achievementModel: Model<AchievementDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Profile.name)
    private profileModel: Model<ProfileDocument>,
  ) {}

  /**
   * Verifica y desbloquea logros para un usuario
   */
  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return [];
    }

    const profile = user.profileId
      ? await this.profileModel.findById(user.profileId)
      : null;

    const unlockedAchievements: Achievement[] = [];

    for (const definition of this.achievementDefinitions) {
      // Verificar si ya tiene el logro
      const existingAchievement = await this.achievementModel.findOne({
        userId,
        type: definition.type,
      });

      if (existingAchievement) {
        continue; // Ya tiene este logro
      }

      // Verificar condición
      if (definition.condition(user, profile)) {
        // Crear el logro
        const achievement = await this.achievementModel.create({
          userId,
          type: definition.type,
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
          xpReward: definition.xpReward,
          metadata: {
            unlockedAt: new Date(),
          },
        });

        // Actualizar usuario con XP y contar logros
        await this.userModel.findByIdAndUpdate(userId, {
          $inc: {
            experiencia: definition.xpReward,
            logrosObtenidos: 1,
          },
        });

        unlockedAchievements.push(achievement);
      }
    }

    return unlockedAchievements;
  }

  /**
   * Obtiene todos los logros de un usuario
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return this.achievementModel.find({ userId }).sort({ unlockedAt: -1 });
  }

  /**
   * Obtiene el próximo logro a desbloquear
   */
  async getNextAchievement(userId: string): Promise<Achievement | null> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return null;
    }

    const profile = user.profileId
      ? await this.profileModel.findById(user.profileId)
      : null;

    const unlockedTypes = new Set(
      (await this.achievementModel.find({ userId })).map((a) => a.type),
    );

    for (const definition of this.achievementDefinitions) {
      if (!unlockedTypes.has(definition.type)) {
        // Retornar una versión "preview" del logro sin desbloqueado
        return new this.achievementModel({
          userId,
          type: definition.type,
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
          xpReward: definition.xpReward,
          hidden: false,
        });
      }
    }

    return null;
  }

  /**
   * Incrementa contador de ejercicios completados (para logro de rutinas)
   */
  async recordWorkoutCompletion(userId: string): Promise<Achievement[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return [];
    }

    // Incrementar contador de ejercicios completados
    const completedCount = ((user as UserDocument).ejerciciosCompletados?.length || 0) + 1;

    // Si completó 5 ejercicios, desbloquear logro
    if (completedCount === 5) {
      const existingAchievement = await this.achievementModel.findOne({
        userId,
        type: AchievementType.TOTAL_WORKOUTS,
      });

      if (!existingAchievement) {
        const achievement = await this.achievementModel.create({
          userId,
          type: AchievementType.TOTAL_WORKOUTS,
          name: 'Committed Athlete 💪',
          description: 'Completa 5 rutinas',
          icon: '💪',
          xpReward: 25,
        });

        // Actualizar usuario
        await this.userModel.findByIdAndUpdate(userId, {
          $inc: {
            experiencia: 25,
            logrosObtenidos: 1,
          },
        });

        return [achievement];
      }
    }

    return [];
  }
}
