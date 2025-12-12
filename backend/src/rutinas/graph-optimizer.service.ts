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
  prerequisites?: string[];    // IDs de ejercicios previos requeridos (opcional)
  series: number;
  repeticiones: number;
  targetMuscles?: string[];   // Músculos objetivo reales (del JSON)
  bodyParts?: string[];       // Partes del cuerpo (del JSON)
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
    targetMuscleGroups?: string[], // Grupos musculares a trabajar en esta sesión (ej: ['chest', 'triceps'])
  ): Promise<GraphPath> {
    console.log('[GraphOptimizer] Iniciando optimización de sesión diaria...');
    
    // 1. Obtener datos del usuario y perfil
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('Usuario no encontrado');

    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) throw new Error('Perfil no encontrado. Complete el perfilamiento primero.');

    const stamina = availableStamina ?? user.staminaActual;
    
    console.log(`[GraphOptimizer] Usuario Nivel: ${user.nivel}, Stamina: ${stamina}/${user.staminaMaxima}, RIR Target: ${targetRIR}`);
    if (targetMuscleGroups && targetMuscleGroups.length > 0) {
      console.log(`[GraphOptimizer] Grupos musculares objetivo: ${targetMuscleGroups.join(', ')}`);
    }

    // 2. Construir el grafo de ejercicios disponibles
    const availableExercises = await this.buildExerciseGraph(user, profile, targetRIR, targetMuscleGroups);
    
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
   * - Grupos musculares objetivo (obligatorio para rutinas semanales)
   */
  private async buildExerciseGraph(
    user: UserDocument,
    profile: ProfileDocument,
    targetRIR: number = 2,
    targetMuscleGroups?: string[],
  ): Promise<ExerciseNode[]> {
    console.log(`[GraphOptimizer] Construyendo grafo de ejercicios...`);
    
    // Si hay grupos musculares objetivo, obtener ejercicios directamente desde ExerciseDB
    if (targetMuscleGroups && targetMuscleGroups.length > 0) {
      return this.buildGraphFromExerciseDb(user, profile, targetRIR, targetMuscleGroups);
    }
    
    // Fallback: usar reglas de la BD (para rutinas diarias sin split)
    return this.buildGraphFromRules(user, profile, targetRIR);
  }

  /**
   * Construye el grafo usando ejercicios reales de data-exercises/exercises.json
   * filtrados por grupo muscular
   */
  private async buildGraphFromExerciseDb(
    user: UserDocument,
    profile: ProfileDocument,
    targetRIR: number,
    targetMuscleGroups: string[],
  ): Promise<ExerciseNode[]> {
    console.log(`[GraphOptimizer] Obteniendo ejercicios desde ExerciseDB para grupos: ${targetMuscleGroups.join(', ')}`);
    
    const nodes: ExerciseNode[] = [];
    
    // Obtener ejercicios por cada grupo muscular
    for (const muscleGroup of targetMuscleGroups) {
      const exercises = await this.exerciseDbService.getExercisesByMuscleGroup(muscleGroup);
      console.log(`[GraphOptimizer] Encontrados ${exercises.length} ejercicios para ${muscleGroup}`);
      
      // Limitar a los primeros 30 ejercicios por grupo (para evitar demasiados)
      const limitedExercises = exercises.slice(0, 30);
      
      for (const exercise of limitedExercises) {
        const series = this.getSeriesForProfile(profile);
        const repeticiones = this.getRepetitionsForHypertrophy();
        const muRIR = this.calculateRIRMultiplier(targetRIR);
        
        // Tiempo: ~2 minutos por serie (incluye ejecución + descanso)
        const tiempoPorSerie = 2.0;
        const costoTiempo = tiempoPorSerie * series;
        
        // Fatiga: 5 puntos base por serie (ajustado para permitir más ejercicios)
        // Con 100 de stamina y 4 series: 5*4 = 20 por ejercicio → ~5 ejercicios
        const fatigaBasePorSerie = 5;
        const costoFatiga = fatigaBasePorSerie * series * muRIR;
        
        // XP: 15 puntos base por serie
        const xpBasePorSerie = 15;
        const estimuloXP = xpBasePorSerie * series * muRIR;
        
        // Mapear grupo muscular a atributos RPG para balance
        const muscleTargets = this.mapMuscleGroupToRPG(muscleGroup);
        
        const node: ExerciseNode = {
          id: exercise.exerciseId,
          externalId: exercise.exerciseId,
          name: exercise.name,
          costoTiempo,
          costoFatiga,
          estimuloXP,
          muscleTargets,
          series,
          repeticiones,
          rir: targetRIR,
          targetMuscles: exercise.targetMuscles,
          bodyParts: exercise.bodyParts,
        };
        
        nodes.push(node);
      }
    }
    
    console.log(`[GraphOptimizer] Grafo construido con ${nodes.length} ejercicios reales desde ExerciseDB`);
    return nodes;
  }

  /**
   * Mapea un grupo muscular a atributos RPG para el balance
   */
  private mapMuscleGroupToRPG(muscleGroup: string): { STR: number; AGI: number; STA: number; INT: number; DEX: number; END: number } {
    const baseAttributes = { STR: 0, AGI: 0, STA: 0, INT: 0, DEX: 0, END: 0 };
    
    const mapping: Record<string, Partial<typeof baseAttributes>> = {
      chest: { STR: 0.7, END: 0.3 },
      back: { STR: 0.7, END: 0.3 },
      shoulders: { STR: 0.6, DEX: 0.4 },
      triceps: { STR: 0.7, DEX: 0.3 },
      biceps: { STR: 0.7, DEX: 0.3 },
      legs: { STR: 0.6, STA: 0.4 },
      core: { STA: 0.6, END: 0.4 },
    };
    
    const groupMapping = mapping[muscleGroup.toLowerCase()] || { STR: 0.5, END: 0.5 };
    
    return { ...baseAttributes, ...groupMapping };
  }

  /**
   * Construye el grafo usando las reglas de la base de datos (método original)
   */
  private async buildGraphFromRules(
    user: UserDocument,
    profile: ProfileDocument,
    targetRIR: number,
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
      
      // Tiempo: ~2 minutos por serie (ejecución + descanso incluido)
      const tiempoPorSerie = 2.0; // minutos
      const costoTiempo = tiempoPorSerie * series;
      
      // Fatiga: 5 puntos base por serie (ajustado para rutinas más completas)
      const fatigaBasePorSerie = 5; // stamina por serie
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

    console.log(`[GraphOptimizer] Grafo construido con ${nodes.length} nodos (ejercicios disponibles desde BD)`);
    
    return nodes;
  }

  /**
   * Encuentra el camino óptimo usando Algoritmo Greedy sobre Grafo Dirigido
   * MAXIMIZA: XP_sesion = Σ(EstímuloXP_i · μ_RIR)
   * SUJETO A:
   *   - Σ CostoTime_i ≤ T_max (120 min)
   *   - Σ CostoFatiga_i ≤ S_actual (Stamina del día)
   *   - Máximo 40% de ejercicios del mismo muscleGroup (restricción de balance)
   */
  private findOptimalPath(
    exercises: ExerciseNode[],
    maxTime: number,
    maxStamina: number,
    profile: ProfileDocument,
  ): GraphPath {
    console.log(`[GraphOptimizer] Iniciando búsqueda de camino óptimo (Graph Greedy Algorithm)...`);
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

    // ALGORITMO GREEDY: Ordenar por relación XP / (Time + Fatigue)
    // Esta es la métrica de eficiencia que maximiza el retorno por recurso invertido
    const sortedExercises = [...feasibleExercises].sort((a, b) => {
      // Calcular ratio: XP / (Tiempo + Fatiga)
      // Normalizamos fatiga dividiéndola por 10 para equiparar con minutos
      const ratioA = a.estimuloXP / (a.costoTiempo + a.costoFatiga / 10);
      const ratioB = b.estimuloXP / (b.costoTiempo + b.costoFatiga / 10);
      
      return ratioB - ratioA; // Orden descendente (mejor primero)
    });

    console.log(`[GraphOptimizer] Top 3 ejercicios por ratio XP/(Time+Fatigue):`);
    sortedExercises.slice(0, 3).forEach((ex, i) => {
      const ratio = ex.estimuloXP / (ex.costoTiempo + ex.costoFatiga / 10);
      console.log(`  ${i+1}. ${ex.name}: ${ratio.toFixed(2)}`);
    });

    // SELECCIÓN GREEDY CON RESTRICCIÓN DE BALANCE MUSCULAR
    const selectedNodes: ExerciseNode[] = [];
    const selectedExerciseIds = new Set<string>(); // Para evitar duplicados (grafo DAG)
    let currentTime = 0;
    let currentFatigue = 0;
    let currentXP = 0;
    
    // Contador de grupos musculares trabajados
    const muscleGroupCount = new Map<string, number>();
    const MAX_MUSCLE_GROUP_PERCENTAGE = 0.40; // 40% máximo por grupo muscular

    // Intentar agregar ejercicios mientras se pueda (recorrido de grafo sin repetir nodos)
    for (const exercise of sortedExercises) {
      // VERIFICACIÓN DE GRAFO: No repetir ejercicios (cada nodo solo se visita una vez)
      if (selectedExerciseIds.has(exercise.externalId || exercise.id)) {
        console.log(`[GraphOptimizer] Ejercicio ${exercise.name} ya seleccionado (nodo visitado)`);
        continue;
      }

      // Verificar restricciones duras
      if (currentTime + exercise.costoTiempo > maxTime) {
        continue; // Excede límite de tiempo
      }
      if (currentFatigue + exercise.costoFatiga > maxStamina) {
        continue; // Excede límite de stamina
      }

      // Determinar grupo muscular principal del ejercicio
      const primaryMuscleGroup = this.getPrimaryMuscleGroup(exercise);
      
      // Verificar restricción de balance: no más del 40% del mismo grupo
      const currentCount = muscleGroupCount.get(primaryMuscleGroup) || 0;
      const newCount = currentCount + 1;
      const newTotal = selectedNodes.length + 1;
      
      if (newCount / newTotal > MAX_MUSCLE_GROUP_PERCENTAGE && selectedNodes.length >= 3) {
        console.log(`[GraphOptimizer] Ejercicio ${exercise.name} (${primaryMuscleGroup}) rechazado: excede 40% de balance`);
        continue;
      }

      // AGREGAR EJERCICIO AL CAMINO (visitar nodo del grafo)
      selectedNodes.push(exercise);
      selectedExerciseIds.add(exercise.externalId || exercise.id); // Marcar nodo como visitado
      currentTime += exercise.costoTiempo;
      currentFatigue += exercise.costoFatiga;
      currentXP += exercise.estimuloXP;
      
      // Actualizar contador de grupos musculares
      muscleGroupCount.set(primaryMuscleGroup, newCount);

      const ratio = exercise.estimuloXP / (exercise.costoTiempo + exercise.costoFatiga / 10);
      console.log(`[GraphOptimizer] ✓ ${exercise.name} | Grupo: ${primaryMuscleGroup} | Ratio: ${ratio.toFixed(2)} | XP: ${exercise.estimuloXP.toFixed(1)}`);
    }

    // Calcular balance muscular final
    const muscleBalance = this.calculateMuscleGroupBalance(muscleGroupCount, selectedNodes.length);

    console.log(`[GraphOptimizer] ✅ Camino óptimo: ${selectedNodes.length} ejercicios`);
    console.log(`[GraphOptimizer] XP Total: ${currentXP.toFixed(1)}, Tiempo: ${currentTime}min, Fatiga: ${currentFatigue.toFixed(1)}`);
    console.log(`[GraphOptimizer] Uso de recursos: Tiempo ${(currentTime/maxTime*100).toFixed(1)}%, Stamina ${(currentFatigue/maxStamina*100).toFixed(1)}%`);
    console.log(`[GraphOptimizer] Balance Muscular: ${(muscleBalance*100).toFixed(1)}%`);
    console.log(`[GraphOptimizer] Nodos visitados (sin duplicados): ${selectedExerciseIds.size}`);
    console.log(`[GraphOptimizer] Distribución por grupo:`);
    muscleGroupCount.forEach((count, group) => {
      const percentage = (count / selectedNodes.length * 100).toFixed(1);
      console.log(`  - ${group}: ${count} ejercicios (${percentage}%)`);
    });

    return {
      nodes: selectedNodes,
      totalXP: currentXP,
      totalTime: currentTime,
      totalFatigue: currentFatigue,
      muscleBalance,
    };
  }

  /**
   * Determina el grupo muscular principal de un ejercicio
   * Basado en targetMuscles o en el atributo RPG dominante
   */
  private getPrimaryMuscleGroup(exercise: ExerciseNode): string {
    // Si el ejercicio tiene targetMuscles reales (de ExerciseDB)
    if (exercise.targetMuscles && exercise.targetMuscles.length > 0) {
      return exercise.targetMuscles[0]; // Primer músculo objetivo
    }
    
    // Fallback: usar el atributo RPG dominante
    const muscles = exercise.muscleTargets;
    let maxValue = 0;
    let primaryMuscle = 'general';
    
    for (const [muscle, value] of Object.entries(muscles)) {
      if (value > maxValue) {
        maxValue = value;
        primaryMuscle = muscle;
      }
    }
    
    return primaryMuscle;
  }

  /**
   * Calcula el balance entre grupos musculares
   * Retorna un valor entre 0 y 1, donde 1 es balance perfecto
   */
  private calculateMuscleGroupBalance(muscleGroupCount: Map<string, number>, totalExercises: number): number {
    if (totalExercises === 0) return 0;
    
    const counts = Array.from(muscleGroupCount.values());
    if (counts.length === 0) return 0;
    
    // Calcular la distribución ideal (uniforme)
    const idealPercentage = 1 / counts.length;
    
    // Calcular la desviación de cada grupo respecto al ideal
    let totalDeviation = 0;
    for (const count of counts) {
      const actualPercentage = count / totalExercises;
      totalDeviation += Math.abs(actualPercentage - idealPercentage);
    }
    
    // Normalizar: balance perfecto = 1, peor balance = 0
    const maxDeviation = 2; // Desviación máxima teórica
    const balance = Math.max(0, 1 - (totalDeviation / maxDeviation));
    
    return balance;
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
   * Verifica si un ejercicio coincide con los grupos musculares objetivo
   * basándose en sus atributos RPG (STR, AGI, STA, etc.)
   */
  private exerciseMatchesMuscleGroups(
    muscleTargets: Record<string, number>,
    targetGroups: string[],
    muscleGroupMap: Record<string, string[]>
  ): boolean {
    // Para cada grupo muscular objetivo
    for (const group of targetGroups) {
      const rpgAttributes = muscleGroupMap[group];
      if (!rpgAttributes) continue;

      // Verificar si el ejercicio trabaja alguno de los atributos de este grupo
      for (const attr of rpgAttributes) {
        if (muscleTargets[attr] && muscleTargets[attr] > 0.3) { // Umbral del 30%
          return true;
        }
      }
    }
    return false;
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
