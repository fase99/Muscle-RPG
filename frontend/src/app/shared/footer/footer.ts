import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  currentYear = new Date().getFullYear();
  
  creadores = [
    {
      nombre: 'fase99',
      rol: 'Full Stack Dev',
      github: 'https://github.com/fase99',
      linkedin: 'https://www.linkedin.com/in/felipe-silva-e/'
    },
    {
      nombre: 'Pipeemendez',
      rol: 'Frontend Dev',
      github: 'https://github.com/Pipeemendez',
      linkedin: 'https://www.linkedin.com/in/felipe-mendezr/'
    },
    {
      nombre: 'tiagomedi',
      rol: 'Backend Dev',
      github: 'https://github.com/tiagomedi',
      linkedin: 'https://www.linkedin.com/in/santiagomedinad/'
    },
    {
      nombre: 'robinnn20',
      rol: 'UI/UX Designer',
      github: 'https://github.com/robinnn20',
      linkedin: 'https://www.linkedin.com/in/robinson-garcia-83b40121a/'
    },
  ];
}
