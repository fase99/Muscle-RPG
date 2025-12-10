import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  // User Stats
  userStats = {
    level: 5,
    currentXP: 1200,
    maxXP: 2000,
    get xpPercentage() {
      return (this.currentXP / this.maxXP) * 100;
    },
    get xpToNextLevel() {
      return this.maxXP - this.currentXP;
    },
    streak: 7,
    totalWorkouts: 45,
    totalMinutes: 2340,
    personalRecords: 12,
    goalsCompleted: 8
  };

  // Today's Workout
  todayWorkout = [
    { name: 'Push-ups', sets: 3, reps: 15, completed: true },
    { name: 'Squats', sets: 4, reps: 12, completed: true },
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
