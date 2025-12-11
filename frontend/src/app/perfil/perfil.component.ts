import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { UserFromDB } from '../services/user-http.service';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './perfil.component.html',
    styleUrls: ['./perfil.component.css'],
})
export class PerfilComponent implements OnInit {
    user: UserFromDB | null = null;

    constructor(public authService: AuthService) {}

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            this.user = user;
        });
    }

    get name(): string {
        return this.user?.nombre.toUpperCase() || 'USUARIO';
    }

    get username(): string {
        return this.user?.username || this.user?.email.split('@')[0] || 'user';
    }

    get level(): number {
        return this.user?.nivel || 1;
    }

    get xpCurrent(): number {
        return this.user?.experiencia || 0;
    }

    get xpMax(): number {
        return this.user?.experienciaMaxima || 100;
    }

    get dayStreak(): number {
        return this.user?.rachasDias || 0;
    }

    get achievements(): number {
        return this.user?.logrosObtenidos || 0;
    }

    get attributes() {
        const attrs = this.user?.atributos || { STR: 50, AGI: 50, STA: 50, INT: 50, DEX: 50, END: 50 };
        return [
            { key: 'STR', value: attrs.STR, max: 100 },
            { key: 'AGI', value: attrs.AGI, max: 100 },
            { key: 'STA', value: attrs.STA, max: 100 },
            { key: 'INT', value: attrs.INT, max: 100 },
            { key: 'DEX', value: attrs.DEX, max: 100 },
            { key: 'END', value: attrs.END, max: 100 },
        ];
    }

    metrics = [
        { icon: '🏋️', label: '1RM Bench Press', subLabel: 'Last updated: 2 days ago', value: '105', unit: 'KG', trend: '+2.6% vs last month' },
        { icon: '📊', label: 'Total Volume Lifted', subLabel: 'Weekly accumulation', value: '12,450', unit: 'KG', trend: '+18% vs last week' },
        { icon: '⚡', label: 'Max Sprint Speed', subLabel: 'Treadmill data', value: '24', unit: 'KM/H', trend: 'No change' },
    ];

    get xpPercent(): number {
        return (this.xpCurrent / this.xpMax) * 100;
    }
}
