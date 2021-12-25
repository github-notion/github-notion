import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { NotionModule } from './notion/notion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.dev',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production').required(),
        NOTION_SECRET: Joi.string().required(),
        NOTION_DATABASE_ID: Joi.string().required(),
        TICKET_TYPE_FIELD: Joi.string().required(),
        TICKET_ID_FIELD: Joi.string().required(),
        TICKET_REF_FIELD: Joi.string().required(),
      }),
    }),
    NotionModule.forRoot({
      notionSecret: process.env.NOTION_SECRET,
      notionDatabaseId: process.env.NOTION_DATABASE_ID,
      ticketTypeField: process.env.TICKET_TYPE_FIELD,
      ticketIdField: process.env.TICKET_ID_FIELD,
      ticketRefField: process.env.TICKET_REF_FIELD,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
