import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('/health-check')
  githubHealthCheck(@Res() res) {
    res.send('Github listener is up and running!');
  }

  @Post('/webhook')
  webhookListener(@Req() req, @Body() body) {
    if (body) {
      if (
        body.action === 'opened' ||
        body.action === 'reopened' ||
        body.action === 'synchronize'
      ) {
        this.githubService.pullRequestOpened(body);
      }
    }
  }
}
