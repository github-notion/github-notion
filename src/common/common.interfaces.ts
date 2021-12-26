export interface Params {
  [key: string]: any;
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: any;
  body?: any;
  params?: Params;
}
