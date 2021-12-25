import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { NotionModuleOptions } from './notion.interfaces';
import { NotionService } from './notion.service';

@Controller('notion')
export class NotionController {
  constructor(
    private readonly notionService: NotionService,
    @Inject(CONFIG_OPTIONS) private readonly options: NotionModuleOptions,
  ) {}

  @Get('ticket/:ticketRef')
  async redirectFromTicketRef(@Param() params, @Res() res) {
    const { notionDatabaseId } = this.options;
    const { ticketRef } = params;
    const page = await this.notionService.findPageByTicketRef(
      notionDatabaseId,
      ticketRef,
    );
    if (!page || !page.results || page.results.length === 0) {
      res.status(404).send('Ticket not found!');
      return;
    }
    const { url } = page.results[0];
    res.redirect(url);
  }
}
