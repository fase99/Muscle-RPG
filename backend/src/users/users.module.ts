import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { profilingService } from './profiling.services';
import { Profile, ProfileSchema } from '../schemas/profile.schema';
import { Achievement, AchievementSchema } from '../schemas/achievement.schema';
import { AchievementsService } from './achievements.service';
import { RutinasModule } from '../rutinas/rutinas.module';

@Module({
    imports: [
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Profile.name, schema: ProfileSchema },
          { name: Achievement.name, schema: AchievementSchema },
        ]),
        forwardRef(() => RutinasModule),
    ],
    controllers: [UsersController],
    providers: [UsersService, profilingService, AchievementsService],
    exports: [UsersService, AchievementsService],
})
export class UsersModule { }
