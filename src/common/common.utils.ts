import { Params } from './common.interfaces';

export const makeSearchParams = (params: Params): string => {
  let query = '?';
  if (typeof params === 'object') {
    for (const key in params) {
      query = `${query}${key}=${params[key]}&`;
    }
  }
  if (query[query.length - 1] === '&') query.slice(0, -1);
  return query;
};
