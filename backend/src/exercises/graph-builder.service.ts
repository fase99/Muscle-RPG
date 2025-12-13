import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpgExerciseRule, RpgExerciseRuleDocument } from './schemas/rpg-exercise-rule.schema';
import { ExerciseDbService, ExerciseDbExercise } from './exercisedb.service';

export interface GraphNode {
  id: string;
  xp: number;
  fatigue: number;
  executionTime: number;
  level: number;
  prerequisites: string[];
  unlocks: string[];
  muscleTargets: {
    STR: number;
    AGI: number;
    STA: number;
    INT: number;
    DEX: number;
    END: number;
  };
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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
 
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  async buildFullGraph(): Promise<GraphNode[]> {
    try {
      this.logger.log('Obteniendo reglas RPG desde MongoDB...');
      const rpgRules = await this.rpgRuleModel.find().exec();

      if (rpgRules.length === 0) {
        this.logger.warn('No hay reglas RPG en la base de datos');
        return [];
      }

      this.logger.log(`${rpgRules.length} reglas RPG encontradas`);

      const idsToFetch = rpgRules.map((r) => r.externalId);

      this.logger.log(`Obteniendo datos de ExerciseDB para ${idsToFetch.length} ejercicios...`);
      const externalData = await this.exerciseDbService.getExercisesByIds(idsToFetch);

      const graphNodes: GraphNode[] = rpgRules.map((rule) => {
        const details = externalData.find((ex) => ex.exerciseId === rule.externalId);

        return {
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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
 
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  async getCandidateExercises(userLevel: number, completedExercises: string[]): Promise<GraphNode[]> {
    const fullGraph = await this.buildFullGraph();

    const candidates = fullGraph.filter((node) => {
      if (node.level > userLevel) {
        return false;
      }

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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
 
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  async getNodeById(exerciseId: string): Promise<GraphNode | null> {
    const fullGraph = await this.buildFullGraph();
    return fullGraph.find((node) => node.id === exerciseId) || null;
  }

<<<<<<< Updated upstream
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  async getUnlockedExercises(exerciseId: string): Promise<GraphNode[]> {
    const node = await this.getNodeById(exerciseId);
    if (!node || !node.unlocks.length) {
      return [];
    }

    const fullGraph = await this.buildFullGraph();
    return fullGraph.filter((n) => node.unlocks.includes(n.id));
  }
}
