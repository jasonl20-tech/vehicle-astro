import { createClient } from 'contentful';

function getClient() {
  const space = import.meta.env.CONTENTFUL_SPACE_ID;
  const token = import.meta.env.CONTENTFUL_ACCESS_TOKEN;
  if (!space || !token) {
    throw new Error('Contentful: CONTENTFUL_SPACE_ID und CONTENTFUL_ACCESS_TOKEN in .env setzen');
  }
  return createClient({ space, accessToken: token });
}

export const getEntries = (params?: object) => getClient().getEntries(params);
export const getEntry = (id: string) => getClient().getEntry(id);
export const getAsset = (id: string) => getClient().getAsset(id);
