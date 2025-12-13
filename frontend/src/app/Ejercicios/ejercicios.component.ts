import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MuscleGroup, MuscleGroupNode, Exercise } from '../models/exercise.model';
import { EXERCISE_TREE } from './exercise-data';
import { AuthService } from '../auth/auth.service';
import { UserFromDB } from '../services/user-http.service';

@Component({
  selector: 'app-ejercicios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ejercicios.component.html',
  styleUrl: './ejercicios.component.css'
})
export class EjerciciosComponent implements OnInit {
  protected muscleGroups = signal<MuscleGroupNode[]>([]);
  protected selectedGroup = signal<MuscleGroupNode | null>(null);
  protected selectedExercise = signal<Exercise | null>(null);
  user: UserFromDB | null = null;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
    this.loadMuscleGroups();
  }

  get userName(): string {
    return this.user?.nombre || 'Invitado';
  }

  get userLevel(): number {
    return this.user?.nivel || 1;
  }

  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private loadMuscleGroups() {
    const groupsMap = new Map<MuscleGroup, MuscleGroupNode>();

    const groupConfig: Record<MuscleGroup, { name: string; icon: string; color: string }> = {
      [MuscleGroup.PECHO]: { name: 'Pecho', icon: '💪', color: '#e74c3c' },
      [MuscleGroup.ESPALDA]: { name: 'Espalda', icon: '🦾', color: '#3498db' },
      [MuscleGroup.PIERNAS]: { name: 'Piernas', icon: '🦵', color: '#2ecc71' },
      [MuscleGroup.HOMBROS]: { name: 'Hombros', icon: '🏋️', color: '#f39c12' },
      [MuscleGroup.BRAZOS]: { name: 'Brazos', icon: '💪', color: '#9b59b6' },
      [MuscleGroup.CORE]: { name: 'Core', icon: '🎯', color: '#e67e22' },
      [MuscleGroup.CARDIO]: { name: 'Cardio', icon: '❤️', color: '#e91e63' }
    };

    EXERCISE_TREE.forEach(exercise => {
      if (!groupsMap.has(exercise.muscleGroup)) {
        const config = groupConfig[exercise.muscleGroup];
        groupsMap.set(exercise.muscleGroup, {
          group: exercise.muscleGroup,
          name: config.name,
          icon: config.icon,
          color: config.color,
          exercises: [],
          totalXP: 0,
          completedExercises: 0
        });
      }

      const group = groupsMap.get(exercise.muscleGroup)!;
      group.exercises.push(exercise);
      group.totalXP += exercise.xpReward;
      if (exercise.completed) {
        group.completedExercises++;
      }
    });

    this.muscleGroups.set(Array.from(groupsMap.values()));
  }

  selectGroup(group: MuscleGroupNode) {
    this.selectedGroup.set(group);
    this.selectedExercise.set(null);
  }

  selectExercise(exercise: Exercise, group: MuscleGroupNode) {
    if (exercise.unlocked) {
      this.selectedGroup.set(group);
      this.selectedExercise.set(exercise);
    }
  }

  completeExercise(exercise: Exercise) {
    exercise.completed = true;
    
    EXERCISE_TREE.forEach(ex => {
      if (ex.prerequisites?.includes(exercise.id)) {
        const allPrerequisitesMet = ex.prerequisites.every(prereqId => {
          const prereq = EXERCISE_TREE.find(e => e.id === prereqId);
          return prereq?.completed;
        });
        if (allPrerequisitesMet) {
          ex.unlocked = true;
        }
      }
    });

    this.loadMuscleGroups();
  }

  backToTree() {
    this.selectedExercise.set(null);
    this.selectedGroup.set(null);
  }

  getExerciseLevel(level: number): string {
    const levels = ['', 'Principiante', 'Intermedio', 'Avanzado', 'Experto'];
    return levels[level] || '';
  }

  isExerciseUnlockable(exercise: Exercise): boolean {
    if (!exercise.prerequisites || exercise.prerequisites.length === 0) {
      return true;
    }
    return exercise.prerequisites.every(prereqId => {
      const prereq = EXERCISE_TREE.find(e => e.id === prereqId);
      return prereq?.completed;
    });
  }
}
