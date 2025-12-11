import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RpgExerciseRule, RpgExerciseRuleSchema } from './schemas/rpg-exercise-rule.schema';
import { ExerciseDbService } from './exercisedb.service';
import { GraphBuilderService } from './graph-builder.service';
import { ExercisesController } from './exercises.controller';

@Module({
  imports: [
    // Registrar el schema de Mongoose
    MongooseModule.forFeature([
      { name: RpgExerciseRule.name, schema: RpgExerciseRuleSchema },
    ]),
    // HttpModule para hacer peticiones a ExerciseDB API
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [ExercisesController],
  providers: [ExerciseDbService, GraphBuilderService],
  exports: [ExerciseDbService, GraphBuilderService], // Exportar para usar en otros módulos
})
export class ExercisesModule {}
