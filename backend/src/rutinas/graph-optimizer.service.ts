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
   * MÉTODO PRINCIPAL: GENERACIÓN DE SESIÓN DIARIA (MICROCICLO)
   * Genera una sesión de ejercicios óptima usando algoritmo Greedy sobre un Grafo Dirigido
   * 
   * @param userStamina - Energía disponible del usuario (ej: 80)
   * @param timeLimit - Tiempo máximo en minutos (fijo: 120)
   * @param targetMuscle - Grupo muscular objetivo (ej: 'Pecho', 'Espalda', 'chest', 'back')
   * @param userLevel - Nivel del usuario (1-8)
   * @param availableNodes - Lista de ejercicios/nodos del grafo disponibles
   * @returns Array ordenado de ExerciseNode[] representando la ruta óptima
   */
  async generateSession(
    userStamina: number,
    timeLimit: number = 120,
    targetMuscle: string,
    userLevel: number,
    availableNodes: ExerciseNode[],
  ): Promise<ExerciseNode[]> {
    console.log('[GraphOptimizer.generateSession] ========================================');
    console.log(`[GraphOptimizer.generateSession] Iniciando generación de sesión...`);
    console.log(`[GraphOptimizer.generateSession] Parámetros:`);
    console.log(`  - Stamina disponible: ${userStamina}`);
    console.log(`  - Límite de tiempo: ${timeLimit} min`);
    console.log(`  - Grupo muscular objetivo: ${targetMuscle}`);
    console.log(`  - Nivel de usuario: ${userLevel}`);
    console.log(`  - Nodos disponibles: ${availableNodes.length}`);

    // PASO 1: FILTRADO INICIAL
    // Solo considerar ejercicios que coincidan con targetMuscle y estén desbloqueados por userLevel
    const filteredNodes = this.filterNodesByTargetMuscle(availableNodes, targetMuscle, userLevel);
    console.log(`[GraphOptimizer.generateSession] Ejercicios filtrados: ${filteredNodes.length}`);

    if (filteredNodes.length === 0) {
      console.log(`[GraphOptimizer.generateSession] ⚠️ No se encontraron ejercicios para ${targetMuscle}`);
      return [];
    }

    // PASO 2: RECORRIDO DEL GRAFO CON ALGORITMO GREEDY
    const selectedPath = this.greedyPathSelection(
      filteredNodes,
      userStamina,
      timeLimit,
      targetMuscle,
    );

    console.log(`[GraphOptimizer.generateSession] ✅ Sesión generada: ${selectedPath.length} ejercicios`);
    console.log('[GraphOptimizer.generateSession] ========================================');

    return selectedPath;
  }

  /**
   * FILTRADO INICIAL: Solo ejercicios que coincidan con targetMuscle y nivel permitido
   */
  private filterNodesByTargetMuscle(
    nodes: ExerciseNode[],
    targetMuscle: string,
    userLevel: number,
  ): ExerciseNode[] {
    const normalizedTarget = targetMuscle.toLowerCase().trim();
    
    // Mapeo de nombres en español/inglés
    const muscleAliases: Record<string, string[]> = {
      'chest': ['chest', 'pecho', 'pectoral'],
      'back': ['back', 'espalda', 'dorsal'],
      'shoulders': ['shoulders', 'hombros', 'deltoides'],
      'triceps': ['triceps', 'tríceps'],
      'biceps': ['biceps', 'bíceps'],
      'legs': ['legs', 'piernas', 'cuádriceps', 'quadriceps'],
      'core': ['core', 'abdomen', 'abs'],
    };

    // Encontrar aliases del target
    let targetAliases: string[] = [normalizedTarget];
    for (const [key, aliases] of Object.entries(muscleAliases)) {
      if (aliases.includes(normalizedTarget)) {
        targetAliases = aliases;
        break;
      }
    }

    const filtered = nodes.filter(node => {
      // Verificar nivel (si el nodo tiene prerequisites, usar esa lógica)
      // Por simplicidad, asumimos que si está en availableNodes ya está desbloqueado
      
      // Verificar coincidencia con targetMuscle
      if (node.targetMuscles && node.targetMuscles.length > 0) {
        // Buscar en targetMuscles del nodo
        const hasMatch = node.targetMuscles.some(muscle => 
          targetAliases.some(alias => muscle.toLowerCase().includes(alias))
        );
        if (hasMatch) return true;
      }

      if (node.bodyParts && node.bodyParts.length > 0) {
        // Buscar en bodyParts del nodo
        const hasMatch = node.bodyParts.some(part => 
          targetAliases.some(alias => part.toLowerCase().includes(alias))
        );
        if (hasMatch) return true;
      }

      // Fallback: verificar en muscleTargets (atributos RPG)
      const rpgMapping: Record<string, string[]> = {
        'chest': ['STR'],
        'back': ['STR'],
        'shoulders': ['STR', 'DEX'],
        'triceps': ['STR', 'DEX'],
        'biceps': ['STR', 'DEX'],
        'legs': ['STR', 'STA'],
        'core': ['STA', 'END'],
      };

      for (const [muscle, attrs] of Object.entries(rpgMapping)) {
        if (targetAliases.includes(muscle)) {
          const hasRPGMatch = attrs.some(attr => node.muscleTargets[attr] > 0.3);
          if (hasRPGMatch) return true;
        }
      }

      return false;
    });

    return filtered;
  }

  /**
   * SELECCIÓN GREEDY DEL CAMINO ÓPTIMO
   * Algoritmo:
   * 1. Calcular ratio XP/(Tiempo+Fatiga) para cada candidato
   * 2. Ordenar por mejor ratio
   * 3. Seleccionar secuencialmente mientras se cumplan restricciones
   * 4. IMPORTANTE: No repetir nodos (usar Set<string>)
   */
  private greedyPathSelection(
    candidates: ExerciseNode[],
    maxStamina: number,
    maxTime: number,
    targetMuscle: string,
  ): ExerciseNode[] {
    const selectedPath: ExerciseNode[] = [];
    const visitedIds = new Set<string>(); // Restricción de unicidad
    
    let currentTime = 0;
    let currentFatigue = 0;
    const muscleDistribution = new Map<string, number>(); // Rastrear distribución muscular

    console.log(`[GraphOptimizer.greedyPathSelection] Iniciando selección greedy...`);
    console.log(`[GraphOptimizer.greedyPathSelection] Candidatos iniciales: ${candidates.length}`);

    // Calcular ratios y ordenar (mejor ratio primero)
    const candidatesWithRatio = candidates.map(node => ({
      node,
      ratio: this.calculateEfficiencyRatio(node),
    }));

    candidatesWithRatio.sort((a, b) => b.ratio - a.ratio);

    // Iterar hasta que no se puedan agregar más ejercicios
    for (const { node, ratio } of candidatesWithRatio) {
      // RESTRICCIÓN DE UNICIDAD: Verificar si ya fue visitado
      if (visitedIds.has(node.id)) {
        console.log(`[GraphOptimizer.greedyPathSelection] ⏭️ Ejercicio ${node.name} ya seleccionado (unicidad)`);
        continue;
      }

      // RESTRICCIÓN DE TIEMPO: Verificar si agregar excede timeLimit
      if (currentTime + node.costoTiempo > maxTime) {
        console.log(`[GraphOptimizer.greedyPathSelection] ⏱️ Ejercicio ${node.name} excedería tiempo (${currentTime + node.costoTiempo} > ${maxTime})`);
        continue;
      }

      // RESTRICCIÓN DE STAMINA: Verificar si agregar excede userStamina
      if (currentFatigue + node.costoFatiga > maxStamina) {
        console.log(`[GraphOptimizer.greedyPathSelection] 💤 Ejercicio ${node.name} excedería stamina (${currentFatigue + node.costoFatiga} > ${maxStamina})`);
        continue;
      }

      // RESTRICCIÓN DE BALANCE: Máximo 40% por grupo muscular
      const primaryMuscle = this.getPrimaryMuscle(node);
      const currentMusclePercentage = this.calculateMusclePercentage(
        muscleDistribution,
        primaryMuscle,
        node.estimuloXP,
        selectedPath.reduce((sum, n) => sum + n.estimuloXP, 0) + node.estimuloXP
      );

      if (currentMusclePercentage > 0.40 && selectedPath.length >= 4) {
        console.log(`[GraphOptimizer.greedyPathSelection] ⚖️ Ejercicio ${node.name} excedería límite del 40% para ${primaryMuscle} (${(currentMusclePercentage * 100).toFixed(1)}%)`);
        continue;
      }

      // AGREGAR NODO A LA RUTA
      selectedPath.push(node);
      visitedIds.add(node.id);
      currentTime += node.costoTiempo;
      currentFatigue += node.costoFatiga;

      // Actualizar distribución muscular
      const currentValue = muscleDistribution.get(primaryMuscle) || 0;
      muscleDistribution.set(primaryMuscle, currentValue + node.estimuloXP);

      console.log(`[GraphOptimizer.greedyPathSelection] ✅ Agregado: ${node.name} (Ratio: ${ratio.toFixed(2)}, XP: ${node.estimuloXP.toFixed(1)})`);
      console.log(`[GraphOptimizer.greedyPathSelection]    Total: ${selectedPath.length} ejercicios | Tiempo: ${currentTime}min | Fatiga: ${currentFatigue.toFixed(1)}`);
    }

    // CONDICIÓN DE PARADA: Ya iteramos todos los candidatos
    console.log(`[GraphOptimizer.greedyPathSelection] 🏁 Selección completada`);
    console.log(`[GraphOptimizer.greedyPathSelection] Ejercicios seleccionados: ${selectedPath.length}`);
    console.log(`[GraphOptimizer.greedyPathSelection] Tiempo total: ${currentTime}/${maxTime} min`);
    console.log(`[GraphOptimizer.greedyPathSelection] Fatiga total: ${currentFatigue.toFixed(1)}/${maxStamina}`);

    return selectedPath;
  }

  /**
   * Calcula el ratio de eficiencia: XP/(Tiempo+Fatiga)
   */
  private calculateEfficiencyRatio(node: ExerciseNode): number {
    const denominator = node.costoTiempo + node.costoFatiga;
    if (denominator === 0) return 0;
    return node.estimuloXP / denominator;
  }

  /**
   * Obtiene el músculo principal de un nodo
   */
  private getPrimaryMuscle(node: ExerciseNode): string {
    if (node.targetMuscles && node.targetMuscles.length > 0) {
      return node.targetMuscles[0];
    }
    if (node.bodyParts && node.bodyParts.length > 0) {
      return node.bodyParts[0];
    }
    // Fallback: usar el atributo RPG con mayor valor
    const maxAttr = Object.entries(node.muscleTargets)
      .reduce((max, [attr, val]) => val > max.val ? { attr, val } : max, { attr: 'STR', val: 0 });
    return maxAttr.attr;
  }

  /**
   * Calcula el porcentaje que representa un músculo en el total de XP
   */
  private calculateMusclePercentage(
    distribution: Map<string, number>,
    muscle: string,
    additionalXP: number,
    totalXP: number,
  ): number {
    const currentValue = distribution.get(muscle) || 0;
    const newValue = currentValue + additionalXP;
    return totalXP > 0 ? newValue / totalXP : 0;
  }

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
        
        const tiempoPorSerie = 2.5;
        const costoTiempo = tiempoPorSerie * series;
        
        const fatigaBasePorSerie = 8;
        const costoFatiga = fatigaBasePorSerie * series * muRIR;
        
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

    console.log(`[GraphOptimizer] Grafo construido con ${nodes.length} nodos (ejercicios disponibles desde BD)`);
    
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

    // Ordenar por eficiencia (XP por unidad de costo) con factor aleatorio
    const sortedExercises = [...feasibleExercises].sort((a, b) => {
      const costA = a.costoTiempo * 0.5 + a.costoFatiga * 0.5;
      const costB = b.costoTiempo * 0.5 + b.costoFatiga * 0.5;
      const effA = a.estimuloXP / costA;
      const effB = b.estimuloXP / costB;
      
      // Agregar factor de variabilidad (+/- 15% aleatorio)
      const randomFactorA = 0.85 + Math.random() * 0.3; // 0.85 a 1.15
      const randomFactorB = 0.85 + Math.random() * 0.3;
      
      return (effB * randomFactorB) - (effA * randomFactorA);
    });

    // ALGORITMO GREEDY MEJORADO CON BALANCE MUSCULAR Y VARIABILIDAD
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
