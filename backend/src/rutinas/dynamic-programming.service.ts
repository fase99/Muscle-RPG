import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { Rutina, RutinaDocument } from '../schemas/rutina.schema';

// ========== INTERFACES PARA PROGRAMACIÓN DINÁMICA ==========

interface Estado {
  volumen: number;        // V_t: Series semanales actuales
  fatiga: number;         // F_t: Fatiga sistémica (0-1)
}

interface Accion {
  tipo: 'increase' | 'maintain' | 'deload';
  delta: number;         // Cambio en volumen
}

interface DecisionNode {
  semana: number;
  estado: Estado;
  accion: Accion;
  valor: number;         // J(S_t): Valor esperado de ganancia muscular
  ganancia: number;      // Ganancia inmediata
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
  private readonly GAMMA = 0.95; // Factor de descuento (γ)
  private readonly WEEKS_PER_QUARTER = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Rutina.name) private rutinaModel: Model<RutinaDocument>,
  ) {}

  /**
   * NIVEL 2: PROGRAMACIÓN DINÁMICA PARA CICLO TRIMESTRAL
   * Resuelve la secuencia óptima de volumen semanal usando la Ecuación de Bellman
   */
  async planQuarterlyCycle(userId: string): Promise<QuarterlyCycle> {
    console.log('[DynamicProgramming] Planificando ciclo trimestral...');

    // 1. Obtener datos del usuario y perfil
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('Usuario no encontrado');

    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) throw new Error('Perfil no encontrado');

    // 2. Calcular Volume Landmarks (MEV/MAV/MRV)
    const landmarks = this.calculateVolumeLandmarks(profile);
    console.log(`[DynamicProgramming] Landmarks - MEV: ${landmarks.MEV}, MAV: ${landmarks.MAV}, MRV: ${landmarks.MRV}`);

    // 3. Estado inicial (semana 1)
    const estadoInicial: Estado = {
      volumen: landmarks.MEV, // Comenzar en el volumen mínimo efectivo
      fatiga: 0.2,            // Fatiga inicial baja (recién descansado)
    };

    // 4. Resolver usando Programación Dinámica (Ecuación de Bellman)
    const decisions = this.solveWithBellman(
      estadoInicial,
      landmarks,
      this.WEEKS_PER_QUARTER,
      profile.level,
    );

    // 5. Generar el ciclo trimestral
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

  /**
   * Resuelve el problema usando la Ecuación de Bellman:
   * J(S_t) = max_{a ∈ A} { Ganancia(S_t, a) + γ · J(S_{t+1}) }
   */
  private solveWithBellman(
    estadoInicial: Estado,
    landmarks: { MEV: number; MAV: number; MRV: number },
    weeksRemaining: number,
    userLevel: string,
  ): DecisionNode[] {
    const decisions: DecisionNode[] = [];
    let estadoActual = { ...estadoInicial };

    for (let semana = 1; semana <= weeksRemaining; semana++) {
      // Evaluar todas las acciones posibles
      const acciones = this.getPossibleActions(estadoActual, landmarks, userLevel);
      
      // Seleccionar la mejor acción (maximizar J)
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

      // Aplicar la mejor acción
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

      // Semana de descarga cada 4 semanas (obligatoria para prevenir sobreentrenamiento)
      if (semana % 4 === 0 && estadoActual.fatiga > 0.6) {
        console.log(`[DynamicProgramming] Semana ${semana}: Deload obligatorio (fatiga: ${estadoActual.fatiga.toFixed(2)})`);
        estadoActual.volumen = Math.max(landmarks.MEV, estadoActual.volumen * 0.5);
        estadoActual.fatiga = Math.max(0.2, estadoActual.fatiga * 0.4);
      }
    }

    return decisions;
  }

  /**
   * Obtiene las acciones posibles según el estado actual y el perfil del usuario
   */
  private getPossibleActions(
    estado: Estado,
    landmarks: { MEV: number; MAV: number; MRV: number },
    userLevel: string,
  ): Accion[] {
    const acciones: Accion[] = [];

    // Acción 1: AUMENTAR (Sobrecarga Progresiva)
    if (estado.volumen < landmarks.MRV && estado.fatiga < 0.75) {
      const incremento = userLevel === 'Básico' ? 1 : userLevel === 'Intermedio' ? 2 : 3;
      acciones.push({ tipo: 'increase', delta: incremento });
    }

    // Acción 2: MANTENER
    if (estado.volumen >= landmarks.MEV && estado.volumen <= landmarks.MAV) {
      acciones.push({ tipo: 'maintain', delta: 0 });
    }

    // Acción 3: DESCARGA (Deload)
    if (estado.fatiga > 0.6 || estado.volumen > landmarks.MAV) {
      acciones.push({ tipo: 'deload', delta: -Math.floor(estado.volumen * 0.4) });
    }

    return acciones;
  }

  /**
   * Aplica una acción al estado actual y devuelve el nuevo estado
   */
  private aplicarAccion(
    estado: Estado,
    accion: Accion,
    landmarks: { MEV: number; MAV: number; MRV: number },
  ): Estado {
    let nuevoVolumen = estado.volumen + accion.delta;
    
    // Limitar volumen dentro de los landmarks
    nuevoVolumen = Math.max(landmarks.MEV, Math.min(nuevoVolumen, landmarks.MRV));

    // Calcular nueva fatiga
    let nuevaFatiga = estado.fatiga;
    
    if (accion.tipo === 'increase') {
      // Aumentar fatiga proporcionalmente al aumento de volumen
      nuevaFatiga += 0.08 * (accion.delta / landmarks.MEV);
    } else if (accion.tipo === 'deload') {
      // Reducir fatiga significativamente
      nuevaFatiga *= 0.5;
    } else {
      // Mantener: fatiga se acumula levemente
      nuevaFatiga += 0.03;
    }

    // Limitar fatiga entre 0 y 1
    nuevaFatiga = Math.max(0, Math.min(1, nuevaFatiga));

    return { volumen: nuevoVolumen, fatiga: nuevaFatiga };
  }

  /**
   * Calcula la ganancia inmediata (XP/Hipertrofia) de tomar una acción
   */
  private calcularGanancia(
    estado: Estado,
    accion: Accion,
    landmarks: { MEV: number; MAV: number; MRV: number },
  ): number {
    const nuevoEstado = this.aplicarAccion(estado, accion, landmarks);
    
    // Ganancia base: proporcional al volumen
    let ganancia = nuevoEstado.volumen * 10;

    // Bonus si estamos en el rango MAV (zona óptima)
    if (nuevoEstado.volumen >= landmarks.MAV * 0.9 && nuevoEstado.volumen <= landmarks.MAV * 1.1) {
      ganancia *= 1.2; // +20% en zona óptima
    }

    // Penalización por fatiga excesiva
    if (nuevoEstado.fatiga > 0.8) {
      ganancia *= (1 - nuevoEstado.fatiga); // Reducción drástica
    }

    // Penalización por volumen insuficiente
    if (nuevoEstado.volumen < landmarks.MEV) {
      ganancia *= 0.5; // -50% si estamos por debajo del mínimo
    }

    // Deload tiene ganancia reducida pero es necesario para la recuperación
    if (accion.tipo === 'deload') {
      ganancia *= 0.3; // Solo 30% de ganancia, pero recupera fatiga
    }

    return ganancia;
  }

  /**
   * Estima el valor futuro de un estado (heurística)
   */
  private estimarValorFuturo(
    estado: Estado,
    landmarks: { MEV: number; MAV: number; MRV: number },
    weeksRemaining: number,
  ): number {
    if (weeksRemaining <= 0) return 0;

    // Valor futuro basado en el potencial de ganancia
    let valorFuturo = estado.volumen * 10 * weeksRemaining;

    // Ajustar por fatiga (alta fatiga limita el futuro)
    valorFuturo *= (1 - estado.fatiga * 0.5);

    // Ajustar por proximidad al MAV
    const distanciaMAV = Math.abs(estado.volumen - landmarks.MAV);
    const factorOptimalidad = Math.max(0, 1 - (distanciaMAV / landmarks.MAV));
    valorFuturo *= (0.8 + 0.4 * factorOptimalidad);

    return valorFuturo;
  }

  /**
   * Calcula los Volume Landmarks según el perfil
   */
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

  /**
   * Evalúa el ciclo trimestral completado y recalcula el nivel del usuario
   */
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

    // Obtener rutinas del último trimestre
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const rutinasDelCiclo = await this.rutinaModel
      .find({
        usuarioId: userId,
        createdAt: { $gte: threeMonthsAgo },
      })
      .exec();

    // Calcular adherencia
    const totalRutinas = rutinasDelCiclo.length;
    const completadas = rutinasDelCiclo.filter(r => r.vecesCompletada > 0).length;
    const adherencia = totalRutinas > 0 ? completadas / totalRutinas : 0;

    // Calcular progreso en XP
    const xpGanada = user.experiencia;

    // Determinar si el usuario debe subir de nivel
    let nivelNuevo = profile.level;
    let recomendacion = '';

    if (adherencia >= 0.8 && xpGanada > 5000) {
      // Usuario ha progresado bien
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
