import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})

export class Navbar {

  constructor(public authService: AuthService) { }

  level = 5;

  currentXP = 1200;
  maxXP = 2000;
  get xpPercentage(): number {
    return (this.currentXP / this.maxXP) * 100;
  }
  avatarUrl = 'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairDreads01&accessoriesType=Sunglasses&hairColor=BrownDark&facialHairType=Blank&clotheType=Hoodie&clotheColor=Gray01&eyeType=Happy&eyebrowType=FlatNatural&mouthType=Default&skinColor=Pale';
}
