import { Component } from '@angular/core';
import { CommonModule, DecimalPipe, UpperCasePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, DecimalPipe, UpperCasePipe],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent {
  profileForm: FormGroup;
  result: any = null; // Aquí guardamos el nivel calculado

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.profileForm = this.fb.group({
      age: ['', Validators.required],
      gender: ['1', Validators.required], // 1: Hombre, 0: Mujer
      weight: ['', Validators.required], // kg
      height: ['', Validators.required], // cm (lo convertiremos a m)
      experienceMonths: ['', Validators.required],
      activityLevel: ['sedentary', Validators.required],
      hasMedicalConditions: [false, Validators.required] // Checkbox
    });
  }

  onSubmit() {
    if (this.profileForm.valid) {
      const formValue = this.profileForm.value;
      
      // Adaptar datos para el DTO del Backend (CreateProfileDto)
      const payload = {
        age: Number(formValue.age),
        gender: Number(formValue.gender),
        experienceMonths: Number(formValue.experienceMonths),
        weight: Number(formValue.weight),
        height: Number(formValue.height) / 100, // Backend espera número, convertimos cm a m
        nivelactividad: formValue.activityLevel, // map a NivelActividad del backend
        condicionmedica: formValue.hasMedicalConditions // boolean
        // knownBodyFat: opcional
      };

      this.http.post('http://localhost:3000/users/profile', payload)
        .subscribe({
          next: (response) => {
            this.result = response;
            console.log('Tu Perfil RPG:', this.result);
          },
          error: (err) => {
            console.error('Error calculando clase:', err);
            console.error('Error details:', err.error);
            console.error('Payload sent:', payload);
          }
        });
    }
  }
}