import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { RateLimitModule } from './common/rate-limit/rate-limit.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { type Env, validateEnv } from './config/env.js';
import * as schema from './db/schema.js';
import { EventsModule } from './events/events.module.js';
import { FoodsModule } from './foods/foods.module.js';
import { GenresModule } from './genres/genres.module.js';
import { InquiriesModule } from './inquiries/inquiries.module.js';
import { RegionsModule } from './regions/regions.module.js';
import { RestaurantsModule } from './restaurants/restaurants.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { SharesModule } from './shares/shares.module.js';
import { TerritoriesModule } from './territories/territories.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        drizzle,
        connection: config.get('DATABASE_URL', { infer: true }),
        schema,
      }),
    }),
    RateLimitModule,
    AuthModule,
    ProfilesModule,
    AccountModule,
    RegionsModule,
    RestaurantsModule,
    GenresModule,
    EventsModule,
    FoodsModule,
    InquiriesModule,
    ReviewsModule,
    SharesModule,
    TerritoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
