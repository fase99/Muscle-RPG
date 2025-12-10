import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { RutinasModule } from './rutinas/rutinas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://admin:muscleRPG2025@localhost:27017/muscle_rpg?authSource=admin'),
    UsersModule,
    RutinasModule,
  ],
})
export class AppModule {}
