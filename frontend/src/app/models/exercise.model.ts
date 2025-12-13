export interface Exercise {
  id: string;
  name: string;
  description: string;
  level: number; 
  xpReward: number;
  prerequisites?: string[]; 
  muscleGroup: MuscleGroup;
  sets: number;
  reps: string;
  restTime: number; 
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
