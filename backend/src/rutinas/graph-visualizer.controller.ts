import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GraphVisualizerService, GraphVisualizationData, UserGraphVisualization } from './graph-visualizer.service';

/**
 * CONTROLADOR DE VISUALIZACIÓN DEL GRAFO
 * 
 * Endpoints para visualizar el grafo de ejercicios completo o específico de un usuario.
 * Soporta múltiples formatos de exportación: JSON, DOT (Graphviz), y reportes de texto.
 */
@Controller('graph')
export class GraphVisualizerController {
  constructor(private readonly graphVisualizer: GraphVisualizerService) {}

  /**
   * GET /graph/visualize
   * Visualiza el grafo completo de ejercicios (todos los nodos y aristas)
   * 
   * Respuesta:
   * {
   *   metadata: { totalNodes, totalEdges, graphType, algorithmsUsed, generatedAt },
   *   nodes: [ { id, name, costos, muscleTargets, prerequisites, unlocks, ... } ],
   *   edges: [ { from, to, type, weight } ],
   *   muscleGroupStats: [...],
   *   levelDistribution: [...],
   *   efficiencyStats: {...}
   * }
   */
  @Get('visualize')
  async visualizeFullGraph(): Promise<GraphVisualizationData> {
    return await this.graphVisualizer.visualizeFullGraph();
  }

  /**
   * GET /graph/visualize/:userId
   * Visualiza el grafo específico para un usuario
   * Muestra qué nodos están desbloqueados/bloqueados y la ruta óptima
   * 
   * Query params:
   * - includeOptimalPath (boolean): Calcular ruta óptima (default: true)
   * - maxTime (number): Límite de tiempo para la ruta óptima (default: 120)
   * 
   * Respuesta:
   * {
   *   ...visualización base...,
   *   userInfo: { userId, level, stamina, srpg, perfil, completedExercises },
   *   unlockedNodes: [...],
   *   lockedNodes: [...],
   *   optimalPath: { nodes, totalXP, totalTime, totalFatigue }
   * }
   */
  @Get('visualize/:userId')
  async visualizeUserGraph(
    @Param('userId') userId: string,
    @Query('includeOptimalPath') includeOptimalPath?: string,
    @Query('maxTime') maxTime?: string,
  ): Promise<UserGraphVisualization> {
    const includePath = includeOptimalPath !== 'false';
    const timeLimit = maxTime ? parseInt(maxTime) : 120;

    return await this.graphVisualizer.visualizeUserGraph(
      userId,
      includePath,
      timeLimit,
    );
  }

  /**
   * GET /graph/export/dot
   * Exporta el grafo completo en formato DOT (Graphviz)
   * 
   * Query params:
   * - muscleGroup: Filtrar por grupo muscular (ej: 'chest', 'back', 'legs')
   * - maxLevel: Nivel máximo a mostrar (ej: 3)
   * - limit: Límite de nodos (default: 30, evita "memory out of bounds")
   * 
   * Ejemplo: /graph/export/dot?muscleGroup=chest&maxLevel=3&limit=20
   */
  @Get('export/dot')
  async exportToDot(
    @Query('muscleGroup') muscleGroup?: string,
    @Query('maxLevel') maxLevel?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    const maxLevelNum = maxLevel ? parseInt(maxLevel) : undefined;
    const limitNum = limit ? parseInt(limit) : 30;
    
    const dot = await this.graphVisualizer.exportToDot(undefined, muscleGroup, maxLevelNum, limitNum);
    
    if (res) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="exercise-graph.dot"');
      return res.send(dot);
    }
    return dot;
  }

  /**
   * GET /graph/export/dot/:userId
   * Exporta el grafo de un usuario específico en formato DOT
   * 
   * Query params:
   * - muscleGroup: Filtrar por grupo muscular
   * - maxLevel: Nivel máximo a mostrar
   * - limit: Límite de nodos (default: 30)
   */
  @Get('export/dot/:userId')
  async exportUserToDot(
    @Param('userId') userId: string,
    @Query('muscleGroup') muscleGroup?: string,
    @Query('maxLevel') maxLevel?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    const maxLevelNum = maxLevel ? parseInt(maxLevel) : undefined;
    const limitNum = limit ? parseInt(limit) : 30;
    
    const dot = await this.graphVisualizer.exportToDot(userId, muscleGroup, maxLevelNum, limitNum);
    
    if (res) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="exercise-graph-user-${userId}.dot"`);
      return res.send(dot);
    }
    return dot;
  }

  /**
   * GET /graph/export/json
   * Exporta el grafo en formato JSON compatible con D3.js y Vis.js
   * 
   * Estructura:
   * {
   *   nodes: [ { id, label, title, group, value, level } ],
   *   edges: [ { from, to, arrows, label, dashes } ],
   *   metadata: {...}
   * }
   * 
   * Puede usarse directamente en librerías de visualización:
   * - D3.js Force Layout: https://d3js.org/
   * - Vis.js Network: https://visjs.org/
   */
  @Get('export/json')
  async exportToJSON() {
    return await this.graphVisualizer.exportToJSON();
  }

  /**
   * GET /graph/export/json/:userId
   * Exporta el grafo de un usuario específico en formato JSON
   * Incluye información de nodos desbloqueados y ruta óptima
   */
  @Get('export/json/:userId')
  async exportUserToJSON(@Param('userId') userId: string) {
    return await this.graphVisualizer.exportToJSON(userId);
  }

  /**
   * GET /graph/report
   * Genera un reporte completo en texto plano con toda la información del grafo
   * 
   * Incluye:
   * - Información del grafo (tipo, nodos, aristas, algoritmos)
   * - Estadísticas de eficiencia
   * - Estadísticas por grupo muscular
   * - Distribución por niveles
   * - Lista detallada de todos los nodos
   */
  @Get('report')
  async generateTextReport(@Res() res: Response) {
    const report = await this.graphVisualizer.generateTextReport();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="graph-report.txt"');
    return res.send(report);
  }

  /**
   * GET /graph/report/:userId
   * Genera un reporte personalizado para un usuario específico
   * 
   * Incluye toda la información del reporte base más:
   * - Información del usuario (nivel, stamina, SRPG, perfil)
   * - Nodos desbloqueados/bloqueados
   * - Ruta óptima calculada
   */
  @Get('report/:userId')
  async generateUserTextReport(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const report = await this.graphVisualizer.generateTextReport(userId);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="graph-report-user-${userId}.txt"`);
    return res.send(report);
  }
}
