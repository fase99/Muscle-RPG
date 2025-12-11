import { Controller, Get, Query, Param, Post, Body, Logger } from '@nestjs/common';
import { GraphBuilderService, GraphNode } from './graph-builder.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpgExerciseRule, RpgExerciseRuleDocument } from './schemas/rpg-exercise-rule.schema';

@Controller('exercises')
export class ExercisesController {
  private readonly logger = new Logger(ExercisesController.name);

  constructor(
    private readonly graphBuilder: GraphBuilderService,
    @InjectModel(RpgExerciseRule.name)
    private rpgRuleModel: Model<RpgExerciseRuleDocument>,
  ) {}

  /**
   * GET /exercises/graph
   * Obtiene el grafo completo de ejercicios (datos RPG + datos visuales)
   */
  @Get('graph')
  async getFullGraph(): Promise<GraphNode[]> {
    this.logger.log('Solicitando grafo completo de ejercicios');
    return this.graphBuilder.buildFullGraph();
  }

  /**
   * GET /exercises/candidates
   * Obtiene ejercicios candidatos según nivel de usuario y ejercicios completados
   * Query params: level (number), completed (string[] separado por comas)
   */
  @Get('candidates')
  async getCandidates(
    @Query('level') level: string,
    @Query('completed') completed?: string,
  ): Promise<GraphNode[]> {
    const userLevel = parseInt(level, 10) || 1;
    const completedExercises = completed ? completed.split(',') : [];

    this.logger.log(`Solicitando candidatos para nivel ${userLevel}`);
    return this.graphBuilder.getCandidateExercises(userLevel, completedExercises);
  }

  /**
   * GET /exercises/:id
   * Obtiene un ejercicio específico del grafo
   */
  @Get(':id')
  async getExerciseById(@Param('id') id: string): Promise<GraphNode | null> {
    this.logger.log(`Solicitando ejercicio ${id}`);
    return this.graphBuilder.getNodeById(id);
  }

  /**
   * GET /exercises/:id/unlocks
   * Obtiene qué ejercicios desbloquea este ejercicio
   */
  @Get(':id/unlocks')
  async getUnlockedExercises(@Param('id') id: string): Promise<GraphNode[]> {
    this.logger.log(`Solicitando ejercicios desbloqueados por ${id}`);
    return this.graphBuilder.getUnlockedExercises(id);
  }

  /**
   * POST /exercises/seed
   * Endpoint para poblar la base de datos con reglas RPG de ejemplo
   * (Solo para desarrollo/testing)
   */
  @Post('seed')
  async seedDatabase(): Promise<{ message: string; count: number }> {
    this.logger.log('Sembrando base de datos con reglas RPG de ejemplo...');

    // Eliminar reglas existentes
    await this.rpgRuleModel.deleteMany({});

    // Datos de ejemplo basados en el paper
    const seedData = [
      {
        externalId: '0001',
        levelRequired: 1,
        baseXP: 10,
        fatigueCost: 5,
        executionTime: 5, // 5 minutos
        muscleTargets: {
          STR: 0,
          AGI: 0,
          STA: 30, // Abdominales = Stamina
          INT: 0,
          DEX: 0,
          END: 20,
        },
        prerequisites: [],
        unlocks: ['0002'],
      },
      {
        externalId: '0002',
        levelRequired: 2,
        baseXP: 15,
        fatigueCost: 8,
        executionTime: 8,
        muscleTargets: {
          STR: 40, // Dominadas = Fuerza espalda
          AGI: 10,
          STA: 0,
          INT: 0,
          DEX: 20,
          END: 30,
        },
        prerequisites: ['0001'],
        unlocks: ['0003'],
      },
      {
        externalId: '0003',
        levelRequired: 3,
        baseXP: 20,
        fatigueCost: 10,
        executionTime: 10,
        muscleTargets: {
          STR: 50, // Bench press = Fuerza pecho
          AGI: 0,
          STA: 0,
          INT: 0,
          DEX: 15,
          END: 35,
        },
        prerequisites: ['0002'],
        unlocks: [],
      },
    ];

    const created = await this.rpgRuleModel.insertMany(seedData);
    this.logger.log(`${created.length} reglas RPG creadas`);

    return {
      message: 'Base de datos sembrada exitosamente',
      count: created.length,
    };
  }
}
