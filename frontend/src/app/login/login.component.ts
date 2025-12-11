import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    // Login mode
    isLoginMode = true;
    
    // Login fields
    email = '';
    password = '';
    
    // Register fields
    nombre = '';
    apellido = '';
    edad: number | null = null;
    username = '';
    
    errorMessage = '';
    showPassword = false;
    isLoading = false;

    constructor(
        private authService: AuthService,
        private router: Router
    ) {
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/home']);
        }
    }

    toggleMode(): void {
        this.isLoginMode = !this.isLoginMode;
        this.errorMessage = '';
        this.clearForm();
    }

    clearForm(): void {
        this.email = '';
        this.password = '';
        this.nombre = '';
        this.apellido = '';
        this.edad = null;
        this.username = '';
    }

    onSubmit(): void {
        if (this.isLoginMode) {
            this.handleLogin();
        } else {
            this.handleRegister();
        }
    }

    handleLogin(): void {
        if (!this.email || !this.password) {
            this.errorMessage = 'Por favor, completa todos los campos';
            return;
        }

        this.isLoading = true;
        this.authService.login(this.email, this.password).subscribe({
            next: (response) => {
                this.isLoading = false;
                this.errorMessage = '';
                this.router.navigate(['/home']);
            },
            error: (error) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Error al iniciar sesión';
                this.password = '';
            }
        });
    }

    handleRegister(): void {
        if (!this.nombre || !this.apellido || !this.edad || !this.email || !this.password) {
            this.errorMessage = 'Por favor, completa todos los campos obligatorios';
            return;
        }

        if (this.password.length < 6) {
            this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
            return;
        }

        if (this.edad < 13 || this.edad > 120) {
            this.errorMessage = 'La edad debe estar entre 13 y 120 años';
            return;
        }

        const registerData = {
            nombre: this.nombre,
            apellido: this.apellido,
            edad: this.edad,
            email: this.email,
            password: this.password,
            username: this.username || undefined
        };

        this.isLoading = true;
        this.authService.register(registerData).subscribe({
            next: (response) => {
                this.isLoading = false;
                this.errorMessage = '';
                this.router.navigate(['/home']);
            },
            error: (error) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Error al registrar usuario';
            }
        });
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }
}
