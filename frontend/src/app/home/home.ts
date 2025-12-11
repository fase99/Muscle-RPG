import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserFromDB } from '../services/user-http.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  user: UserFromDB | null = null;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  get userName(): string {
    return this.user?.nombre || 'Invitado';
  }

  // User Stats
  get userStats() {
    const currentXP = this.user?.experiencia || 0;
    const maxXP = this.user?.experienciaMaxima || 100;
    return {
      level: this.user?.nivel || 1,
      currentXP,
      maxXP,
      get xpPercentage() {
        return (currentXP / maxXP) * 100;
      },
      get xpToNextLevel() {
        return maxXP - currentXP;
      },
      streak: this.user?.rachasDias || 0,
      totalWorkouts: 45,
      totalMinutes: 2340,
      personalRecords: 12,
      goalsCompleted: this.user?.logrosObtenidos || 0
    };
  }

  // Today's Workout
  todayWorkout = [
    { name: 'Push-ups', sets: 3, reps: 15, completed: false },
    { name: 'Squats', sets: 4, reps: 12, completed: false },
    { name: 'Plank', sets: 3, reps: 30, completed: false },
    { name: 'Pull-ups', sets: 3, reps: 8, completed: false }
  ];

  // Recent Achievements
  recentAchievements = [
    { icon: '🏆', name: 'Week Warrior', date: '2 days ago' },
    { icon: '💪', name: 'Strength Builder', date: '5 days ago' },
    { icon: '🔥', name: 'On Fire!', date: '1 week ago' }
  ];
}
