import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { RutinasService } from './rutinas.service';

@Controller('rutinas')
export class RutinasController {
  constructor(private readonly rutinasService: RutinasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRutinaDto: any) {
    return this.rutinasService.create(createRutinaDto);
  }

  @Get()
  findAll() {
    return this.rutinasService.findAll();
  }

  @Get('user/:usuarioId')
  findByUser(@Param('usuarioId') usuarioId: string) {
    return this.rutinasService.findByUser(usuarioId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rutinasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRutinaDto: any) {
    return this.rutinasService.update(id, updateRutinaDto);
  }

  @Patch(':id/ejercicio/:index')
  marcarEjercicioCompletado(
    @Param('id') id: string,
    @Param('index') index: string,
    @Body() body: { completado: boolean },
  ) {
    return this.rutinasService.marcarEjercicioCompletado(
      id,
      parseInt(index),
      body.completado,
    );
  }

  @Patch(':id/completar')
  marcarRutinaCompletada(@Param('id') id: string) {
    return this.rutinasService.marcarRutinaCompletada(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.rutinasService.remove(id);
  }
}
