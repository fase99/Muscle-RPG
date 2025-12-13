import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { Rutina, RutinaDocument } from '../schemas/rutina.schema';

interface Estado {
  volumen: number;
  fatiga: number;
}

interface Accion {
  tipo: 'increase' | 'maintain' | 'deload';
  delta: number;
}

interface DecisionNode {
  semana: number;
  estado: Estado;
  accion: Accion;
  valor: number;
  ganancia: number;
}

interface QuarterlyCycle {
  startDate: Date;
  endDate: Date;
  weeklyDecisions: DecisionNode[];
  totalXPGained: number;
  averageAdherence: number;
  finalFatigue: number;
  volumeProgression: number[];
}

@Injectable()
export class DynamicProgrammingService {
  private readonly GAMMA = 0.95;
  private readonly WEEKS_PER_QUARTER = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Rutina.name) private rutinaModel: Model<RutinaDocument>,
  ) {}

  async planQuarterlyCycle(userId: string): Promise<QuarterlyCycle> {
    console.log('[DynamicProgramming] Planificando ciclo trimestral...');

    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('Usuario no encontrado');

    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) throw new Error('Perfil no encontrado');

    const landmarks = this.calculateVolumeLandmarks(profile);
    console.log(`[DynamicProgramming] Landmarks - MEV: ${landmarks.MEV}, MAV: ${landmarks.MAV}, MRV: ${landmarks.MRV}`);

    const estadoInicial: Estado = {
      volumen: landmarks.MEV,
      fatiga: 0.2,
    };

    const decisions = this.solveWithBellman(
      estadoInicial,
      landmarks,
      this.WEEKS_PER_QUARTER,
      profile.level,
    );

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (this.WEEKS_PER_QUARTER * 7));

    const cycle: QuarterlyCycle = {
      startDate: now,
      endDate,
      weeklyDecisions: decisions,
      totalXPGained: decisions.reduce((sum, d) => sum + d.ganancia, 0),
      averageAdherence: 0.85, // Se actualizará en tiempo real
      finalFatigue: decisions[decisions.length - 1]?.estado.fatiga || 0,
      volumeProgression: decisions.map(d => d.estado.volumen),
    };

    console.log(`[DynamicProgramming] Ciclo planificado: ${decisions.length} semanas`);
    console.log(`[DynamicProgramming] XP Total Proyectado: ${cycle.totalXPGained}`);

    return cycle;
  }

  private solveWithBellman(
    estadoInicial: Estado,
    landmarks: { MEV: number; MAV: number; MRV: number },
    weeksRemaining: number,
    userLevel: string,
  ): DecisionNode[] {
    const decisions: DecisionNode[] = [];
    let estadoActual = { ...estadoInicial };

    for (let semana = 1; semana <= weeksRemaining; semana++) {
      const acciones = this.getPossibleActions(estadoActual, landmarks, userLevel);
      
      let mejorAccion: Accion | null = null;
      let mejorValor = -Infinity;
      let mejorGanancia = 0;

      for (const accion of acciones) {
        const nuevoEstado = this.aplicarAccion(estadoActual, accion, landmarks);
        const ganancia = this.calcularGanancia(estadoActual, accion, landmarks);
        const valorFuturo = this.estimarValorFuturo(nuevoEstado, landmarks, weeksRemaining - semana);
        
        const valor = ganancia + this.GAMMA * valorFuturo;

        if (valor > mejorValor) {
          mejorValor = valor;
          mejorAccion = accion;
          mejorGanancia = ganancia;
        }
      }

      if (mejorAccion) {
        estadoActual = this.aplicarAccion(estadoActual, mejorAccion, landmarks);
        
        decisions.push({
          semana,
          estado: { ...estadoActual },
          accion: mejorAccion,
          valor: mejorValor,
          ganancia: mejorGanancia,
        });
      }

      if (semana % 4 === 0 && estadoActual.fatiga > 0.6) {
        console.log(`[DynamicProgramming] Semana ${semana}: Deload obligatorio (fatiga: ${estadoActual.fatiga.toFixed(2)})`);
        estadoActual.volumen = Math.max(landmarks.MEV, estadoActual.volumen * 0.5);
        estadoActual.fatiga = Math.max(0.2, estadoActual.fatiga * 0.4);
      }
    }

    return decisions;
  }

  private getPossibleActions(
    estado: Estado,
    landmarks: { MEV: number; MAV: number; MRV: number },
    userLevel: string,
  ): Accion[] {
    const acciones: Accion[] = [];

    if (estado.volumen < landmarks.MRV && estado.fatiga < 0.75) {
      const incremento = userLevel === 'Básico' ? 1 : userLevel === 'Intermedio' ? 2 : 3;
      acciones.push({ tipo: 'increase', delta: incremento });
    }

    if (estado.volumen >= landmarks.MEV && estado.volumen <= landmarks.MAV) {
      acciones.push({ tipo: 'maintain', delta: 0 });
    }

    if (estado.fatiga > 0.6 || estado.volumen > landmarks.MAV) {
      acciones.push({ tipo: 'deload', delta: -Math.floor(estado.volumen * 0.4) });
    }

    return acciones;
  }

  private aplicarAccion(
    estado: Estado,
    accion: Accion,
    landmarks: { MEV: number; MAV: number; MRV: number },
  ): Estado {
    let nuevoVolumen = estado.volumen + accion.delta;
    nuevoVolumen = Math.max(landmarks.MEV, Math.min(nuevoVolumen, landmarks.MRV));

    let nuevaFatiga = estado.fatiga;
    
    if (accion.tipo === 'increase') {
      nuevaFatiga += 0.08 * (accion.delta / landmarks.MEV);
    } else if (accion.tipo === 'deload') {
      nuevaFatiga *= 0.5;
    } else {
      nuevaFatiga += 0.03;
    }

    nuevaFatiga = Math.max(0, Math.min(1, nuevaFatiga));

    return { volumen: nuevoVolumen, fatiga: nuevaFatiga };
  }

  private calcularGanancia(
    estado: Estado,
    accion: Accion,
    landmarks: { MEV: number; MAV: number; MRV: number },
  ): number {
    const nuevoEstado = this.aplicarAccion(estado, accion, landmarks);
    
    let ganancia = nuevoEstado.volumen * 10;

    if (nuevoEstado.volumen >= landmarks.MAV * 0.9 && nuevoEstado.volumen <= landmarks.MAV * 1.1) {
      ganancia *= 1.2;
    }

    if (nuevoEstado.fatiga > 0.8) {
      ganancia *= (1 - nuevoEstado.fatiga);
    }

    if (nuevoEstado.volumen < landmarks.MEV) {
      ganancia *= 0.5;
    }

    if (accion.tipo === 'deload') {
      ganancia *= 0.3;
    }

    return ganancia;
  }

  private estimarValorFuturo(
    estado: Estado,
    landmarks: { MEV: number; MAV: number; MRV: number },
    weeksRemaining: number,
  ): number {
    if (weeksRemaining <= 0) return 0;

    let valorFuturo = estado.volumen * 10 * weeksRemaining;

    valorFuturo *= (1 - estado.fatiga * 0.5);

    const distanciaMAV = Math.abs(estado.volumen - landmarks.MAV);
    const factorOptimalidad = Math.max(0, 1 - (distanciaMAV / landmarks.MAV));
    valorFuturo *= (0.8 + 0.4 * factorOptimalidad);

    return valorFuturo;
  }

  private calculateVolumeLandmarks(profile: ProfileDocument): {
    MEV: number;
    MAV: number;
    MRV: number;
  } {
    let MEV: number, MAV: number, MRV: number;

    switch (profile.level) {
      case 'Básico':
        MEV = 10;
        MAV = 15;
        MRV = 20;
        break;
      case 'Intermedio':
        MEV = 12;
        MAV = 18;
        MRV = 24;
        break;
      case 'Avanzado':
        MEV = 15;
        MAV = 22;
        MRV = 30;
        break;
      default:
        MEV = 10;
        MAV = 15;
        MRV = 20;
    }

    const muComp = profile.compositionMultiplier || 1.0;
    
    return {
      MEV: Math.round(MEV * muComp),
      MAV: Math.round(MAV * muComp),
      MRV: Math.round(MRV * muComp),
    };
  }

  async evaluarCicloCompleto(userId: string): Promise<{
    nivelAnterior: string;
    nivelNuevo: string;
    adherencia: number;
    progreso: string;
    recomendacion: string;
  }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('Usuario no encontrado');

    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) throw new Error('Perfil no encontrado');

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const rutinasDelCiclo = await this.rutinaModel
      .find({
        usuarioId: userId,
        createdAt: { $gte: threeMonthsAgo },
      })
      .exec();

    const totalRutinas = rutinasDelCiclo.length;
    const completadas = rutinasDelCiclo.filter(r => r.vecesCompletada > 0).length;
    const adherencia = totalRutinas > 0 ? completadas / totalRutinas : 0;

    const xpGanada = user.experiencia;

    let nivelNuevo = profile.level;
    let recomendacion = '';

    if (adherencia >= 0.8 && xpGanada > 5000) {
      if (profile.level === 'Básico') {
        nivelNuevo = 'Intermedio';
        recomendacion = 'Excelente progreso. Desbloqueando ejercicios de nivel intermedio.';
      } else if (profile.level === 'Intermedio') {
        nivelNuevo = 'Avanzado';
        recomendacion = 'Progreso sobresaliente. Acceso a rutinas avanzadas habilitado.';
      } else {
        recomendacion = 'Mantén el excelente trabajo. Continúa con tu programa avanzado.';
      }
    } else if (adherencia < 0.6) {
      recomendacion = 'Baja adherencia detectada. Considera reducir la frecuencia o ajustar objetivos.';
    } else {
      recomendacion = 'Progreso constante. Sigue así para alcanzar el siguiente nivel.';
    }

    return {
      nivelAnterior: profile.level,
      nivelNuevo,
      adherencia,
      progreso: xpGanada > 5000 ? 'Excelente' : xpGanada > 3000 ? 'Bueno' : 'Moderado',
      recomendacion,
    };
  }
}
