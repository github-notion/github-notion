import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { NotionModule } from 'src/notion/notion.module';

@Module({
  imports: [NotionModule],
  providers: [GithubService],
  controllers: [GithubController],
})
export class GithubModule {}
