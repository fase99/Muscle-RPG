import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports:[
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  // Nivel del usuario
  level = 5;
  
  // XP actual y máximo
  currentXP = 1200;
  maxXP = 2000;
  
  // Porcentaje de XP para la barra de progreso
  get xpPercentage(): number {
    return (this.currentXP / this.maxXP) * 100;
  }
  
  // URL del avatar (puedes cambiar por una imagen real)
  avatarUrl = 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairDreads01&accessoriesType=Sunglasses&hairColor=BrownDark&facialHairType=Blank&clotheType=Hoodie&clotheColor=Gray01&eyeType=Happy&eyebrowType=FlatNatural&mouthType=Default&skinColor=Pale';
}
