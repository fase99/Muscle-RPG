import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { RutinasModule } from './rutinas/rutinas.module';
import { ExercisesModule } from './exercises/exercises.module';
import { AuthModule } from './auth/auth.module';
import { Connection } from 'mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI!, {
      dbName: 'muscleRPG',
    }),
    AuthModule,
    UsersModule,
    RutinasModule,
    ExercisesModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(@InjectConnection() private connection: Connection) {}

  onModuleInit() {
    if (!process.env.MONGODB_URI) {
      console.error('❌ ERROR: MONGODB_URI no está configurado en .env');
      process.exit(1);
    }
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔗 MongoDB Atlas URI:', mongoUri.replace(/:[^:@]+@/, ':****@'));
    
    this.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });
    
    this.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
  }
}
