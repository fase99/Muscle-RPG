export interface Exercise {
  id: string;
  name: string;
  description: string;
  level: number; // 1: Principiante, 2: Intermedio, 3: Avanzado, 4: Experto
  xpReward: number;
  prerequisites?: string[]; // IDs de ejercicios que debes completar primero
  muscleGroup: MuscleGroup;
  sets: number;
  reps: string;
  restTime: number; // en segundos
  imageUrl?: string;
  unlocked: boolean;
  completed: boolean;
}

export enum MuscleGroup {
  PECHO = 'PECHO',
  ESPALDA = 'ESPALDA',
  PIERNAS = 'PIERNAS',
  HOMBROS = 'HOMBROS',
  BRAZOS = 'BRAZOS',
  CORE = 'CORE',
  CARDIO = 'CARDIO'
}

export interface MuscleGroupNode {
  group: MuscleGroup;
  name: string;
  icon: string;
  color: string;
  exercises: Exercise[];
  totalXP: number;
  completedExercises: number;
}
