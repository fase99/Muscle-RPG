import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpgExerciseRule, RpgExerciseRuleDocument } from '../exercises/schemas/rpg-exercise-rule.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { Rutina, RutinaDocument } from '../schemas/rutina.schema';
import { GraphOptimizerService } from './graph-optimizer.service';
import { ExerciseDbService } from '../exercises/exercisedb.service';

/**
 * SERVICIO DE VISUALIZACIÓN DEL GRAFO DE EJERCICIOS
 * 
 * Este servicio permite visualizar el grafo completo de ejercicios,
 * mostrando todos los nodos, aristas, costos y relaciones implementadas.
 */

// ========== INTERFACES DE VISUALIZACIÓN ==========

export interface GraphNodeVisualization {
  // Identificación
  id: string;
  externalId: string;
  name: string;
  
  // Costos del Nodo (para algoritmo de optimización)
  costoTiempo: number;        // t_j (minutos)
  costoFatiga: number;        // f_j (stamina)
  estimuloXP: number;         // g_j (XP/Hipertrofia)
  eficienciaRatio: number;    // XP/(Tiempo + Fatiga)
  
  // Parámetros de entrenamiento
  series: number;
  repeticiones: number;
  rir: number;                // Repeticiones en Reserva
  
  // Atributos RPG (Vector de músculos)
  muscleTargets: {
    STR: number;
    AGI: number;
    STA: number;
    INT: number;
    DEX: number;
    END: number;
  };
  
  // Datos anatómicos reales
  targetMuscles: string[];    // Músculos objetivo (del JSON)
  bodyParts: string[];        // Partes del cuerpo
  equipment: string[];        // Equipamiento necesario
  
  // Relaciones del Grafo (Aristas)
  prerequisites: string[];    // IDs de ejercicios previos requeridos
  unlocks: string[];          // IDs de ejercicios que desbloquea
  levelRequired: number;      // Nivel mínimo para desbloquear
  
  // Metadatos
  gifUrl?: string;
  instructions?: string[];
}

export interface GraphEdge {
  from: string;               // ID del nodo origen
  to: string;                 // ID del nodo destino
  type: 'prerequisite' | 'unlocks' | 'muscle-group';
  weight?: number;            // Peso opcional de la arista
}

export interface GraphVisualizationData {
  // Información del grafo
  metadata: {
    totalNodes: number;
    totalEdges: number;
    graphType: string;        // 'DAG', 'Tree', etc.
    algorithmsUsed: string[];
    generatedAt: Date;
  };
  
  // Nodos del grafo
  nodes: GraphNodeVisualization[];
  
  // Aristas del grafo
  edges: GraphEdge[];
  
  // Estadísticas por grupo muscular
  muscleGroupStats: {
    group: string;
    exerciseCount: number;
    avgXP: number;
    avgTime: number;
    avgFatigue: number;
  }[];
  
  // Estadísticas de niveles
  levelDistribution: {
    level: number;
    exerciseCount: number;
  }[];
  
  // Estadísticas de eficiencia
  efficiencyStats: {
    maxEfficiency: number;
    minEfficiency: number;
    avgEfficiency: number;
    topExercises: {
      name: string;
      ratio: number;
    }[];
  };
}

export interface UserGraphVisualization extends GraphVisualizationData {
  // Información del usuario
  userInfo: {
    userId: string;
    level: number;
    stamina: number;
    srpg: number;
    perfil: string;
    completedExercises: number;
  };
  
  // Nodos desbloqueados para este usuario
  unlockedNodes: string[];
  
  // Nodos bloqueados (y por qué)
  lockedNodes: {
    id: string;
    reason: string;
    missingPrerequisites?: string[];
    levelRequired?: number;
  }[];
  
  // Ruta óptima calculada (si existe)
  optimalPath?: {
    nodes: string[];
    totalXP: number;
    totalTime: number;
    totalFatigue: number;
  };
}

@Injectable()
export class GraphVisualizerService {
  private readonly logger = new Logger(GraphVisualizerService.name);

  constructor(
    @InjectModel(RpgExerciseRule.name) 
    private exerciseRuleModel: Model<RpgExerciseRuleDocument>,
    @InjectModel(User.name) 
    private userModel: Model<UserDocument>,
    @InjectModel(Profile.name) 
    private profileModel: Model<ProfileDocument>,
    @InjectModel(Rutina.name)
    private rutinaModel: Model<RutinaDocument>,
    private graphOptimizer: GraphOptimizerService,
    private exerciseDbService: ExerciseDbService,
  ) {}

  /**
   * Genera una visualización completa del grafo de ejercicios
   * (sin considerar un usuario específico)
   */
  async visualizeFullGraph(): Promise<GraphVisualizationData> {
    this.logger.log('Generando visualización del grafo completo...');

    // 1. Obtener todos los nodos (reglas RPG)
    const rpgRules = await this.exerciseRuleModel.find().exec();
    
    // 2. Obtener datos de ExerciseDB para enriquecer
    const externalIds = rpgRules.map(r => r.externalId);
    const externalData = await this.exerciseDbService.getExercisesByIds(externalIds);

    // 3. Construir nodos de visualización
    const nodes: GraphNodeVisualization[] = rpgRules.map(rule => {
      const details = externalData.find(ex => ex.exerciseId === rule.externalId);
      
      const costoTiempo = rule.executionTime;
      const costoFatiga = rule.fatigueCost;
      const estimuloXP = rule.baseXP;
      const eficienciaRatio = (costoTiempo + costoFatiga) > 0 
        ? estimuloXP / (costoTiempo + costoFatiga) 
        : 0;

      return {
        id: rule._id.toString(),
        externalId: rule.externalId,
        name: details?.name || `Exercise ${rule.externalId}`,
        
        costoTiempo,
        costoFatiga,
        estimuloXP,
        eficienciaRatio,
        
        series: 3, // Default, se ajusta según perfil
        repeticiones: 10, // Default
        rir: 2, // Default
        
        muscleTargets: rule.muscleTargets || {
          STR: 0, AGI: 0, STA: 0, INT: 0, DEX: 0, END: 0
        },
        
        targetMuscles: details?.targetMuscles || [],
        bodyParts: details?.bodyParts || [],
        equipment: details?.equipments || [],
        
        prerequisites: rule.prerequisites || [],
        unlocks: rule.unlocks || [],
        levelRequired: rule.levelRequired || 1,
        
        gifUrl: details?.gifUrl,
        instructions: details?.instructions,
      };
    });

    // 4. Construir aristas (edges)
    const edges: GraphEdge[] = [];
    
    // 4.1 Aristas de prerequisites y unlocks (relaciones explícitas)
    for (const node of nodes) {
      // Aristas de prerequisites
      for (const prereqId of node.prerequisites) {
        const fromNode = nodes.find(n => n.id === prereqId || n.externalId === prereqId);
        if (fromNode) {
          edges.push({
            from: fromNode.id,
            to: node.id,
            type: 'prerequisite',
            weight: 1,
          });
        }
      }
      
      // Aristas de unlocks
      for (const unlockId of node.unlocks) {
        const toNode = nodes.find(n => n.id === unlockId || n.externalId === unlockId);
        if (toNode) {
          edges.push({
            from: node.id,
            to: toNode.id,
            type: 'unlocks',
            weight: 1,
          });
        }
      }
    }

    // 4.2 Crear aristas adicionales por progresión de nivel (para conectar el grafo)
    // Conectar ejercicios del mismo grupo muscular por niveles consecutivos
    const nodesByMuscleAndLevel = new Map<string, Map<number, GraphNodeVisualization[]>>();
    
    for (const node of nodes) {
      const muscleGroup = node.bodyParts[0] || node.targetMuscles[0] || 'other';
      if (!nodesByMuscleAndLevel.has(muscleGroup)) {
        nodesByMuscleAndLevel.set(muscleGroup, new Map());
      }
      if (!nodesByMuscleAndLevel.get(muscleGroup)!.has(node.levelRequired)) {
        nodesByMuscleAndLevel.get(muscleGroup)!.set(node.levelRequired, []);
      }
      nodesByMuscleAndLevel.get(muscleGroup)!.get(node.levelRequired)!.push(node);
    }

    // Conectar niveles consecutivos del mismo grupo muscular
    for (const [muscleGroup, levelMap] of nodesByMuscleAndLevel.entries()) {
      const sortedLevels = Array.from(levelMap.keys()).sort((a, b) => a - b);
      
      for (let i = 0; i < sortedLevels.length - 1; i++) {
        const currentLevel = sortedLevels[i];
        const nextLevel = sortedLevels[i + 1];
        
        const currentNodes = levelMap.get(currentLevel)!;
        const nextNodes = levelMap.get(nextLevel)!;
        
        // Conectar algunos nodos del nivel actual con el siguiente
        // (máximo 2 conexiones por nodo para evitar saturación)
        for (const currentNode of currentNodes.slice(0, 3)) {
          for (const nextNode of nextNodes.slice(0, 2)) {
            // Verificar que no exista ya una arista
            const existingEdge = edges.find(e => 
              e.from === currentNode.id && e.to === nextNode.id
            );
            
            if (!existingEdge) {
              edges.push({
                from: currentNode.id,
                to: nextNode.id,
                type: 'muscle-group',
                weight: 0.5,
              });
            }
          }
        }
      }
    }

    this.logger.log(`Aristas construidas: ${edges.length} (${edges.filter(e => e.type === 'prerequisite').length} prerequisites, ${edges.filter(e => e.type === 'unlocks').length} unlocks, ${edges.filter(e => e.type === 'muscle-group').length} por grupo muscular)`);

    // 5. Calcular estadísticas por grupo muscular
    const muscleGroupStats = this.calculateMuscleGroupStats(nodes);

    // 6. Calcular distribución de niveles
    const levelDistribution = this.calculateLevelDistribution(nodes);

    // 7. Calcular estadísticas de eficiencia
    const efficiencyStats = this.calculateEfficiencyStats(nodes);

    const visualization: GraphVisualizationData = {
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        graphType: 'DAG (Directed Acyclic Graph)',
        algorithmsUsed: [
          'Greedy + Knapsack Multi-Constraint (Nivel 1)',
          'Dynamic Programming + Bellman Equation (Nivel 2)'
        ],
        generatedAt: new Date(),
      },
      nodes,
      edges,
      muscleGroupStats,
      levelDistribution,
      efficiencyStats,
    };

    this.logger.log(`Visualización generada: ${nodes.length} nodos, ${edges.length} aristas`);
    
    return visualization;
  }
  /**
   * Lista todas las rutinas guardadas del usuario
   * Útil para debugging y verificar qué hay en la base de datos
   */
  async listUserRoutines(userId: string): Promise<any> {
    try {
      console.log(`\n[listUserRoutines] Buscando rutinas para usuario: ${userId}`);
      
      const userObjectId = new Types.ObjectId(userId);
      console.log(`[listUserRoutines] ObjectId convertido:`, userObjectId);
      
      const rutinas = await this.rutinaModel
        .find({ usuarioId: userObjectId })
        .sort({ createdAt: -1 })
        .exec();
      
      console.log(`[listUserRoutines] Rutinas encontradas: ${rutinas.length}`);
      
      const rutinasInfo = rutinas.map((rutina, index) => {
        const ejerciciosCount = rutina.ejercicios?.length || 0;
        const ejerciciosNames = rutina.ejercicios?.map(ej => ej.nombre) || [];
        
        console.log(`\n[listUserRoutines] Rutina ${index + 1}:`);
        console.log(`  - ID: ${rutina._id}`);
        console.log(`  - Nombre: ${rutina.nombre}`);
        console.log(`  - UsuarioId: ${rutina.usuarioId}`);
        console.log(`  - Ejercicios: ${ejerciciosCount}`);
        
        return {
          id: rutina._id,
          nombre: rutina.nombre,
          usuarioId: rutina.usuarioId,
          ejerciciosCount: ejerciciosCount,
          ejercicios: ejerciciosNames,
        };
      });
      
      return {
        userId,
        userObjectId: userObjectId.toString(),
        totalRoutines: rutinas.length,
        routines: rutinasInfo,
      };
    } catch (error) {
      console.error('[listUserRoutines] Error:', error);
      throw error;
    }
  }
  /**
   * Genera una visualización del grafo específica para un usuario
   * Muestra qué nodos están desbloqueados/bloqueados y la ruta óptima
   */
  async visualizeUserGraph(
    userId: string,
    includeOptimalPath: boolean = true,
    maxTime: number = 120,
  ): Promise<UserGraphVisualization> {
    this.logger.log(`Generando visualización del grafo para usuario ${userId}...`);

    // 1. Obtener visualización base
    const baseVisualization = await this.visualizeFullGraph();

    // 2. Obtener datos del usuario y perfil
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('Usuario no encontrado');

    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) throw new Error('Perfil no encontrado');

    // 3. Determinar nodos desbloqueados
    const completedExercises = user.ejerciciosCompletados || [];
    const unlockedNodes: string[] = [];
    const lockedNodes: { id: string; reason: string; missingPrerequisites?: string[]; levelRequired?: number; }[] = [];

    for (const node of baseVisualization.nodes) {
      // Verificar nivel
      if (node.levelRequired > user.nivel) {
        lockedNodes.push({
          id: node.id,
          reason: `Requiere nivel ${node.levelRequired} (actual: ${user.nivel})`,
          levelRequired: node.levelRequired,
        });
        continue;
      }

      // Verificar prerequisites
      const missingPrereqs = node.prerequisites.filter(
        prereqId => !completedExercises.includes(prereqId)
      );

      if (missingPrereqs.length > 0) {
        lockedNodes.push({
          id: node.id,
          reason: `Faltan ${missingPrereqs.length} prerequisito(s)`,
          missingPrerequisites: missingPrereqs,
        });
        continue;
      }

      // Nodo desbloqueado
      unlockedNodes.push(node.id);
    }

    // 4. Calcular ruta óptima (si se solicita)
    let optimalPath: { nodes: string[]; totalXP: number; totalTime: number; totalFatigue: number; } | undefined;
    
    if (includeOptimalPath) {
      try {
        const pathResult = await this.graphOptimizer.optimizeSesionDiaria(
          userId,
          maxTime,
          user.staminaActual,
        );

        optimalPath = {
          nodes: pathResult.nodes.map(n => n.id),
          totalXP: pathResult.totalXP,
          totalTime: pathResult.totalTime,
          totalFatigue: pathResult.totalFatigue,
        };
      } catch (error) {
        this.logger.warn(`No se pudo calcular la ruta óptima: ${error.message}`);
      }
    }

    // 5. Determinar perfil del usuario
    const perfilConfig = this.determinarPerfilUsuario(profile.sRpg);

    const userVisualization: UserGraphVisualization = {
      ...baseVisualization,
      userInfo: {
        userId,
        level: user.nivel,
        stamina: user.staminaActual,
        srpg: profile.sRpg,
        perfil: perfilConfig.perfil,
        completedExercises: completedExercises.length,
      },
      unlockedNodes,
      lockedNodes,
      optimalPath,
    };

    this.logger.log(`Visualización de usuario generada: ${unlockedNodes.length} desbloqueados, ${lockedNodes.length} bloqueados`);
    
    return userVisualization;
  }

  /**
   * Visualiza SOLO la ruta óptima (ejercicios de la rutina generada)
   * Este método muestra únicamente los ejercicios de la última rutina activa guardada
   */
  async visualizeOptimalPathOnly(userId: string, maxTime: number = 120): Promise<{
    nodes: GraphNodeVisualization[];
    edges: GraphEdge[];
    metadata: any;
  }> {
    this.logger.log(`Generando visualización de rutina guardada para usuario ${userId}...`);

    // Convertir userId a ObjectId para la búsqueda
    const userObjectId = new Types.ObjectId(userId);

    // 1. Buscar CUALQUIER rutina del usuario (no solo activa)
    const rutinas = await this.rutinaModel
      .find({ usuarioId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    this.logger.log(`Rutinas encontradas para ObjectId ${userObjectId}: ${rutinas.length}`);
    
    if (rutinas.length > 0) {
      rutinas.forEach((r, i) => {
        this.logger.log(`  ${i + 1}. ${r.nombre} - Activa: ${r.activa}, Ejercicios: ${r.ejercicios?.length || 0}`);
      });
    }

    const rutina = rutinas[0]; // Tomar la más reciente

    if (!rutina || !rutina.ejercicios || rutina.ejercicios.length === 0) {
      this.logger.warn(`No se encontró rutina con ejercicios. Rutina existe: ${!!rutina}, Tiene ejercicios: ${!!rutina?.ejercicios}, Cantidad: ${rutina?.ejercicios?.length || 0}`);
      
      // Si no hay rutina, generar una nueva
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        this.logger.error('Usuario no encontrado');
        throw new Error('Usuario no encontrado');
      }

      this.logger.log(`Usuario encontrado: ${user.nombre}, Nivel: ${user.nivel}, Stamina: ${user.staminaActual}`);
      this.logger.log(`Intentando generar nueva rutina...`);

      try {
        const pathResult = await this.graphOptimizer.optimizeSesionDiaria(
          userId,
          maxTime,
          user.staminaActual,
        );

        this.logger.log(`Ruta generada exitosamente: ${pathResult.nodes.length} ejercicios, XP: ${pathResult.totalXP}, Tiempo: ${pathResult.totalTime}`);

        if (pathResult.nodes.length === 0) {
          this.logger.error('El optimizador no retornó ningún ejercicio');
          return {
            nodes: [],
            edges: [],
            metadata: {
              totalNodes: 0,
              totalEdges: 0,
              graphType: 'Ruta Óptima (Error: Sin ejercicios disponibles)',
              totalXP: 0,
              totalTime: 0,
              totalFatigue: 0,
              generatedAt: new Date(),
              error: 'No hay ejercicios disponibles para el usuario'
            }
          };
        }

      // Convertir a formato de visualización
      const nodes: GraphNodeVisualization[] = pathResult.nodes.map(node => ({
        id: node.id,
        externalId: node.externalId,
        name: node.name,
        costoTiempo: node.costoTiempo,
        costoFatiga: node.costoFatiga,
        estimuloXP: node.estimuloXP,
        eficienciaRatio: (node.costoTiempo + node.costoFatiga) > 0 
          ? node.estimuloXP / (node.costoTiempo + node.costoFatiga) 
          : 0,
        series: node.series,
        repeticiones: node.repeticiones,
        rir: node.rir,
        muscleTargets: node.muscleTargets,
        targetMuscles: node.targetMuscles || [],
        bodyParts: node.bodyParts || [],
        equipment: [],
        prerequisites: node.prerequisites || [],
        unlocks: [],
        levelRequired: 1,
      }));

      const edges: GraphEdge[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          from: nodes[i].id,
          to: nodes[i + 1].id,
          type: 'muscle-group',
          weight: i + 1,
        });
      }

      return {
        nodes,
        edges,
        metadata: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          graphType: 'Ruta Óptima (Secuencia de Rutina - Nueva)',
          totalXP: pathResult.totalXP,
          totalTime: pathResult.totalTime,
          totalFatigue: pathResult.totalFatigue,
          generatedAt: new Date(),
        }
      };
      } catch (error) {
        this.logger.error(`Error generando nueva rutina: ${error.message}`);
        throw error;
      }
    }

    this.logger.log(`Usando rutina "${rutina.nombre}" con ${rutina.ejercicios.length} ejercicios`);

    // 2. Convertir los ejercicios de la rutina a formato de visualización
    const nodes: GraphNodeVisualization[] = rutina.ejercicios.map((ejercicio, index) => ({
      id: `ejercicio-${index + 1}`,
      externalId: ejercicio.externalId,
      name: ejercicio.nombre,
      costoTiempo: ejercicio.costoTiempo,
      costoFatiga: ejercicio.costoFatiga,
      estimuloXP: ejercicio.estimuloXP,
      eficienciaRatio: (ejercicio.costoTiempo + ejercicio.costoFatiga) > 0 
        ? ejercicio.estimuloXP / (ejercicio.costoTiempo + ejercicio.costoFatiga) 
        : 0,
      series: ejercicio.series,
      repeticiones: ejercicio.repeticiones,
      rir: ejercicio.rir || 2,
      muscleTargets: ejercicio.muscleTargets || {
        STR: 0, AGI: 0, STA: 0, INT: 0, DEX: 0, END: 0
      },
      targetMuscles: [],
      bodyParts: [],
      equipment: [],
      prerequisites: [],
      unlocks: [],
      levelRequired: 1,
    }));

    // 3. Obtener detalles adicionales de ExerciseDB
    try {
      const externalIds = nodes.map(n => n.externalId);
      const externalData = await this.exerciseDbService.getExercisesByIds(externalIds);

      // Enriquecer nodos con datos visuales
      for (const node of nodes) {
        const details = externalData.find(ex => ex.exerciseId === node.externalId);
        if (details) {
          node.targetMuscles = details.targetMuscles || [];
          node.bodyParts = details.bodyParts || [];
          node.equipment = details.equipments || [];
        }
      }
    } catch (error) {
      this.logger.warn(`Error al obtener detalles de ExerciseDB: ${error.message}`);
    }

    // 4. Crear aristas entre ejercicios consecutivos
    const edges: GraphEdge[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
        type: 'muscle-group',
        weight: i + 1,
      });
    }

    const metadata = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      graphType: 'Ruta Óptima (Secuencia de Rutina)',
      rutinaId: rutina._id.toString(),
      rutinaNombre: rutina.nombre,
      totalXP: rutina.xpTotalEstimado || nodes.reduce((sum, n) => sum + n.estimuloXP, 0),
      totalTime: rutina.tiempoTotal || nodes.reduce((sum, n) => sum + n.costoTiempo, 0),
      totalFatigue: rutina.fatigaTotal || nodes.reduce((sum, n) => sum + n.costoFatiga, 0),
      generatedAt: new Date(),
    };

    this.logger.log(`Rutina visualizada: ${nodes.length} ejercicios de "${rutina.nombre}"`);

    return { nodes, edges, metadata };
  }

  /**
   * Genera un formato Graphviz DOT para visualización en herramientas externas
   * (puede usarse con Graphviz Online, Gephi, etc.)
   * 
   * @param userId - ID del usuario (opcional)
   * @param muscleGroup - Filtro por grupo muscular (opcional)
   * @param maxLevel - Nivel máximo a mostrar (opcional)
   * @param limit - Límite de nodos a mostrar (default: 30)
   */
  async exportToDot(userId?: string, muscleGroup?: string, maxLevel?: number, limit: number = 30): Promise<string> {
    this.logger.log('Exportando grafo a formato DOT...');

    const visualization = userId 
      ? await this.visualizeUserGraph(userId, false)
      : await this.visualizeFullGraph();

    // Filtrar nodos según parámetros
    let filteredNodes = visualization.nodes;
    
    if (muscleGroup) {
      const normalizedGroup = muscleGroup.toLowerCase();
      filteredNodes = filteredNodes.filter(node => 
        node.bodyParts.some(bp => bp.toLowerCase().includes(normalizedGroup)) ||
        node.targetMuscles.some(tm => tm.toLowerCase().includes(normalizedGroup))
      );
      this.logger.log(`Filtrado por grupo muscular '${muscleGroup}': ${filteredNodes.length} nodos`);
    }

    if (maxLevel) {
      filteredNodes = filteredNodes.filter(node => node.levelRequired <= maxLevel);
      this.logger.log(`Filtrado por nivel ≤ ${maxLevel}: ${filteredNodes.length} nodos`);
    }

    // Limitar cantidad de nodos para evitar "memory access out of bounds"
    if (filteredNodes.length > limit) {
      // Ordenar por eficiencia y tomar los mejores
      filteredNodes = filteredNodes
        .sort((a, b) => b.eficienciaRatio - a.eficienciaRatio)
        .slice(0, limit);
      this.logger.log(`Limitado a ${limit} ejercicios más eficientes`);
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    
    // Filtrar aristas que conecten solo nodos visibles
    const filteredEdges = visualization.edges.filter(edge => 
      filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to)
    );

    // Mapa de colores por grupo muscular
    const muscleColors: Record<string, string> = {
      'chest': '#FFB6C1',      // Rosa claro
      'back': '#87CEEB',       // Azul cielo
      'shoulders': '#FFD700',  // Dorado
      'legs': '#90EE90',       // Verde claro
      'arms': '#DDA0DD',       // Ciruela
      'biceps': '#DDA0DD',     // Ciruela
      'triceps': '#DDA0DD',    // Ciruela
      'core': '#FFA07A',       // Salmón
      'waist': '#FFA07A',      // Salmón
      'cardio': '#F0E68C',     // Khaki
      'upper legs': '#90EE90', // Verde claro
      'lower legs': '#98FB98', // Verde pálido
      'neck': '#F5DEB3',       // Trigo
      'upper arms': '#DDA0DD', // Ciruela
      'lower arms': '#E6E6FA', // Lavanda
    };

    let dot = 'digraph ExerciseGraph {\n';
    dot += '  // Configuración general (optimizado para grafos grandes)\n';
    dot += '  rankdir=LR;\n'; // Left to Right es más eficiente
    dot += '  splines=true;\n'; // Líneas curvas simples
    dot += '  nodesep=0.5;\n'; // Separación reducida
    dot += '  ranksep=0.8;\n'; // Separación reducida
    dot += '  node [shape=box, style="rounded,filled", fontname="Arial", fontsize=9];\n';
    dot += '  edge [fontname="Arial", fontsize=7];\n';
    dot += `  label="Grafo de Ejercicios (${filteredNodes.length} nodos, ${filteredEdges.length} aristas)";\n`;
    dot += '  labelloc="t";\n\n';

    // Versión simplificada: sin subgrafos para evitar complejidad
    for (const node of filteredNodes) {
      const muscleGroup = node.bodyParts[0] || node.targetMuscles[0] || 'otros';
      const isUnlocked = userId ? (visualization as UserGraphVisualization).unlockedNodes.includes(node.id) : true;
      const nodeColor = isUnlocked ? muscleColors[muscleGroup.toLowerCase()] || '#87CEEB' : '#D3D3D3';
      
      // Label compacto
      const label = `${node.name}\\nXP:${node.estimuloXP.toFixed(0)} T:${node.costoTiempo}m F:${node.costoFatiga.toFixed(0)}\\nRatio:${node.eficienciaRatio.toFixed(2)} Lvl:${node.levelRequired}`;
      
      dot += `  "${node.id}" [label="${label}", fillcolor="${nodeColor}"];\n`;
    }

    dot += '\n  // Aristas (relaciones entre ejercicios)\n';
    for (const edge of filteredEdges) {
      let style = 'solid';
      let color = '#000000';
      let penwidth = '1.5';
      let label = '';
      
      if (edge.type === 'prerequisite') {
        style = 'solid';
        color = '#FF0000'; // Rojo para prerequisites
        penwidth = '2';
        label = 'req';
      } else if (edge.type === 'unlocks') {
        style = 'dashed';
        color = '#0000FF'; // Azul para unlocks
        penwidth = '1.5';
        label = 'unlock';
      } else if (edge.type === 'muscle-group') {
        style = 'dotted';
        color = '#808080'; // Gris para progresión de grupo muscular
        penwidth = '1';
        label = '';
      }
      
      dot += `  "${edge.from}" -> "${edge.to}" [style="${style}", color="${color}", penwidth=${penwidth}, label="${label}"];\n`;
    }

    // Agregar leyenda de aristas
    dot += '\n  // Leyenda\n';
    dot += `  label="\\n\\n━━━ Prerequisito (rojo) | ─ ─ ─ Desbloquea (azul) | ····· Progresión de nivel (gris)\\nTotal: ${filteredNodes.length} ejercicios, ${filteredEdges.length} conexiones";\n`;
    dot += '  labelloc="b";\n';
    dot += '  fontsize=12;\n';

    dot += '}\n';

    this.logger.log(`Exportación DOT completada: ${filteredNodes.length} nodos, ${filteredEdges.length} aristas`);
    
    return dot;
  }

  /**
   * Genera un formato JSON simple para visualización en D3.js o vis.js
   */
  async exportToJSON(userId?: string): Promise<any> {
    this.logger.log('Exportando grafo a formato JSON (D3/Vis.js)...');

    const visualization = userId 
      ? await this.visualizeUserGraph(userId, true)
      : await this.visualizeFullGraph();

    const json = {
      nodes: visualization.nodes.map(node => ({
        id: node.id,
        label: node.name,
        title: `XP: ${node.estimuloXP}, Tiempo: ${node.costoTiempo}m, Fatiga: ${node.costoFatiga}`,
        group: node.bodyParts[0] || 'unknown',
        value: node.estimuloXP, // Tamaño del nodo proporcional al XP
        level: node.levelRequired,
      })),
      edges: visualization.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        arrows: 'to',
        label: edge.type,
        dashes: edge.type !== 'prerequisite',
      })),
      metadata: visualization.metadata,
    };

    if (userId) {
      json['userInfo'] = (visualization as UserGraphVisualization).userInfo;
      json['optimalPath'] = (visualization as UserGraphVisualization).optimalPath;
    }

    this.logger.log('Exportación JSON completada');
    
    return json;
  }

  // ========== MÉTODOS AUXILIARES ==========

  private calculateMuscleGroupStats(nodes: GraphNodeVisualization[]): {
    group: string;
    exerciseCount: number;
    avgXP: number;
    avgTime: number;
    avgFatigue: number;
  }[] {
    const groups = new Map<string, GraphNodeVisualization[]>();

    for (const node of nodes) {
      const primaryMuscle = node.bodyParts[0] || node.targetMuscles[0] || 'unknown';
      if (!groups.has(primaryMuscle)) {
        groups.set(primaryMuscle, []);
      }
      groups.get(primaryMuscle)!.push(node);
    }

    return Array.from(groups.entries()).map(([group, exercises]) => ({
      group,
      exerciseCount: exercises.length,
      avgXP: exercises.reduce((sum, e) => sum + e.estimuloXP, 0) / exercises.length,
      avgTime: exercises.reduce((sum, e) => sum + e.costoTiempo, 0) / exercises.length,
      avgFatigue: exercises.reduce((sum, e) => sum + e.costoFatiga, 0) / exercises.length,
    }));
  }

  private calculateLevelDistribution(nodes: GraphNodeVisualization[]): {
    level: number;
    exerciseCount: number;
  }[] {
    const levels = new Map<number, number>();

    for (const node of nodes) {
      const level = node.levelRequired;
      levels.set(level, (levels.get(level) || 0) + 1);
    }

    return Array.from(levels.entries())
      .map(([level, count]) => ({ level, exerciseCount: count }))
      .sort((a, b) => a.level - b.level);
  }

  private calculateEfficiencyStats(nodes: GraphNodeVisualization[]): {
    maxEfficiency: number;
    minEfficiency: number;
    avgEfficiency: number;
    topExercises: { name: string; ratio: number; }[];
  } {
    const ratios = nodes.map(n => n.eficienciaRatio).filter(r => r > 0);
    
    const maxEfficiency = Math.max(...ratios);
    const minEfficiency = Math.min(...ratios);
    const avgEfficiency = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;

    const topExercises = nodes
      .sort((a, b) => b.eficienciaRatio - a.eficienciaRatio)
      .slice(0, 10)
      .map(n => ({ name: n.name, ratio: n.eficienciaRatio }));

    return {
      maxEfficiency,
      minEfficiency,
      avgEfficiency,
      topExercises,
    };
  }

  private determinarPerfilUsuario(srpg: number): { 
    perfil: string; 
    frecuenciaMin: number;
    frecuenciaMax: number;
    rir: number; 
  } {
    if (srpg <= 35) {
      return { perfil: 'Básico', frecuenciaMin: 2, frecuenciaMax: 3, rir: 3 };
    } else if (srpg <= 65) {
      return { perfil: 'Intermedio', frecuenciaMin: 3, frecuenciaMax: 4, rir: 2 };
    } else {
      return { perfil: 'Avanzado', frecuenciaMin: 4, frecuenciaMax: 5, rir: 1 };
    }
  }

  /**
   * Genera un reporte en texto plano con toda la información del grafo
   */
  async generateTextReport(userId?: string): Promise<string> {
    const visualization = userId 
      ? await this.visualizeUserGraph(userId, true)
      : await this.visualizeFullGraph();

    let report = '═══════════════════════════════════════════════════════════════\n';
    report += '        VISUALIZACIÓN DEL GRAFO DE EJERCICIOS\n';
    report += '═══════════════════════════════════════════════════════════════\n\n';

    // Metadata
    report += '📊 INFORMACIÓN DEL GRAFO:\n';
    report += `   Tipo: ${visualization.metadata.graphType}\n`;
    report += `   Total de Nodos: ${visualization.metadata.totalNodes}\n`;
    report += `   Total de Aristas: ${visualization.metadata.totalEdges}\n`;
    report += `   Algoritmos Usados:\n`;
    for (const algo of visualization.metadata.algorithmsUsed) {
      report += `     - ${algo}\n`;
    }
    report += `   Generado: ${visualization.metadata.generatedAt.toLocaleString()}\n\n`;

    // User Info (si aplica)
    if (userId) {
      const userViz = visualization as UserGraphVisualization;
      report += '👤 INFORMACIÓN DEL USUARIO:\n';
      report += `   ID: ${userViz.userInfo.userId}\n`;
      report += `   Nivel: ${userViz.userInfo.level}\n`;
      report += `   Stamina: ${userViz.userInfo.stamina}\n`;
      report += `   SRPG: ${userViz.userInfo.srpg} (Perfil: ${userViz.userInfo.perfil})\n`;
      report += `   Ejercicios Completados: ${userViz.userInfo.completedExercises}\n`;
      report += `   Nodos Desbloqueados: ${userViz.unlockedNodes.length}\n`;
      report += `   Nodos Bloqueados: ${userViz.lockedNodes.length}\n\n`;

      if (userViz.optimalPath) {
        report += '🎯 RUTA ÓPTIMA CALCULADA:\n';
        report += `   Ejercicios: ${userViz.optimalPath.nodes.length}\n`;
        report += `   XP Total: ${userViz.optimalPath.totalXP.toFixed(2)}\n`;
        report += `   Tiempo Total: ${userViz.optimalPath.totalTime.toFixed(1)} minutos\n`;
        report += `   Fatiga Total: ${userViz.optimalPath.totalFatigue.toFixed(2)}\n\n`;
      }
    }

    // Estadísticas de eficiencia
    report += '⚡ ESTADÍSTICAS DE EFICIENCIA:\n';
    report += `   Máxima: ${visualization.efficiencyStats.maxEfficiency.toFixed(3)}\n`;
    report += `   Mínima: ${visualization.efficiencyStats.minEfficiency.toFixed(3)}\n`;
    report += `   Promedio: ${visualization.efficiencyStats.avgEfficiency.toFixed(3)}\n\n`;
    report += '   Top 10 Ejercicios Más Eficientes:\n';
    for (let i = 0; i < visualization.efficiencyStats.topExercises.length; i++) {
      const ex = visualization.efficiencyStats.topExercises[i];
      report += `   ${i + 1}. ${ex.name} (${ex.ratio.toFixed(3)})\n`;
    }
    report += '\n';

    // Estadísticas por grupo muscular
    report += '💪 ESTADÍSTICAS POR GRUPO MUSCULAR:\n';
    for (const stat of visualization.muscleGroupStats) {
      report += `   ${stat.group}:\n`;
      report += `     - Ejercicios: ${stat.exerciseCount}\n`;
      report += `     - XP Promedio: ${stat.avgXP.toFixed(2)}\n`;
      report += `     - Tiempo Promedio: ${stat.avgTime.toFixed(1)}m\n`;
      report += `     - Fatiga Promedio: ${stat.avgFatigue.toFixed(2)}\n`;
    }
    report += '\n';

    // Distribución por niveles
    report += '📈 DISTRIBUCIÓN POR NIVELES:\n';
    for (const dist of visualization.levelDistribution) {
      report += `   Nivel ${dist.level}: ${dist.exerciseCount} ejercicios\n`;
    }
    report += '\n';

    // Lista de nodos
    report += '📝 TODOS LOS NODOS DEL GRAFO:\n';
    report += '─────────────────────────────────────────────────────────────\n';
    for (const node of visualization.nodes) {
      const isUnlocked = userId ? (visualization as UserGraphVisualization).unlockedNodes.includes(node.id) : true;
      const status = isUnlocked ? '✅' : '🔒';
      
      report += `${status} [${node.externalId}] ${node.name}\n`;
      report += `   Costo Tiempo: ${node.costoTiempo}m | Fatiga: ${node.costoFatiga.toFixed(1)} | XP: ${node.estimuloXP.toFixed(1)}\n`;
      report += `   Ratio Eficiencia: ${node.eficienciaRatio.toFixed(3)}\n`;
      report += `   Nivel Requerido: ${node.levelRequired}\n`;
      report += `   Músculos: ${node.targetMuscles.join(', ') || 'N/A'}\n`;
      report += `   Partes del Cuerpo: ${node.bodyParts.join(', ') || 'N/A'}\n`;
      report += `   Equipamiento: ${node.equipment.join(', ') || 'N/A'}\n`;
      report += `   Prerequisites: ${node.prerequisites.length > 0 ? node.prerequisites.join(', ') : 'Ninguno'}\n`;
      report += `   Desbloquea: ${node.unlocks.length > 0 ? node.unlocks.join(', ') : 'Ninguno'}\n`;
      report += `   Atributos RPG: STR=${node.muscleTargets.STR.toFixed(2)}, AGI=${node.muscleTargets.AGI.toFixed(2)}, ` +
                `STA=${node.muscleTargets.STA.toFixed(2)}, INT=${node.muscleTargets.INT.toFixed(2)}, ` +
                `DEX=${node.muscleTargets.DEX.toFixed(2)}, END=${node.muscleTargets.END.toFixed(2)}\n`;
      report += '─────────────────────────────────────────────────────────────\n';
    }

    report += '\n═══════════════════════════════════════════════════════════════\n';
    report += '                  FIN DEL REPORTE\n';
    report += '═══════════════════════════════════════════════════════════════\n';

    return report;
  }
}
