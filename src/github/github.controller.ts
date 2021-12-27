import { Body, Controller, Post, Req } from '@nestjs/common';

@Controller('github')
export class GithubController {
  @Post('/notion-webhook')
  webhookListener(@Req() req, @Body() body) {
    console.log(body);
  }
}
