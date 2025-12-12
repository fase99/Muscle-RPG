import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UserFromDB } from '../../services/user-http.service';

@Component({
  selector: 'app-navbar',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})

export class Navbar implements OnInit {
  user: UserFromDB | null = null;

  constructor(public authService: AuthService) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  get level(): number {
    return this.user?.nivel || 1;
  }

  get currentXP(): number {
    return this.user?.experiencia || 0;
  }

  get maxXP(): number {
    return this.user?.experienciaMaxima || 100;
  }

  get xpPercentage(): number {
    return (this.currentXP / this.maxXP) * 100;
  }
  // === NUEVOS GETTERS DE STAMINA (solo estos 3) ===
  get currentStamina(): number {
    // Cambia los nombres de los campos si en tu UserFromDB se llaman diferente
    return this.user?.staminaActual  || 0;
  }

  get maxStamina(): number {
    return this.user?.staminaMaxima  || 100;
  }

  get staminaPercentage(): number {
    return this.maxStamina > 0 ? (this.currentStamina / this.maxStamina) * 100 : 0;
  }
  avatarUrl = 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairDreads01&accessoriesType=Sunglasses&hairColor=BrownDark&facialHairType=Blank&clotheType=Hoodie&clotheColor=Gray01&eyeType=Happy&eyebrowType=FlatNatural&mouthType=Default&skinColor=Pale';
}
