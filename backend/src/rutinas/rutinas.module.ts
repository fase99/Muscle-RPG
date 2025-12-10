import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RutinasService } from './rutinas.service';
import { RutinasController } from './rutinas.controller';
import { Rutina, RutinaSchema } from '../schemas/rutina.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rutina.name, schema: RutinaSchema }]),
  ],
  controllers: [RutinasController],
  providers: [RutinasService],
  exports: [RutinasService],
})
export class RutinasModule {}
