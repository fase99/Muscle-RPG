import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpgExerciseRule, RpgExerciseRuleDocument } from '../exercises/schemas/rpg-exercise-rule.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { ExerciseDbService } from '../exercises/exercisedb.service';

// ========== INTERFACES DEL MODELO ==========

interface ExerciseNode {
  id: string;
  externalId: string;
  name: string;
  costoTiempo: number;       // t_j (minutos)
  costoFatiga: number;        // f_j (stamina)
  estimuloXP: number;         // g_j (XP/Hipertrofia)
  rir: number;                // Repeticiones en Reserva
  muscleTargets: {
    STR: number;
    AGI: number;
    STA: number;
    INT: number;
    DEX: number;
    END: number;
  };
  prerequisites: string[];    // IDs de ejercicios previos requeridos
  series: number;
  repeticiones: number;
}

interface GraphPath {
  nodes: ExerciseNode[];
  totalXP: number;
  totalTime: number;
  totalFatigue: number;
  muscleBalance: number;     // Balance de grupos musculares trabajados
}

interface VolumeLandmarks {
  MEV: number;  // Minimum Effective Volume (series semanales)
  MAV: number;  // Maximum Adaptive Volume
  MRV: number;  // Maximum Recoverable Volume
}

@Injectable()
export class GraphOptimizerService {
  constructor(
    @InjectModel(RpgExerciseRule.name) private exerciseRuleModel: Model<RpgExerciseRuleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private exerciseDbService: ExerciseDbService,
  ) {}

  /**
   * NIVEL 1: OPTIMIZACIÓN DE SESIÓN DIARIA (GRAFO DAG)
   * Encuentra el camino óptimo de ejercicios que maximiza XP
   * sujeto a restricciones de tiempo y Stamina
   */
  async optimizeSesionDiaria(
    userId: string,
    maxTime: number = 120,      // Límite temporal (2 horas)
    availableStamina?: number,  // Stamina disponible (se obtiene del usuario si no se proporciona)
    targetRIR: number = 2,      // RIR objetivo según perfil (3=Básico, 2=Intermedio, 0-1=Avanzado)
  ): Promise<GraphPath> {
    console.log('[GraphOptimizer] Iniciando optimización de sesión diaria...');
    
    // 1. Obtener datos del usuario y perfil
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('Usuario no encontrado');

    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) throw new Error('Perfil no encontrado. Complete el perfilamiento primero.');

    const stamina = availableStamina ?? user.staminaActual;
    
    console.log(`[GraphOptimizer] Usuario Nivel: ${user.nivel}, Stamina: ${stamina}/${user.staminaMaxima}, RIR Target: ${targetRIR}`);

    // 2. Construir el grafo de ejercicios disponibles
    const availableExercises = await this.buildExerciseGraph(user, profile, targetRIR);
    
    console.log(`[GraphOptimizer] Ejercicios disponibles: ${availableExercises.length}`);

    // 3. Resolver el problema de optimización usando Programación Dinámica
    // Este es el algoritmo de "Knapsack con múltiples restricciones"
    const optimalPath = this.findOptimalPath(
      availableExercises,
      maxTime,
      stamina,
      profile,
    );

    console.log(`[GraphOptimizer] Camino óptimo encontrado: ${optimalPath.nodes.length} ejercicios`);
    console.log(`[GraphOptimizer] XP Total: ${optimalPath.totalXP}, Tiempo: ${optimalPath.totalTime}min, Fatiga: ${optimalPath.totalFatigue}`);

    return optimalPath;
  }

  /**
   * Construye el grafo de ejercicios disponibles basado en:
   * - Nivel del usuario
   * - Ejercicios ya dominados (prerequisites cumplidos)
   * - Parámetros del perfil (RIR, carga estimada)
   */
  private async buildExerciseGraph(
    user: UserDocument,
    profile: ProfileDocument,
    targetRIR: number = 2,
  ): Promise<ExerciseNode[]> {
    // Obtener reglas de ejercicios según nivel del usuario
    const levelMap = {
      'Básico': [1, 2, 3],
      'Intermedio': [1, 2, 3, 4, 5],
      'Avanzado': [1, 2, 3, 4, 5, 6, 7, 8],
    };

    const allowedLevels = levelMap[profile.level] || [1, 2];

    const exerciseRules = await this.exerciseRuleModel
      .find({ levelRequired: { $in: allowedLevels } })
      .exec();

    console.log(`[GraphOptimizer] Encontradas ${exerciseRules.length} reglas de ejercicios para niveles ${JSON.stringify(allowedLevels)}`);

    const nodes: ExerciseNode[] = [];
    const completedExercises = new Set(user.ejerciciosCompletados);

    // Obtener todos los IDs de ejercicios para cargar nombres en batch
    const exerciseIds = exerciseRules.map(rule => rule.externalId);
    console.log(`[GraphOptimizer] Obteniendo nombres para ${exerciseIds.length} ejercicios desde ExerciseDB...`);

    for (const rule of exerciseRules) {
      // Verificar prerequisites - IGNORAR SI ESTÁ VACÍO
      const prerequisitesMet = rule.prerequisites.length === 0 || 
        rule.prerequisites.every(prereq => completedExercises.has(prereq));

      if (!prerequisitesMet) {
        console.log(`[GraphOptimizer] Ejercicio ${rule.externalId} bloqueado por prerequisites: ${rule.prerequisites.join(', ')}`);
        continue;
      }

      // Obtener nombre real del ejercicio desde data-exercises/exercises.json
      const exerciseName = await this.exerciseDbService.getExerciseName(rule.externalId);

      // Usar el RIR del perfil (pasado como parámetro)
      const series = this.getSeriesForProfile(profile);
      const repeticiones = this.getRepetitionsForHypertrophy();

      // Ajustar costos y XP según RIR y perfil
      const muRIR = this.calculateRIRMultiplier(targetRIR);
      
      // Tiempo: 2-3 minutos por serie (descanso incluido)
      const tiempoPorSerie = 2.5; // minutos
      const costoTiempo = tiempoPorSerie * series;
      
      // Fatiga: depende del RIR (más bajo = más fatiga)
      const fatigaBasePorSerie = 8; // stamina por serie
      const costoFatiga = fatigaBasePorSerie * series * muRIR;
      
      // XP: recompensa por el estímulo mecánico
      const xpBasePorSerie = 15; // XP por serie
      const estimuloXP = xpBasePorSerie * series * muRIR;
      
      const node: ExerciseNode = {
        id: rule._id.toString(),
        externalId: rule.externalId,
        name: exerciseName, // Nombre real desde exercises.json
        costoTiempo,
        costoFatiga,
        estimuloXP,
        rir: targetRIR, // Usar el RIR del perfil
        muscleTargets: rule.muscleTargets,
        prerequisites: rule.prerequisites,
        series,
        repeticiones,
      };

      nodes.push(node);
    }

    console.log(`[GraphOptimizer] Grafo construido con ${nodes.length} nodos (ejercicios disponibles)`);
    
    return nodes;
  }

  /**
   * Encuentra el camino óptimo usando Programación Dinámica (0/1 Knapsack)
   * MAXIMIZA: XP_sesion = Σ(EstímuloXP_i · μ_RIR)
   * SUJETO A:
   *   - Σ CostoTime_i ≤ T_max (120 min)
   *   - Σ CostoFatiga_i ≤ S_actual (Stamina del día)
   */
  private findOptimalPath(
    exercises: ExerciseNode[],
    maxTime: number,
    maxStamina: number,
    profile: ProfileDocument,
  ): GraphPath {
    console.log(`[GraphOptimizer] Iniciando búsqueda de camino óptimo...`);
    console.log(`[GraphOptimizer] Restricciones: Tiempo=${maxTime}min, Stamina=${maxStamina}`);
    console.log(`[GraphOptimizer] Ejercicios candidatos: ${exercises.length}`);

    if (exercises.length === 0) {
      return {
        nodes: [],
        totalXP: 0,
        totalTime: 0,
        totalFatigue: 0,
        muscleBalance: 0,
      };
    }

    // Filtrar ejercicios factibles individualmente
    const feasibleExercises = exercises.filter(ex => 
      ex.costoTiempo <= maxTime && ex.costoFatiga <= maxStamina
    );

    console.log(`[GraphOptimizer] Ejercicios factibles: ${feasibleExercises.length}`);

    if (feasibleExercises.length === 0) {
      return {
        nodes: [],
        totalXP: 0,
        totalTime: 0,
        totalFatigue: 0,
        muscleBalance: 0,
      };
    }

    // Ordenar por eficiencia (XP por unidad de costo)
    const sortedExercises = [...feasibleExercises].sort((a, b) => {
      const costA = a.costoTiempo * 0.5 + a.costoFatiga * 0.5;
      const costB = b.costoTiempo * 0.5 + b.costoFatiga * 0.5;
      const effA = a.estimuloXP / costA;
      const effB = b.estimuloXP / costB;
      return effB - effA;
    });

    // ALGORITMO GREEDY MEJORADO CON BALANCE MUSCULAR
    const selectedNodes: ExerciseNode[] = [];
    let currentTime = 0;
    let currentFatigue = 0;
    let currentXP = 0;
    const muscleWork = { STR: 0, AGI: 0, STA: 0, INT: 0, DEX: 0, END: 0 };
    
    // Usar ~75% del tiempo disponible para permitir flexibilidad
    const targetTime = maxTime * 0.75;
    const minExercises = 5;
    const maxExercises = 10;

    // Intentar agregar ejercicios mientras se pueda
    for (const exercise of sortedExercises) {
      // Verificar si ya alcanzamos el máximo de ejercicios
      if (selectedNodes.length >= maxExercises) {
        console.log(`[GraphOptimizer] Límite de ${maxExercises} ejercicios alcanzado`);
        break;
      }

      // Verificar restricciones de recursos
      if (currentTime + exercise.costoTiempo > maxTime) {
        console.log(`[GraphOptimizer] Ejercicio ${exercise.name} excede tiempo`);
        continue;
      }
      if (currentFatigue + exercise.costoFatiga > maxStamina) {
        console.log(`[GraphOptimizer] Ejercicio ${exercise.name} excede stamina`);
        continue;
      }

      // Verificar balance muscular (máximo 60% por grupo muscular)
      const wouldOverwork = this.wouldOverworkMuscleStrict(muscleWork, exercise.muscleTargets, currentXP + exercise.estimuloXP);
      if (wouldOverwork && selectedNodes.length >= minExercises) {
        console.log(`[GraphOptimizer] Ejercicio ${exercise.name} causaría desbalance muscular`);
        continue;
      }

      // AGREGAR EJERCICIO
      selectedNodes.push(exercise);
      currentTime += exercise.costoTiempo;
      currentFatigue += exercise.costoFatiga;
      currentXP += exercise.estimuloXP;

      // Actualizar trabajo muscular
      for (const [muscle, value] of Object.entries(exercise.muscleTargets)) {
        muscleWork[muscle] += value * exercise.estimuloXP;
      }

      console.log(`[GraphOptimizer] ✓ Agregado: ${exercise.name} (XP: ${exercise.estimuloXP.toFixed(1)}, Total: ${selectedNodes.length})`);

      // Parar si alcanzamos ~75% del tiempo y tenemos al menos minExercises
      if (selectedNodes.length >= minExercises && currentTime >= targetTime) {
        console.log(`[GraphOptimizer] Objetivo de tiempo (~75%) alcanzado con ${selectedNodes.length} ejercicios`);
        break;
      }
    }

    const muscleBalance = this.calculateMuscleBalance(muscleWork);

    console.log(`[GraphOptimizer] ✅ Camino óptimo: ${selectedNodes.length} ejercicios`);
    console.log(`[GraphOptimizer] XP Total: ${currentXP.toFixed(1)}, Tiempo: ${currentTime}min, Fatiga: ${currentFatigue.toFixed(1)}`);

    return {
      nodes: selectedNodes,
      totalXP: currentXP,
      totalTime: currentTime,
      totalFatigue: currentFatigue,
      muscleBalance,
    };
  }

  /**
   * Verifica si agregar un ejercicio sobreentrenarí un grupo muscular
   * Límite estricto: máximo 60% del trabajo total en un grupo muscular
   */
  private wouldOverworkMuscleStrict(
    currentWork: Record<string, number>,
    newWork: Record<string, number>,
    newTotalXP: number,
  ): boolean {
    const maxPercentage = 0.60; // 60% máximo por grupo muscular

    for (const [muscle, value] of Object.entries(newWork)) {
      if (value > 0) {
        const newMuscleWork = currentWork[muscle] + (value * newWork[muscle]);
        const percentage = newMuscleWork / newTotalXP;
        
        if (percentage > maxPercentage) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calcula el balance entre grupos musculares (0-1, donde 1 es perfecto balance)
   */
  private calculateMuscleBalance(muscleWork: Record<string, number>): number {
    const values = Object.values(muscleWork).filter(v => v > 0);
    if (values.length === 0) return 0;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Normalizar: menos desviación estándar = mejor balance
    return Math.max(0, 1 - (stdDev / avg));
  }

  /**
  /**
   * Obtiene el número de series según el perfil (nivel del usuario)
   * Básico: 3 series, Intermedio: 4 series, Avanzado: 5 series
   */
  private getSeriesForProfile(profile: ProfileDocument): number {
    switch (profile.level) {
      case 'Básico':
        return 3; // 3 series para principiantes
      case 'Intermedio':
        return 4; // 4 series para intermedios
      case 'Avanzado':
        return 5; // 5 series para avanzados
      default:
        return 3;
    }
  }

  /**
   * Rango de repeticiones para hipertrofia (8-12)
   */
  private getRepetitionsForHypertrophy(): number {
    return 10; // Valor medio del rango de hipertrofia
  }

  /**
   * Calcula el multiplicador de XP basado en el RIR
   * RIR más bajo = mayor intensidad = mayor XP y fatiga
   * Según paper: RIR 3 (Básico), RIR 2 (Intermedio), RIR 0-1 (Avanzado)
   */
  private calculateRIRMultiplier(rir: number): number {
    // RIR 0-1 (al fallo - Avanzado): 1.2x
    // RIR 2 (Intermedio): 1.0x
    // RIR 3 (Básico): 0.85x
    if (rir <= 1) return 1.2;
    if (rir === 2) return 1.0;
    if (rir === 3) return 0.85;
    return 0.7;
  }

  /**
   * NIVEL 2: CÁLCULO DE VOLUME LANDMARKS (MEV/MAV/MRV)
   * Determina los hitos de volumen según el nivel del usuario
   */
  calculateVolumeLandmarks(profile: ProfileDocument): VolumeLandmarks {
    let MEV: number, MAV: number, MRV: number;

    switch (profile.level) {
      case 'Básico':
        MEV = 10;  // 10 series semanales mínimas
        MAV = 15;  // 15 series óptimas
        MRV = 20;  // 20 series máximas recuperables
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

    // Ajustar según composición corporal (μ_comp)
    const muComp = profile.compositionMultiplier || 1.0;
    
    return {
      MEV: Math.round(MEV * muComp),
      MAV: Math.round(MAV * muComp),
      MRV: Math.round(MRV * muComp),
    };
  }
}
