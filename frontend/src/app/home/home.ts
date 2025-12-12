import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserFromDB, UserHttpService } from '../services/user-http.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  user: UserFromDB | null = null;
  nextAchievement: any = null;

  constructor(
    public authService: AuthService,
    private userHttpService: UserHttpService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadNextAchievement(user._id);
      }
    });
  }

  loadNextAchievement(userId: string) {
    this.userHttpService.getNextAchievement(userId).subscribe({
      next: (achievement) => {
        this.nextAchievement = achievement;
      },
      error: (err) => {
        console.error('Error loading next achievement:', err);
        this.nextAchievement = null;
      }
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
      goalsCompleted: this.user?.logrosObtenidos || 0
    };
  }

  // Profile Info
  get profileInfo() {
    const attrs = this.user?.atributos || { STR: 50, AGI: 50, STA: 50, INT: 50, DEX: 50, END: 50 };
    const sorted = Object.entries(attrs)
      .map(([key, value]) => ({ key, value: value as number }))
      .sort((a, b) => b.value - a.value);
    
    return {
      profileLevel: this.user?.profileId?.level || 'SIN ASIGNAR',
      age: this.user?.edad || '-',
      topAttributes: sorted.slice(0, 3),
      allAttributes: attrs
    };
  }

  // Week Activity
  get weekActivity() {
    // Estimado basado en streak
    const daysThisWeek = Math.min(this.user?.rachasDias || 0, 7);
    const percentage = (daysThisWeek / 7) * 100;
    return {
      daysActive: daysThisWeek,
      totalDays: 7,
      percentage
    };
  }
}
