import { DynamicModule, Module } from '@nestjs/common';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { NotionController } from './notion.controller';
import { NotionModuleOptions } from './notion.interfaces';
import { NotionService } from './notion.service';

@Module({})
export class NotionModule {
  static forRoot(options: NotionModuleOptions): DynamicModule {
    return {
      module: NotionModule,
      controllers: [NotionController],
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: options,
        },
        NotionService,
      ],
    };
  }
}
