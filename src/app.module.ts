import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresentationModule } from './presentation/presentation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      entitySkipConstructor: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
    }),
    PresentationModule,
  ],
})
export class AppModule {}
