import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { RutinasModule } from './rutinas/rutinas.module';
import { ExercisesModule } from './exercises/exercises.module';
import { Connection } from 'mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://admin:muscleRPG2025@localhost:27017/muscle_rpg?authSource=admin'),
    UsersModule,
    RutinasModule,
    ExercisesModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(@InjectConnection() private connection: Connection) {}

  onModuleInit() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:muscleRPG2025@localhost:27017/muscle_rpg?authSource=admin';
    console.log('🔗 MongoDB URI:', mongoUri.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    this.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });
    
    this.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
  }
}
