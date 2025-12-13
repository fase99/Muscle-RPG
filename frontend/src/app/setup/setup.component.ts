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
      // Paso 1: Datos Personales (sin edad, ya se obtiene del usuario)
      gender: ['1', Validators.required],
      weight: ['', [Validators.required, Validators.min(30), Validators.max(300)]],
      height: ['', [Validators.required, Validators.min(100), Validators.max(250)]],
      
      // Paso 2: Historial de Entrenamiento
      experienceMonths: ['', [Validators.required, Validators.min(0)]],
      activityLevel: ['sedentary', Validators.required],
      
      // Paso 3: Condiciones de Salud
      hasMedicalConditions: [false, Validators.required],
      
      // Paso 4: Composición Corporal (opcional)
      metodoMedicion: ['estimacion'],
      knownBodyFat: [''],
      
      // 7 Pliegues Cutáneos (opcional)
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
    // Obtener el userId del usuario actual
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
    
    // Limpiar campos según el método seleccionado
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
        return true; // El checkbox siempre tiene valor (true/false)
      case 4:
        return true; // Paso 4 es opcional
      default:
        return false;
    }
  }

  onSubmit() {
    if (this.profileForm.valid) {
      const formValue = this.profileForm.value;
      
      // Adaptar datos para el DTO del Backend (CreateProfileDto)
      // La edad se obtiene del usuario autenticado en el backend
      const payload: any = {
        gender: Number(formValue.gender),
        experienceMonths: Number(formValue.experienceMonths),
        weight: Number(formValue.weight),
        height: Number(formValue.height) / 100, // Convertir cm a metros
        nivelactividad: formValue.activityLevel,
        condicionmedica: formValue.hasMedicalConditions,
        userId: this.userId // Agregar el userId para vincular el perfil al usuario
      };

      // Agregar datos opcionales según el método seleccionado
      if (formValue.metodoMedicion === 'conocido' && formValue.knownBodyFat) {
        payload.knownBodyFat = Number(formValue.knownBodyFat);
      } else if (formValue.metodoMedicion === '7pliegues') {
        // Agregar los 7 pliegues si todos están completos
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
            
            // Refrescar el usuario en el AuthService para que el perfil se muestre
            this.authService.refreshUser();
            
            // Mostrar mensaje de éxito
            if (response.rutinaSemanal) {
              console.log('✅ Rutina semanal generada automáticamente:', response.rutinaSemanal.length, 'días');
              alert(`¡Perfil creado exitosamente!\n\nSe ha generado tu rutina semanal con ${response.rutinaSemanal.length} días.\nSerás redirigido a tu rutina.`);
            } else {
              alert('¡Perfil creado exitosamente!\nSerás redirigido a tu rutina.');
            }
            
            // Redirigir a la página de rutinas después de 2 segundos
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