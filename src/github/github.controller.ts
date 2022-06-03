import { Body, Controller, Post, Req } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}
  @Post('/notion-webhook')
  webhookListener(@Req() req, @Body() body) {
    if (body) {
      if (body.action === 'opened') {
        this.githubService.pullRequestOpened(body);
      }
    }
  }
}
