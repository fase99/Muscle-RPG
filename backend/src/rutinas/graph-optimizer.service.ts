import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpgExerciseRule, RpgExerciseRuleDocument } from '../exercises/schemas/rpg-exercise-rule.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { ExerciseDbService } from '../exercises/exercisedb.service';


interface ExerciseNode {
  id: string;
  externalId: string;
  name: string;
  costoTiempo: number;
  costoFatiga: number;
  estimuloXP: number;
  rir: number;
  muscleTargets: {
    STR: number;
    AGI: number;
    STA: number;
    INT: number;
    DEX: number;
    END: number;
  };
  prerequisites?: string[];
  series: number;
  repeticiones: number;
  targetMuscles?: string[];
  bodyParts?: string[];
}

interface GraphPath {
  nodes: ExerciseNode[];
  totalXP: number;
  totalTime: number;
  totalFatigue: number;
  muscleBalance: number;
}

interface VolumeLandmarks {
  MEV: number;
  MAV: number;
  MRV: number;
}

@Injectable()
export class GraphOptimizerService {
  constructor(
    @InjectModel(RpgExerciseRule.name) private exerciseRuleModel: Model<RpgExerciseRuleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private exerciseDbService: ExerciseDbService,
  ) {}

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

    const filteredNodes = this.filterNodesByTargetMuscle(availableNodes, targetMuscle, userLevel);
    console.log(`[GraphOptimizer.generateSession] Ejercicios filtrados: ${filteredNodes.length}`);

    if (filteredNodes.length === 0) {
      console.log(`[GraphOptimizer.generateSession] ⚠️ No se encontraron ejercicios para ${targetMuscle}`);
      return [];
    }

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

  private filterNodesByTargetMuscle(
    nodes: ExerciseNode[],
    targetMuscle: string,
    userLevel: number,
  ): ExerciseNode[] {
    const normalizedTarget = targetMuscle.toLowerCase().trim();
    
  
    const muscleAliases: Record<string, string[]> = {
      'chest': ['chest', 'pecho', 'pectoral'],
      'back': ['back', 'espalda', 'dorsal'],
      'shoulders': ['shoulders', 'hombros', 'deltoides'],
      'triceps': ['triceps', 'tríceps'],
      'biceps': ['biceps', 'bíceps'],
      'legs': ['legs', 'piernas', 'cuádriceps', 'quadriceps'],
      'core': ['core', 'abdomen', 'abs'],
    };

    let targetAliases: string[] = [normalizedTarget];
    for (const [key, aliases] of Object.entries(muscleAliases)) {
      if (aliases.includes(normalizedTarget)) {
        targetAliases = aliases;
        break;
      }
    }

    const filtered = nodes.filter(node => {
      if (node.targetMuscles && node.targetMuscles.length > 0) {
        const hasMatch = node.targetMuscles.some(muscle => 
          targetAliases.some(alias => muscle.toLowerCase().includes(alias))
        );
        if (hasMatch) return true;
      }

      if (node.bodyParts && node.bodyParts.length > 0) {
        const hasMatch = node.bodyParts.some(part => 
          targetAliases.some(alias => part.toLowerCase().includes(alias))
        );
        if (hasMatch) return true;
      }

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

  private greedyPathSelection(
    candidates: ExerciseNode[],
    maxStamina: number,
    maxTime: number,
    targetMuscle: string,
  ): ExerciseNode[] {
    const selectedPath: ExerciseNode[] = [];
    const visitedIds = new Set<string>();
    
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

    for (const { node, ratio } of candidatesWithRatio) {
      if (visitedIds.has(node.id)) {
        console.log(`[GraphOptimizer.greedyPathSelection] ⏭️ Ejercicio ${node.name} ya seleccionado (unicidad)`);
        continue;
      }

      if (currentTime + node.costoTiempo > maxTime) {
        console.log(`[GraphOptimizer.greedyPathSelection] ⏱️ Ejercicio ${node.name} excedería tiempo (${currentTime + node.costoTiempo} > ${maxTime})`);
        continue;
      }

      if (currentFatigue + node.costoFatiga > maxStamina) {
        console.log(`[GraphOptimizer.greedyPathSelection] 💤 Ejercicio ${node.name} excedería stamina (${currentFatigue + node.costoFatiga} > ${maxStamina})`);
        continue;
      }

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

      selectedPath.push(node);
      visitedIds.add(node.id);
      currentTime += node.costoTiempo;
      currentFatigue += node.costoFatiga;

      const currentValue = muscleDistribution.get(primaryMuscle) || 0;
      muscleDistribution.set(primaryMuscle, currentValue + node.estimuloXP);

      console.log(`[GraphOptimizer.greedyPathSelection] ✅ Agregado: ${node.name} (Ratio: ${ratio.toFixed(2)}, XP: ${node.estimuloXP.toFixed(1)})`);
      console.log(`[GraphOptimizer.greedyPathSelection]    Total: ${selectedPath.length} ejercicios | Tiempo: ${currentTime}min | Fatiga: ${currentFatigue.toFixed(1)}`);
    }

    console.log(`[GraphOptimizer.greedyPathSelection] 🏁 Selección completada`);
    console.log(`[GraphOptimizer.greedyPathSelection] Ejercicios seleccionados: ${selectedPath.length}`);
    console.log(`[GraphOptimizer.greedyPathSelection] Tiempo total: ${currentTime}/${maxTime} min`);
    console.log(`[GraphOptimizer.greedyPathSelection] Fatiga total: ${currentFatigue.toFixed(1)}/${maxStamina}`);

    return selectedPath;
  }

  private calculateEfficiencyRatio(node: ExerciseNode): number {
    const denominator = node.costoTiempo + node.costoFatiga;
    if (denominator === 0) return 0;
    return node.estimuloXP / denominator;
  }

  private getPrimaryMuscle(node: ExerciseNode): string {
    if (node.targetMuscles && node.targetMuscles.length > 0) {
      return node.targetMuscles[0];
    }
    if (node.bodyParts && node.bodyParts.length > 0) {
      return node.bodyParts[0];
    }
    const maxAttr = Object.entries(node.muscleTargets)
      .reduce((max, [attr, val]) => val > max.val ? { attr, val } : max, { attr: 'STR', val: 0 });
    return maxAttr.attr;
  }

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


  async optimizeSesionDiaria(
    userId: string,
    maxTime: number = 120,
    availableStamina?: number,
    targetRIR: number = 2,
    targetMuscleGroups?: string[],
  ): Promise<GraphPath> {
    console.log('[GraphOptimizer] Iniciando optimización de sesión diaria...');
    
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('Usuario no encontrado');

    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) throw new Error('Perfil no encontrado. Complete el perfilamiento primero.');

    const stamina = availableStamina ?? user.staminaActual;
    
    console.log(`[GraphOptimizer] Usuario Nivel: ${user.nivel}, Stamina: ${stamina}/${user.staminaMaxima}, RIR Target: ${targetRIR}`);
    if (targetMuscleGroups && targetMuscleGroups.length > 0) {
      console.log(`[GraphOptimizer] Grupos musculares objetivo: ${targetMuscleGroups.join(', ')}`);
    }

    const availableExercises = await this.buildExerciseGraph(user, profile, targetRIR, targetMuscleGroups);
    
    console.log(`[GraphOptimizer] Ejercicios disponibles: ${availableExercises.length}`);

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

  private async buildExerciseGraph(
    user: UserDocument,
    profile: ProfileDocument,
    targetRIR: number = 2,
    targetMuscleGroups?: string[],
  ): Promise<ExerciseNode[]> {
    console.log(`[GraphOptimizer] Construyendo grafo de ejercicios...`);
    
    if (targetMuscleGroups && targetMuscleGroups.length > 0) {
      return this.buildGraphFromExerciseDb(user, profile, targetRIR, targetMuscleGroups);
    }
    
    return this.buildGraphFromRules(user, profile, targetRIR);
  }

  private async buildGraphFromExerciseDb(
    user: UserDocument,
    profile: ProfileDocument,
    targetRIR: number,
    targetMuscleGroups: string[],
  ): Promise<ExerciseNode[]> {
    console.log(`[GraphOptimizer] Obteniendo ejercicios desde ExerciseDB para grupos: ${targetMuscleGroups.join(', ')}`);
    
    const nodes: ExerciseNode[] = [];
    
    for (const muscleGroup of targetMuscleGroups) {
      const exercises = await this.exerciseDbService.getExercisesByMuscleGroup(muscleGroup);
      console.log(`[GraphOptimizer] Encontrados ${exercises.length} ejercicios para ${muscleGroup}`);
      
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


  private async buildGraphFromRules(
    user: UserDocument,
    profile: ProfileDocument,
    targetRIR: number,
  ): Promise<ExerciseNode[]> {
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

    const exerciseIds = exerciseRules.map(rule => rule.externalId);
    console.log(`[GraphOptimizer] Obteniendo nombres para ${exerciseIds.length} ejercicios desde ExerciseDB...`);

    for (const rule of exerciseRules) {
      const prerequisitesMet = rule.prerequisites.length === 0 || 
        rule.prerequisites.every(prereq => completedExercises.has(prereq));

      if (!prerequisitesMet) {
        console.log(`[GraphOptimizer] Ejercicio ${rule.externalId} bloqueado por prerequisites: ${rule.prerequisites.join(', ')}`);
        continue;
      }

      const exerciseName = await this.exerciseDbService.getExerciseName(rule.externalId);

      const series = this.getSeriesForProfile(profile);
      const repeticiones = this.getRepetitionsForHypertrophy();

      const muRIR = this.calculateRIRMultiplier(targetRIR);
      
      const tiempoPorSerie = 2.5;
      const costoTiempo = tiempoPorSerie * series;
      
      const fatigaBasePorSerie = 8;
      const costoFatiga = fatigaBasePorSerie * series * muRIR;
      
      const xpBasePorSerie = 15;
      const estimuloXP = xpBasePorSerie * series * muRIR;
      
      const node: ExerciseNode = {
        id: rule._id.toString(),
        externalId: rule.externalId,
        name: exerciseName,
        costoTiempo,
        costoFatiga,
        estimuloXP,
        rir: targetRIR,
        muscleTargets: rule.muscleTargets,
        prerequisites: rule.prerequisites,
        series,
        repeticiones,
      };

      nodes.push(node);
    }

    console.log(`[GraphOptimizer] Grafo construido con ${nodes.length} nodos`);
    
    return nodes;
  }

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

    const sortedExercises = [...feasibleExercises].sort((a, b) => {
      const costA = a.costoTiempo * 0.5 + a.costoFatiga * 0.5;
      const costB = b.costoTiempo * 0.5 + b.costoFatiga * 0.5;
      const effA = a.estimuloXP / costA;
      const effB = b.estimuloXP / costB;
      
      const randomFactorA = 0.85 + Math.random() * 0.3;
      const randomFactorB = 0.85 + Math.random() * 0.3;
      
      return (effB * randomFactorB) - (effA * randomFactorA);
    });

    const selectedNodes: ExerciseNode[] = [];
    let currentTime = 0;
    let currentFatigue = 0;
    let currentXP = 0;
    const muscleWork = { STR: 0, AGI: 0, STA: 0, INT: 0, DEX: 0, END: 0 };
    
    const targetTime = maxTime * 0.75;
    const minExercises = 5;
    const maxExercises = 10;

    for (const exercise of sortedExercises) {
      if (selectedNodes.length >= maxExercises) {
        console.log(`[GraphOptimizer] Límite de ${maxExercises} ejercicios alcanzado`);
        break;
      }

      if (currentTime + exercise.costoTiempo > maxTime) {
        console.log(`[GraphOptimizer] Ejercicio ${exercise.name} excede tiempo`);
        continue;
      }
      if (currentFatigue + exercise.costoFatiga > maxStamina) {
        console.log(`[GraphOptimizer] Ejercicio ${exercise.name} excede stamina`);
        continue;
      }

      const wouldOverwork = this.wouldOverworkMuscleStrict(muscleWork, exercise.muscleTargets, currentXP + exercise.estimuloXP);
      if (wouldOverwork && selectedNodes.length >= minExercises) {
        console.log(`[GraphOptimizer] Ejercicio ${exercise.name} causaría desbalance muscular`);
        continue;
      }

      selectedNodes.push(exercise);
      currentTime += exercise.costoTiempo;
      currentFatigue += exercise.costoFatiga;
      currentXP += exercise.estimuloXP;

      for (const [muscle, value] of Object.entries(exercise.muscleTargets)) {
        muscleWork[muscle] += value * exercise.estimuloXP;
      }

      console.log(`[GraphOptimizer] ✓ Agregado: ${exercise.name} (XP: ${exercise.estimuloXP.toFixed(1)}, Total: ${selectedNodes.length})`);

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


  private wouldOverworkMuscleStrict(
    currentWork: Record<string, number>,
    newWork: Record<string, number>,
    newTotalXP: number,
  ): boolean {
    const maxPercentage = 0.60;

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

  private calculateMuscleBalance(muscleWork: Record<string, number>): number {
    const values = Object.values(muscleWork).filter(v => v > 0);
    if (values.length === 0) return 0;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return Math.max(0, 1 - (stdDev / avg));
  }

  private getSeriesForProfile(profile: ProfileDocument): number {
    switch (profile.level) {
      case 'Básico':
        return 3;
      case 'Intermedio':
        return 4;
      case 'Avanzado':
        return 5;
      default:
        return 3;
    }
  }

  private getRepetitionsForHypertrophy(): number {
    return 10;
  }

  private calculateRIRMultiplier(rir: number): number {
    if (rir <= 1) return 1.2;
    if (rir === 2) return 1.0;
    if (rir === 3) return 0.85;
    return 0.7;
  }

  private exerciseMatchesMuscleGroups(
    muscleTargets: Record<string, number>,
    targetGroups: string[],
    muscleGroupMap: Record<string, string[]>
  ): boolean {
    for (const group of targetGroups) {
      const rpgAttributes = muscleGroupMap[group];
      if (!rpgAttributes) continue;

      for (const attr of rpgAttributes) {
        if (muscleTargets[attr] && muscleTargets[attr] > 0.3) {
          return true;
        }
      }
    }
    return false;
  }

  calculateVolumeLandmarks(profile: ProfileDocument): VolumeLandmarks {
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
}
