import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, UpperCasePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, DecimalPipe, UpperCasePipe, RouterModule],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent implements OnInit {
  profileForm: FormGroup;
  result: any = null;
  currentStep: number = 1;
  totalSteps: number = 4;
  usarMetodo7Pliegues: boolean = false;
  userId: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      gender: ['1', Validators.required],
      weight: ['', [Validators.required, Validators.min(30), Validators.max(300)]],
      height: ['', [Validators.required, Validators.min(100), Validators.max(250)]],
      
      experienceMonths: ['', [Validators.required, Validators.min(0)]],
      activityLevel: ['sedentary', Validators.required],
      
      hasMedicalConditions: [false, Validators.required],
      
      metodoMedicion: ['estimacion'],
      knownBodyFat: [''],
      
      pliegue_triceps: [''],
      pliegue_deltoides: [''],
      pliegue_pectoral: [''],
      pliegue_cintura: [''],
      pliegue_gluteo: [''],
      pliegue_cuadriceps: [''],
      pliegue_gastronemio: ['']
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userId = user._id;
      }
    });
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onMetodoChange(event: any) {
    const metodo = event.target.value;
    this.usarMetodo7Pliegues = (metodo === '7pliegues');
    
    if (metodo === 'estimacion') {
      this.profileForm.patchValue({
        knownBodyFat: '',
        pliegue_triceps: '',
        pliegue_deltoides: '',
        pliegue_pectoral: '',
        pliegue_cintura: '',
        pliegue_gluteo: '',
        pliegue_cuadriceps: '',
        pliegue_gastronemio: ''
      });
    } else if (metodo === 'conocido') {
      this.profileForm.patchValue({
        pliegue_triceps: '',
        pliegue_deltoides: '',
        pliegue_pectoral: '',
        pliegue_cintura: '',
        pliegue_gluteo: '',
        pliegue_cuadriceps: '',
        pliegue_gastronemio: ''
      });
    } else if (metodo === '7pliegues') {
      this.profileForm.patchValue({
        knownBodyFat: ''
      });
    }
  }

  canProceedToNextStep(): boolean {
    const formValue = this.profileForm.value;
    
    switch (this.currentStep) {
      case 1:
        return !!(formValue.gender !== null && formValue.weight && formValue.height);
      case 2:
        return formValue.experienceMonths !== '' && formValue.activityLevel;
      case 3:
        return true; 
      case 4:
        return true; 
      default:
        return false;
    }
  }

  onSubmit() {
    if (this.profileForm.valid) {
      const formValue = this.profileForm.value;
      
      const payload: any = {
        gender: Number(formValue.gender),
        experienceMonths: Number(formValue.experienceMonths),
        weight: Number(formValue.weight),
        height: Number(formValue.height) / 100, 
        nivelactividad: formValue.activityLevel,
        condicionmedica: formValue.hasMedicalConditions,
        userId: this.userId 
      };

      if (formValue.metodoMedicion === 'conocido' && formValue.knownBodyFat) {
        payload.knownBodyFat = Number(formValue.knownBodyFat);
      } else if (formValue.metodoMedicion === '7pliegues') {
        if (formValue.pliegue_triceps && formValue.pliegue_deltoides && 
            formValue.pliegue_pectoral && formValue.pliegue_cintura &&
            formValue.pliegue_gluteo && formValue.pliegue_cuadriceps && 
            formValue.pliegue_gastronemio) {
          payload.pliegue_triceps = Number(formValue.pliegue_triceps);
          payload.pliegue_deltoides = Number(formValue.pliegue_deltoides);
          payload.pliegue_pectoral = Number(formValue.pliegue_pectoral);
          payload.pliegue_cintura = Number(formValue.pliegue_cintura);
          payload.pliegue_gluteo = Number(formValue.pliegue_gluteo);
          payload.pliegue_cuadriceps = Number(formValue.pliegue_cuadriceps);
          payload.pliegue_gastronemio = Number(formValue.pliegue_gastronemio);
        }
      }

      console.log('Enviando payload:', payload);

      this.http.post('http://localhost:3000/users/profile', payload)
        .subscribe({
          next: (response: any) => {
            this.result = response;
            console.log('Tu Perfil RPG:', this.result);
            
            this.authService.refreshUser();
            
            if (response.rutinaSemanal) {
              console.log('✅ Rutina semanal generada automáticamente:', response.rutinaSemanal.length, 'días');
              alert(`¡Perfil creado exitosamente!\n\nSe ha generado tu rutina semanal con ${response.rutinaSemanal.length} días.\nSerás redirigido a tu rutina.`);
            } else {
              alert('¡Perfil creado exitosamente!\nSerás redirigido a tu rutina.');
            }
            
            setTimeout(() => {
              this.router.navigate(['/rutina']);
            }, 2000);
          },
          error: (err) => {
            console.error('Error calculando clase:', err);
            console.error('Error details:', err.error);
            console.error('Payload sent:', payload);
            alert('Error al calcular tu perfil. Por favor, verifica los datos ingresados.');
          }
        });
    } else {
      alert('Por favor, completa todos los campos requeridos.');
    }
  }
}