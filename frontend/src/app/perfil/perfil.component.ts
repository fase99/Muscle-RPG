import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './perfil.component.html',
    styleUrls: ['./perfil.component.css'],
})
export class PerfilComponent {
    name = 'IRON WARRIOR';
    clazz = 'VANGUARD';
    level = 42;
    xpCurrent = 3450;
    xpMax = 5000;
    dayStreak = 14;
    achievements = 8;

    attributes = [
        { key: 'STR', value: 92, max: 100 },
        { key: 'AGI', value: 65, max: 100 },
        { key: 'STA', value: 78, max: 100 },
        { key: 'INT', value: 45, max: 100 },
        { key: 'DEX', value: 63, max: 100 },
        { key: 'END', value: 88, max: 100 },
    ];

    metrics = [
        { icon: '🏋️', label: '1RM Bench Press', subLabel: 'Last updated: 2 days ago', value: '105', unit: 'KG', trend: '+2.6% vs last month' },
        { icon: '📊', label: 'Total Volume Lifted', subLabel: 'Weekly accumulation', value: '12,450', unit: 'KG', trend: '+18% vs last week' },
        { icon: '⚡', label: 'Max Sprint Speed', subLabel: 'Treadmill data', value: '24', unit: 'KM/H', trend: 'No change' },
    ];

    get xpPercent(): number {
        return (this.xpCurrent / this.xpMax) * 100;
    }
}
