import { Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as fetch from 'node-fetch';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { HttpRequestOptions } from 'src/common/common.interfaces';
import {
  databaseNotFoundError,
  emptyTicketTypeError,
  idFieldNotFoundError,
  invalidTicketTypeFieldError,
  ticketTypeFieldNotFoundError,
  unexpectedError,
} from './notion.error';
import {
  AppendBlockChildren,
  ComputedDatabase,
  GetTicketTypeIDCountOutput,
  NotionModuleOptions,
  QueryDatabaseProps,
  RawBlockDataProps,
  RawDatabaseDataProps,
  RawDatabaseProps,
  RawPageProps,
  Status,
} from './notion.interfaces';

const NOTION_API = 'https://api.notion.com';
let updateLock = false;

const makePrUrlMention = (prUrl: string): AppendBlockChildren[] => [
  {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: 'Mentioned in: ',
            link: null,
          },
          plain_text: 'Mentioned in: ',
        },
        {
          type: 'text',
          text: {
            content: prUrl,
            link: {
              type: 'url',
              url: prUrl,
            },
          },
          href: prUrl,
          plain_text: prUrl,
        },
      ],
    },
  },
];
@Injectable()
export class NotionService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: NotionModuleOptions,
  ) {}

  async authRequest(
    path: string,
    { method = 'GET', body, headers }: HttpRequestOptions,
  ) {
    try {
      const rawData = await fetch(`${NOTION_API}${path}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${this.options.notionSecret}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-02-22',
          ...headers,
        },
      });
      const jsonData = await rawData.json();
      return jsonData;
    } catch (error) {
      return error;
    }
  }

  async appendBlockChildren(blockId: string, children: AppendBlockChildren[]) {
    return await this.authRequest(`/v1/blocks/${blockId}/children`, {
      method: 'PATCH',
      body: {
        children,
      },
    });
  }

  async findPageByTicketRef(databaseId: string, ticketRef: string) {
    const { ticketRefField } = this.options;
    const page = await this.queryDatabaseData(databaseId, {
      filter: {
        property: ticketRefField,
        formula: {
          string: { equals: ticketRef },
        },
      },
    });
    return page;
  }

  async getBlockChildren(
    blockOrPageId: string,
  ): Promise<RawBlockDataProps | undefined> {
    return await this.authRequest(`/v1/blocks/${blockOrPageId}/children`, {});
  }

  async getDatabase(databaseId: string): Promise<RawDatabaseProps | undefined> {
    const database = await this.authRequest(`/v1/databases/${databaseId}`, {});
    return database;
  }

  async getPage(pageId: string): Promise<RawPageProps | undefined> {
    return await this.authRequest(`/v1/pages/${pageId}`, {});
  }

  getStatus(status: Status): string | undefined {
    const { ticketStatus } = this.options;
    return ticketStatus?.[status];
  }

  async getTicketsOfType(
    databaseId: string,
    ticketType: string,
    cursor = null,
  ) {
    const { ticketTypeField, ticketIdField } = this.options;
    const database = await this.queryDatabaseData(databaseId, {
      filter: {
        and: [
          {
            property: ticketTypeField,
            select: { equals: ticketType },
          },
          {
            property: ticketIdField,
            number: { is_empty: true },
          },
        ],
      },
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
      ...(typeof cursor === 'string' ? { start_cursor: cursor } : {}),
    });
    return database;
  }

  async getTicketTypeIDCount(
    databaseId: string,
    ticketType: string,
  ): Promise<GetTicketTypeIDCountOutput> {
    try {
      const { ticketTypeField, ticketIdField } = this.options;
      const database = await this.queryDatabaseData(databaseId, {
        filter: {
          and: [
            {
              property: ticketTypeField,
              select: { equals: ticketType },
            },
            {
              property: ticketIdField,
              number: { is_not_empty: true },
            },
          ],
        },
        sorts: [{ property: ticketIdField, direction: 'descending' }],
        page_size: 1,
      });
      if (!database || !database.results) {
        return databaseNotFoundError;
      }

      if (database.results.length === 0) {
        return { count: 0 };
      }
      // latest ticket
      const { properties } = database.results[0];
      if (!properties) {
        throw new Error('Properties field should exist! Error from Notion.');
      }
      const idField = properties[ticketIdField];
      if (!idField) return idFieldNotFoundError;
      if (!idField.number) return invalidTicketTypeFieldError;
      return { count: idField.number };
    } catch (error) {
      console.log(error);
      return unexpectedError;
    }
  }

  async listTicketsOfType(
    databaseId: string,
    ticketType: string,
  ): Promise<RawPageProps[]> {
    let cursor = null;
    let hasMore = true;
    let allTickets = [];
    while (hasMore) {
      const list = await this.getTicketsOfType(databaseId, ticketType, cursor);
      if (!list)
        throw new Error(
          `[Database not found] Database ID: ${databaseId} | Ticket Type: ${ticketType}`,
        );
      allTickets = [...allTickets, ...list.results];
      cursor = list.next_cursor;
      hasMore = list.has_more;
    }
    return allTickets;
  }

  async queryDatabaseData(
    databaseId: string,
    queryParams: QueryDatabaseProps,
  ): Promise<RawDatabaseDataProps | undefined> {
    const database = await this.authRequest(
      `/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        body: queryParams,
      },
    );
    return database;
  }

  async updatePage(pageId: string, properties: any) {
    await this.authRequest(`/v1/pages/${pageId}`, {
      method: 'PATCH',
      body: { properties },
    });
  }

  async updateTicketStatus(pageId: string, status: Status): Promise<void> {
    const { manageStatus, ticketStatusField } = this.options;
    const statusString = this.getStatus(status);
    console.log(statusString);
    if (!manageStatus || !statusString || !ticketStatusField) return;
    const page = await this.getPage(pageId);
    const statusObj = page.properties?.[ticketStatusField];
    // must be a select type
    if (statusObj?.select) {
      console.log(statusObj.select);
    }
  }

  async updateTicketWithPR(ticketRef: string, prUrl: string): Promise<void> {
    const { notionDatabaseId, ticketPrLinkField } = this.options;
    const { results } = await this.findPageByTicketRef(
      notionDatabaseId,
      ticketRef,
    );

    const isSameUrl = (url: string | null): boolean =>
      Boolean(url) && url.toLowerCase() === prUrl.toLowerCase();

    if (results) {
      for (let i = 0; i < results.length; i++) {
        const { id, properties } = results[i];
        this.updateTicketStatus(id, Status.IN_PROGRESS);
        const defaultPrLink = properties[ticketPrLinkField]?.url;
        if (defaultPrLink === null) {
          await this.updatePage(id, { [ticketPrLinkField]: { url: prUrl } });
        } else {
          // already mentioned in PR Link property
          if (isSameUrl(defaultPrLink)) return;
          const { results: blocks } = await this.getBlockChildren(id);
          let mentioned = false;
          if (blocks) {
            blocks.forEach((block) => {
              const textArray = block[block.type]?.rich_text;
              if (textArray)
                textArray.forEach(({ href, text }) => {
                  if (isSameUrl(href) || isSameUrl(text?.link?.url))
                    mentioned = true;
                });
            });
            if (!mentioned) {
              mentioned = true;
              console.log('wtv');
              this.appendBlockChildren(id, makePrUrlMention(prUrl));
            }
          }
        }
      }
    }
  }

  async updateTicketsWithType(
    databaseId: string,
    ticketType: string,
    count: number,
  ) {
    const allTickets = await this.listTicketsOfType(databaseId, ticketType);
    if (allTickets.length === 0) {
      console.log(`[Ticket Type: ${ticketType}] No ticket to update!`);
      return;
    }
    console.log(
      `[Ticket Type: ${ticketType}] ${allTickets.length} ticket(s) to update.`,
    );
    const { ticketIdField } = this.options;
    for (let i = 0; i < allTickets.length; i++) {
      const newId = i + count + 1;
      const ticket = allTickets[i];
      await this.updatePage(ticket.id, {
        [ticketIdField]: { number: newId },
      });
    }
  }

  async validateDatabase(): Promise<ComputedDatabase> {
    try {
      const { notionDatabaseId, ticketTypeField } = this.options;
      const rawDatabase = await this.getDatabase(notionDatabaseId);
      if (!rawDatabase || !rawDatabase.properties) return databaseNotFoundError;
      const rawTags = rawDatabase.properties[ticketTypeField];
      if (!rawTags) return ticketTypeFieldNotFoundError;
      if (!rawTags.select) return invalidTicketTypeFieldError;

      const { options } = rawTags.select;
      if (!options || options.length <= 0) return emptyTicketTypeError;
      const tags = [];
      for (let i = 0; i < options.length; i++) {
        const { name } = options[i];
        tags.push(name);
      }
      return {
        database: { tags },
      };
    } catch (error) {
      console.log(error);
      return unexpectedError;
    }
  }

  @Interval(30000)
  async updateTaskIds() {
    let started = false;
    try {
      if (updateLock) {
        console.log('Skip update. Previous process still running!');
        return;
      }
      updateLock = true;
      started = true;
      const { notionDatabaseId } = this.options;

      const { database, error: validateDatabaseError } =
        await this.validateDatabase();
      if (validateDatabaseError) throw new Error(validateDatabaseError);
      if (!database) throw new Error('Database not found!');

      const { tags } = database;
      const tagsCount = {};
      for (let i = 0; i < tags.length; i++) {
        const { count, error: ticketTypeIdCountError } =
          await this.getTicketTypeIDCount(notionDatabaseId, tags[i]);
        if (ticketTypeIdCountError) throw new Error(ticketTypeIdCountError);
        tagsCount[tags[i]] = count;
      }
      if (tags.length === 0) throw new Error('No tags count.');
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        await this.updateTicketsWithType(notionDatabaseId, tag, tagsCount[tag]);
      }
    } catch (error) {
      console.log(error);
    } finally {
      if (started) {
        console.log('Task ID update complete');
        updateLock = false;
      }
    }
  }
}
