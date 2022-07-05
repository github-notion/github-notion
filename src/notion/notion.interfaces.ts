export interface NotionModuleOptions {
  manageStatus: boolean;
  notionSecret: string;
  notionDatabaseId: string;
  ticketTypeField: string;
  ticketIdField: string;
  ticketRefField: string;
  ticketPrLinkField: string;
  ticketStatusField: string;
  ticketStatus?: string[];
}

export enum Status {
  TODO = 0,
  BLOCKED = 1,
  IN_PROGRESS = 2,
  REVIEW = 3,
  DONE = 4,
  ARCHIVED = 5,
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

export type AppendableType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'to_do'
  | 'toggle'
  | 'child_page'
  | 'child_database'
  | 'embed'
  | 'image'
  | 'video'
  | 'file'
  | 'pdf'
  | 'bookmark'
  | 'callout'
  | 'quote'
  | 'equation'
  | 'divider'
  | 'table_of_contents'
  | 'column'
  | 'column_list'
  | 'link_preview'
  | 'synced_block'
  | 'template'
  | 'link_to_page'
  | 'table'
  | 'table_row'
  | 'unsupported';

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

export type BlockType =
  | 'paragraph'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'toggle'
  | 'to_do'
  | 'quote'
  | 'callout'
  | 'synced_block'
  | 'template'
  | 'column'
  | 'child_page'
  | 'child_database'
  | 'table';

export type Color =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'gray_background'
  | 'brown_background'
  | 'orange_background'
  | 'yellow_background'
  | 'green_background'
  | 'blue_background'
  | 'purple_background'
  | 'pink_background'
  | 'red_background';

export type BlockAnnotation = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: Color;
};

type TextObject = {
  annotations: BlockAnnotation;
  plain_text: string;
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link: { type: 'url' | 'link_preview'; url: string } | null;
  };
  link_preview?: { url: string };
  mention?: {
    type: 'link_preview';
    link_preview: { url: string };
    page?: { id: string };
  };
  href: string | null;
};

export type AppendBlockChildren = {
  object: 'block';
  type: AppendableType;
} & {
  [key in AppendableType]?: {
    text?: Partial<TextObject>[];
    rich_text?: Partial<TextObject>[];
  };
};

export interface RawBlockProps {
  object: 'block';
  id: string;
  created_time: Date;
  created_by: {
    object: 'user';
    id: string;
  };
  last_edited_time: Date;
  last_edited_by: {
    object: 'user';
    id: string;
  };
  has_children: boolean;
  type: BlockType;
  archived: boolean;
  to_do?: {
    rich_text: TextObject[];
  };
  bulleted_list_item?: {
    rich_text: TextObject[];
    color: Color;
    children: RawBlockProps[];
  };
  paragraph?: {
    text: TextObject[];
  };
  checked?: boolean;
  color: string;
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

export type CommonOutput<ResultType> = {
  object: 'list';
  results: ResultType;
  next_cursor: number | null;
  has_more: boolean;
};

export type RawBlockDataProps = CommonOutput<RawBlockProps[]>;
export type RawDatabaseDataProps = CommonOutput<RawPageProps[]>;
