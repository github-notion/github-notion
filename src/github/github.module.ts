import { DynamicModule, Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { GithubModuleOptions } from './github.interfaces';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { NotionModule } from '../notion/notion.module';

@Module({})
export class GithubModule {
  static forRoot(options: GithubModuleOptions): DynamicModule {
    return {
      module: GithubModule,
      controllers: [GithubController],
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: options,
        },
        GithubService,
      ],
      imports: [NotionModule],
    };
  }
}
