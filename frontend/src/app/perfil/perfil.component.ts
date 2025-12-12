import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { UserFromDB, UserHttpService } from '../services/user-http.service';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './perfil.component.html',
    styleUrls: ['./perfil.component.css'],
})
export class PerfilComponent implements OnInit {
    user: UserFromDB | null = null;
    userStats: any = null;
    loading = true;

    constructor(
        public authService: AuthService,
        private userHttpService: UserHttpService
    ) {}

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            this.user = user;
            if (user?._id) {
                this.loadUserStats(user._id);
            }
        });
    }

    loadUserStats(userId: string) {
        this.loading = true;
        this.userHttpService.getUserStats(userId).subscribe({
            next: (stats) => {
                this.userStats = stats;
                this.loading = false;
                console.log('Estadísticas del usuario:', stats);
            },
            error: (error) => {
                console.error('Error al cargar estadísticas:', error);
                this.loading = false;
            }
        });
    }

    get name(): string {
        return this.userStats?.personalData?.nombre?.toUpperCase() || 
               this.user?.nombre?.toUpperCase() || 'USUARIO';
    }

    get username(): string {
        return this.user?.username || 
               this.userStats?.personalData?.email?.split('@')[0] || 
               this.user?.email?.split('@')[0] || 'user';
    }

    get level(): number {
        return this.userStats?.personalData?.nivel || this.user?.nivel || 1;
    }

    get profileLevel(): string {
        return this.userStats?.profileData?.level || 
               (this.user?.profileId as any)?.level || 
               'SIN ASIGNAR';
    }

    get xpCurrent(): number {
        return this.userStats?.personalData?.experiencia || this.user?.experiencia || 0;
    }

    get xpMax(): number {
        return this.userStats?.personalData?.experienciaMaxima || this.user?.experienciaMaxima || 100;
    }

    get dayStreak(): number {
        return this.userStats?.rutinasStats?.diasEntrenamiento || 
               this.user?.rachasDias || 0;
    }

    get achievements(): number {
        return this.userStats?.rutinasStats?.rutinasCompletadas || 
               this.user?.logrosObtenidos || 0;
    }

    get attributes() {
        const attrs = this.userStats?.atributos || 
                      this.user?.atributos || 
                      { STR: 50, AGI: 50, STA: 50, INT: 50, DEX: 50, END: 50 };
        return [
            { key: 'STR', value: attrs.STR, max: 100 },
            { key: 'AGI', value: attrs.AGI, max: 100 },
            { key: 'STA', value: attrs.STA, max: 100 },
            { key: 'INT', value: attrs.INT, max: 100 },
            { key: 'DEX', value: attrs.DEX, max: 100 },
            { key: 'END', value: attrs.END, max: 100 },
        ];
    }

    get atributosAnalisis() {
        return this.userStats?.atributosAnalisis || {
            perfil: 'BALANCED',
            descripcion: 'Completa algunas rutinas para ver tu análisis de atributos.',
            atributoDestacado: 'STR',
            valorDestacado: 50,
            promedio: 50,
        };
    }

    get metrics() {
        if (this.userStats?.metricas && this.userStats.metricas.length > 0) {
            return this.userStats.metricas;
        }
        // Métricas por defecto si el usuario no tiene ninguna
        return [
            { 
                icon: '🏋️', 
                label: 'Rutinas Completadas', 
                subLabel: 'Total de sesiones', 
                value: '0', 
                unit: 'sesiones', 
                trend: 'Sin datos' 
            },
            { 
                icon: '📊', 
                label: 'Ejercicios Realizados', 
                subLabel: 'Ejercicios completados', 
                value: '0', 
                unit: 'ejercicios', 
                trend: 'Comienza a entrenar' 
            },
            { 
                icon: '⚡', 
                label: 'XP Total', 
                subLabel: 'Puntos de experiencia', 
                value: '0', 
                unit: 'XP', 
                trend: 'Nivel 1' 
            },
        ];
    }

    get xpPercent(): number {
        return (this.xpCurrent / this.xpMax) * 100;
    }

    get profileData() {
        return this.userStats?.profileData;
    }
}
