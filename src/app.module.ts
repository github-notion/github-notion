import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { NotionModule } from './notion/notion.module';
import { GithubModule } from './github/github.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.dev',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validationSchema: Joi.object({
        DOMAIN: Joi.string().required(),
        GITHUB_USERNAME: Joi.string(),
        GITHUB_PERSONAL_ACCESS_TOKEN: Joi.string(),
        GITHUB_ORGANIZATION: Joi.string(),
        MANAGE_STATUS: Joi.boolean(),
        MANAGE_AUTOLINKS: Joi.boolean(),
        MANAGE_PUBLIC_REPO_AUTOLINKS: Joi.boolean(),
        NODE_ENV: Joi.string().valid('development', 'production').required(),
        NOTION_SECRET: Joi.string().required(),
        NOTION_DATABASE_ID: Joi.string().required(),
        TICKET_TYPE_FIELD: Joi.string().required(),
        TICKET_ID_FIELD: Joi.string().required(),
        TICKET_REF_FIELD: Joi.string().required(),
        TICKET_STATUSES: Joi.string().regex(
          /[0-9a-zA-Z]+(,[0-9a-zA-Z]+)+(,[0-9a-zA-Z]+)/,
        ),
      }),
    }),
    NotionModule.forRoot({
      notionSecret: process.env.NOTION_SECRET,
      notionDatabaseId: process.env.NOTION_DATABASE_ID,
      ticketTypeField: process.env.TICKET_TYPE_FIELD,
      ticketIdField: process.env.TICKET_ID_FIELD,
      ticketRefField: process.env.TICKET_REF_FIELD,
    }),
    GithubModule.forRoot({
      domain: process.env.DOMAIN,
      githubUsername: process.env.GITHUB_USERNAME,
      githubPersonalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
      githubOrganization: process.env.GITHUB_ORGANIZATION,
      manageStatus: process.env.MANAGE_STATUS === 'true',
      manageAutolinks: process.env.MANAGE_AUTOLINKS !== 'false',
      managePublicRepoAutolinks:
        process.env.MANAGE_PUBLIC_REPO_AUTOLINKS === 'true',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
