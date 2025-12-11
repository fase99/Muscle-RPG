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
    username = '';
    password = '';
    errorMessage = '';
    showPassword = false;

    constructor(
        private authService: AuthService,
        private router: Router
    ) {
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/home']);
        }
    }

    onSubmit(): void {
        if (!this.username || !this.password) {
            this.errorMessage = 'Por favor, completa todos los campos';
            return;
        }

        const success = this.authService.login(this.username, this.password);

        if (success) {
            this.errorMessage = '';
            this.router.navigate(['/setup']);
        } else {
            this.errorMessage = 'Usuario o contraseña incorrectos';
            this.password = ''; 
        }
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }
}
