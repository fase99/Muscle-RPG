import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpgExerciseRule, RpgExerciseRuleDocument } from './schemas/rpg-exercise-rule.schema';
import { ExerciseDbService, ExerciseDbExercise } from './exercisedb.service';

export interface GraphNode {
  // Datos RPG (Para el Algoritmo de Optimización)
  id: string;
  xp: number; // Ganancia de hipertrofia (g_j)
  fatigue: number; // Costo de stamina (f_j)
  executionTime: number; // Tiempo de ejecución en minutos (t_j)
  level: number; // Nivel requerido
  prerequisites: string[]; // IDs de ejercicios prerequisitos
  unlocks: string[]; // IDs de ejercicios que desbloquea
  muscleTargets: { // Vector de músculos objetivo (v⃗_i)
    STR: number;
    AGI: number;
    STA: number;
    INT: number;
    DEX: number;
    END: number;
  };

  // Datos Visuales (Para el Frontend)
  name: string;
  gifUrl: string;
  targetMuscle: string;
  equipment: string;
  bodyPart: string;
  secondaryMuscles: string[];
  instructions: string[];
}

@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);

  constructor(
    @InjectModel(RpgExerciseRule.name)
    private rpgRuleModel: Model<RpgExerciseRuleDocument>,
    private exerciseDbService: ExerciseDbService,
  ) {}

  /**
   * Construye el Grafo Completo G=(V,E) con datos enriquecidos
   * Fusiona las reglas RPG de MongoDB con los datos visuales de ExerciseDB
   */
  async buildFullGraph(): Promise<GraphNode[]> {
    try {
      // 1. Obtener Reglas RPG desde MongoDB (Nodos lógicos y Aristas)
      this.logger.log('Obteniendo reglas RPG desde MongoDB...');
      const rpgRules = await this.rpgRuleModel.find().exec();

      if (rpgRules.length === 0) {
        this.logger.warn('No hay reglas RPG en la base de datos');
        return [];
      }

      this.logger.log(`${rpgRules.length} reglas RPG encontradas`);

      // 2. Extraer los IDs externos que necesitamos
      const idsToFetch = rpgRules.map((r) => r.externalId);

      // 3. Obtener datos visuales de la API Externa
      this.logger.log(`Obteniendo datos de ExerciseDB para ${idsToFetch.length} ejercicios...`);
      const externalData = await this.exerciseDbService.getExercisesByIds(idsToFetch);

      // 4. FUSIÓN (Merge): Crear el objeto final para el algoritmo y el Frontend
      const graphNodes: GraphNode[] = rpgRules.map((rule) => {
        const details = externalData.find((ex) => ex.exerciseId === rule.externalId);

        return {
          // Datos RPG (Para el Algoritmo de Optimización)
          id: rule.externalId,
          xp: rule.baseXP,
          fatigue: rule.fatigueCost,
          executionTime: rule.executionTime,
          level: rule.levelRequired,
          prerequisites: rule.prerequisites || [],
          unlocks: rule.unlocks || [],
          muscleTargets: rule.muscleTargets || {
            STR: 0,
            AGI: 0,
            STA: 0,
            INT: 0,
            DEX: 0,
            END: 0,
          },

          // Datos Visuales (Para el Frontend)
          name: details?.name || '',
          gifUrl: details?.gifUrl || '',
          targetMuscle: details?.targetMuscles?.[0] || 'unknown',
          equipment: details?.equipments?.[0] || 'unknown',
          bodyPart: details?.bodyParts?.[0] || 'unknown',
          secondaryMuscles: details?.secondaryMuscles || [],
          instructions: details?.instructions || [],
        };
      });

      this.logger.log(`Grafo construido con ${graphNodes.length} nodos`);
      return graphNodes;
    } catch (error) {
      this.logger.error('Error al construir el grafo', error);
      throw error;
    }
  }

  /**
   * Obtiene ejercicios candidatos según el nivel del usuario y ejercicios completados
   * Implementa la lógica de desbloqueo del grafo
   */
  async getCandidateExercises(userLevel: number, completedExercises: string[]): Promise<GraphNode[]> {
    const fullGraph = await this.buildFullGraph();

    // Filtrar candidatos según:
    // 1. Nivel requerido <= nivel del usuario
    // 2. Todos los prerequisitos están en completedExercises
    const candidates = fullGraph.filter((node) => {
      // Verificar nivel
      if (node.level > userLevel) {
        return false;
      }

      // Verificar prerequisitos
      const hasAllPrerequisites = node.prerequisites.every((preId) =>
        completedExercises.includes(preId),
      );

      return hasAllPrerequisites;
    });

    this.logger.log(
      `${candidates.length} ejercicios candidatos para nivel ${userLevel} con ${completedExercises.length} ejercicios completados`,
    );

    return candidates;
  }

  /**
   * Obtiene un nodo específico del grafo por ID
   */
  async getNodeById(exerciseId: string): Promise<GraphNode | null> {
    const fullGraph = await this.buildFullGraph();
    return fullGraph.find((node) => node.id === exerciseId) || null;
  }

  /**
   * Obtiene todos los ejercicios que serían desbloqueados al completar un ejercicio dado
   */
  async getUnlockedExercises(exerciseId: string): Promise<GraphNode[]> {
    const node = await this.getNodeById(exerciseId);
    if (!node || !node.unlocks.length) {
      return [];
    }

    const fullGraph = await this.buildFullGraph();
    return fullGraph.filter((n) => node.unlocks.includes(n.id));
  }
}
