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

export const findTicketRefInString = (
  from: string,
  ticketTypes: string[],
): string[] => {
  const to = from.match(/[a-zA-Z]+(-[0-9]+)/g);
  const ticketTypesMap = {};
  for (let i = 0; i < ticketTypes.length; i++) {
    ticketTypesMap[ticketTypes[i].toUpperCase()] = true;
  }

  const mentions = [];
  // find all ticket refs mentioned in any string
  for (let i = 0; i < to.length; i++) {
    const cur = to[i].toUpperCase();
    const prefix = cur.split('-')[0];
    if (ticketTypesMap[prefix]) {
      mentions.push(cur);
    }
  }
  return mentions;
};
