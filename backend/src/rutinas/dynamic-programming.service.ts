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
  
  // Cache para memoización (Top-Down DP)
  private memoCache: Map<string, number>;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Rutina.name) private rutinaModel: Model<RutinaDocument>,
  ) {
    this.memoCache = new Map();
  }

  /**
   * NIVEL 2: PROGRAMACIÓN DINÁMICA PARA CICLO TRIMESTRAL
   * Resuelve la secuencia óptima de volumen semanal usando la Ecuación de Bellman
   */
  async planQuarterlyCycle(userId: string): Promise<QuarterlyCycle> {
    console.log('[DynamicProgramming] Planificando ciclo trimestral...');

    // Limpiar cache de memoización para nueva planificación
    this.memoCache.clear();

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
   * Resuelve el problema usando la Ecuación de Bellman con Memoización (Top-Down):
   * J(S_t) = max_{a ∈ A} { Ganancia(S_t, a) + γ · J(S_{t+1}) }
   * Función Objetivo: XP_esperada - (Fatiga^2)
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
      console.log(`[DynamicProgramming] Semana ${semana}: Vol=${estadoActual.volumen}, Fatiga=${estadoActual.fatiga.toFixed(2)}`);
      
      // Evaluar todas las acciones posibles
      const acciones = this.getPossibleActions(estadoActual, landmarks, userLevel);
      
      // Seleccionar la mejor acción usando memoización (maximizar J)
      let mejorAccion: Accion | null = null;
      let mejorValor = -Infinity;
      let mejorGanancia = 0;

      for (const accion of acciones) {
        const nuevoEstado = this.aplicarAccion(estadoActual, accion, landmarks);
        const ganancia = this.calcularGanancia(estadoActual, accion, landmarks);
        
        // Usar memoización para calcular el valor futuro
        const valorFuturo = this.bellmanValue(nuevoEstado, landmarks, weeksRemaining - semana, userLevel);
        
        // Función objetivo: Ganancia inmediata + Valor futuro descontado
        const valor = ganancia + this.GAMMA * valorFuturo;

        console.log(`  Acción ${accion.tipo}: Ganancia=${ganancia.toFixed(1)}, ValorFuturo=${valorFuturo.toFixed(1)}, Total=${valor.toFixed(1)}`);

        if (valor > mejorValor) {
          mejorValor = valor;
          mejorAccion = accion;
          mejorGanancia = ganancia;
        }
      }

      // Aplicar la mejor acción
      if (mejorAccion) {
        estadoActual = this.aplicarAccion(estadoActual, mejorAccion, landmarks);
        
        console.log(`  ✓ Mejor acción: ${mejorAccion.tipo} (delta=${mejorAccion.delta})`);
        
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
   * Función de valor de Bellman con Memoización (Top-Down DP)
   * Calcula el valor óptimo esperado desde un estado dado
   */
  private bellmanValue(
    estado: Estado,
    landmarks: { MEV: number; MAV: number; MRV: number },
    weeksRemaining: number,
    userLevel: string,
  ): number {
    // Caso base: no hay semanas restantes
    if (weeksRemaining <= 0) {
      return 0;
    }

    // Generar clave para memoización
    const key = this.generateStateKey(estado, weeksRemaining);
    
    // Verificar si ya calculamos este estado
    if (this.memoCache.has(key)) {
      return this.memoCache.get(key)!;
    }

    // Obtener acciones posibles
    const acciones = this.getPossibleActions(estado, landmarks, userLevel);
    
    let maxValor = -Infinity;

    // Evaluar cada acción
    for (const accion of acciones) {
      const nuevoEstado = this.aplicarAccion(estado, accion, landmarks);
      const ganancia = this.calcularGanancia(estado, accion, landmarks);
      
      // Recursión con memoización
      const valorFuturo = this.bellmanValue(nuevoEstado, landmarks, weeksRemaining - 1, userLevel);
      
      const valor = ganancia + this.GAMMA * valorFuturo;
      
      if (valor > maxValor) {
        maxValor = valor;
      }
    }

    // Guardar en cache
    this.memoCache.set(key, maxValor);
    
    return maxValor;
  }

  /**
   * Genera una clave única para el estado (para memoización)
   */
  private generateStateKey(estado: Estado, weeksRemaining: number): string {
    // Discretizar volumen y fatiga para reducir espacio de estados
    const volDiscrete = Math.round(estado.volumen);
    const fatigaDiscrete = Math.round(estado.fatiga * 10) / 10; // 1 decimal
    
    return `v${volDiscrete}_f${fatigaDiscrete}_w${weeksRemaining}`;
  }

  /**
   * Obtiene las acciones posibles según el estado actual y el perfil del usuario
   * SOBRECARGA: Aumentar volumen 10%
   * MANTENER: Mantener volumen actual
   * DESCARGA: Reducir a MEV
   */
  private getPossibleActions(
    estado: Estado,
    landmarks: { MEV: number; MAV: number; MRV: number },
    userLevel: string,
  ): Accion[] {
    const acciones: Accion[] = [];

    // Acción 1: SOBRECARGA (Aumentar 10%)
    // Solo permitir si no estamos en MRV y la fatiga es manejable
    const volumenMaxPermitido = userLevel === 'Básico' ? landmarks.MAV : landmarks.MRV;
    
    if (estado.volumen < volumenMaxPermitido && estado.fatiga < 0.75) {
      const incremento = Math.round(estado.volumen * 0.10); // +10%
      acciones.push({ tipo: 'increase', delta: Math.max(1, incremento) });
    }

    // Acción 2: MANTENER
    // Siempre disponible si estamos dentro de rangos razonables
    if (estado.volumen >= landmarks.MEV && estado.volumen <= volumenMaxPermitido) {
      acciones.push({ tipo: 'maintain', delta: 0 });
    }

    // Acción 3: DESCARGA (Reducir a MEV)
    // Necesaria cuando fatiga es alta o volumen excede MAV
    if (estado.fatiga > 0.6 || estado.volumen > landmarks.MAV) {
      const deltaDescarga = landmarks.MEV - estado.volumen;
      acciones.push({ tipo: 'deload', delta: deltaDescarga });
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
   * Función Objetivo: XP_esperada - (Fatiga^2)
   */
  private calcularGanancia(
    estado: Estado,
    accion: Accion,
    landmarks: { MEV: number; MAV: number; MRV: number },
  ): number {
    const nuevoEstado = this.aplicarAccion(estado, accion, landmarks);
    
    // XP_esperada: proporcional al volumen
    let xpEsperada = nuevoEstado.volumen * 10;

    // Bonus si estamos en el rango MAV (zona óptima)
    if (nuevoEstado.volumen >= landmarks.MAV * 0.9 && nuevoEstado.volumen <= landmarks.MAV * 1.1) {
      xpEsperada *= 1.2; // +20% en zona óptima
    }

    // Bonus adicional si estamos cerca de MRV (pero no demasiado)
    if (nuevoEstado.volumen >= landmarks.MRV * 0.85 && nuevoEstado.volumen <= landmarks.MRV * 0.95) {
      xpEsperada *= 1.1; // +10% cerca de MRV
    }

    // Penalización por volumen insuficiente
    if (nuevoEstado.volumen < landmarks.MEV) {
      xpEsperada *= 0.5; // -50% si estamos por debajo del mínimo
    }

    // FUNCIÓN OBJETIVO: XP_esperada - (Fatiga^2)
    // Penalización cuadrática por fatiga (crece rápidamente)
    const penalizacionFatiga = Math.pow(nuevoEstado.fatiga, 2) * 100; // Escalar para equilibrar con XP
    
    const ganancia = xpEsperada - penalizacionFatiga;

    // Deload tiene ganancia reducida pero es necesario para la recuperación
    if (accion.tipo === 'deload') {
      // La reducción de fatiga es valiosa a largo plazo
      const valorRecuperacion = (estado.fatiga - nuevoEstado.fatiga) * 50;
      return ganancia * 0.3 + valorRecuperacion; // Valorar la recuperación
    }

    return ganancia;
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
