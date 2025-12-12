import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RutinasService } from './rutinas.service';
import { RutinasController } from './rutinas.controller';
import { GraphOptimizerService } from './graph-optimizer.service';
import { DynamicProgrammingService } from './dynamic-programming.service';
import { Rutina, RutinaSchema } from '../schemas/rutina.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Profile, ProfileSchema } from '../schemas/profile.schema';
import { RpgExerciseRule, RpgExerciseRuleSchema } from '../exercises/schemas/rpg-exercise-rule.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Rutina.name, schema: RutinaSchema },
            { name: User.name, schema: UserSchema },
            { name: Profile.name, schema: ProfileSchema },
            { name: RpgExerciseRule.name, schema: RpgExerciseRuleSchema },
        ]),
    ],
    controllers: [RutinasController],
    providers: [
        RutinasService,
        GraphOptimizerService,
        DynamicProgrammingService,
    ],
    exports: [RutinasService],
})
export class RutinasModule { }
