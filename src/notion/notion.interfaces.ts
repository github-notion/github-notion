export interface NotionModuleOptions {
  notionSecret: string;
  notionDatabaseId: string;
  ticketTypeField: string;
  ticketIdField: string;
  ticketRefField: string;
}

export interface SortCriteriaObject {
  /** The name of the property to sort against. */
  property?: string;
  /** The name of the timestamp to sort against. Possible values include "created_time" and "last_edited_time". */
  timestamp?: 'created_time' | 'last_edited_time';
  /** The direction to sort. Possible values include "ascending" and "descending". */
  direction: 'ascending' | 'descending';
}

export interface QueryDatabaseProps {
  /** When supplied, limits which pages are returned based on the filter conditions. */
  filter?: any;
  /** When supplied, orders the results based on the provided sort criteria. */
  sorts?: SortCriteriaObject[];
  /** When supplied, returns a page of results starting after the cursor provided. If not supplied, this endpoint will return the first page of results. */
  start_cursor?: string;
  /** The number of items from the full list desired in the response. Maximum: 100 */
  page_size?: number;
}

export interface ComputedDatabase {
  database?: {
    tags: string[];
  };
  error?: string;
}

export interface GetTicketTypeIDCountOutput {
  count?: number;
  error?: string;
}

export interface TitleProps {
  type: 'text';
  text: any[];
  annotations: any[];
  plain_text: string;
  href: string | null;
}

export interface RawDatabaseProps {
  object: 'database';
  id: string;
  created_time: Date;
  last_edited_time: Date;
  title: TitleProps[];
  properties: any;
  url: string;
}

export interface RawPageProps {
  object: 'page';
  id: string;
  created_time: Date;
  last_edited_time: Date;
  parent: any[];
  archived: boolean;
  properties: any[];
  url: string;
}

export interface RawDatabaseDataProps {
  object: 'list';
  results: RawPageProps[];
  next_cursor: number | null;
  has_more: boolean;
}
