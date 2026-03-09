import { createClient } from 'contentful';
import { getContentfulLocale, type Locale, defaultLocale } from '../i18n/utils';

function getClient() {
  const space = process.env.CONTENTFUL_SPACE_ID ?? import.meta.env.CONTENTFUL_SPACE_ID;
  const token = process.env.CONTENTFUL_ACCESS_TOKEN ?? import.meta.env.CONTENTFUL_ACCESS_TOKEN;
  if (!space || !token) {
    throw new Error('Contentful: CONTENTFUL_SPACE_ID und CONTENTFUL_ACCESS_TOKEN in .env oder Cloudflare Env setzen');
  }
  return createClient({ space, accessToken: token });
}

export const getEntries = (params?: Record<string, unknown>) => getClient().getEntries(params);
export const getEntry = (id: string) => getClient().getEntry(id);
export const getAsset = (id: string) => getClient().getAsset(id);

export function getLocalizedEntries(locale: Locale, params?: Record<string, unknown>) {
  return getEntries({ ...params, locale: getContentfulLocale(locale) });
}

export interface SiteStats {
  brands: string;
  models: string;
  assets: string;
  colors: string;
  uptime: string;
  latency: string;
  requests: string;
  cameraAngles: string;
  maxResolution: string;
  trialRequests: string;
  signedUrlExpiry: string;
  responseTime: string;
  segments: string;
  configurations: string;
  viewsPerConfig: string;
  newAdditions: string;
  sedans: string;
  suvs: string;
  sportsCars: string;
  hatchbacks: string;
  coupes: string;
  trucks: string;
  vans: string;
  electric: string;
}

const defaultStats: SiteStats = {
  brands: '140+',
  models: '65,000+',
  assets: '40k+',
  colors: '1,000+',
  uptime: '99.9%',
  latency: '50ms',
  requests: '2.5M',
  cameraAngles: '36',
  maxResolution: '2K',
  trialRequests: '500',
  signedUrlExpiry: '7 days',
  responseTime: '24h',
  segments: '8',
  configurations: '65,000+',
  viewsPerConfig: '36',
  newAdditions: 'Weekly',
  sedans: '18,000+',
  suvs: '15,000+',
  sportsCars: '4,500+',
  hatchbacks: '8,000+',
  coupes: '3,500+',
  trucks: '2,800+',
  vans: '3,200+',
  electric: '5,000+',
};

let cachedStats: SiteStats | null = null;

export async function getSiteStats(): Promise<SiteStats> {
  if (cachedStats) return cachedStats;
  try {
    const res = await getEntries({ content_type: 'statistics', limit: 1 });
    const fields = res.items?.[0]?.fields as Record<string, string> | undefined;
    if (!fields) return defaultStats;
    cachedStats = { ...defaultStats };
    for (const key of Object.keys(defaultStats) as (keyof SiteStats)[]) {
      if (fields[key]) cachedStats[key] = fields[key];
    }
    return cachedStats;
  } catch {
    return defaultStats;
  }
}

export interface CompanyInfo {
  companyName: string;
  productName: string;
  founded: string;
  headquarters: string;
  industry: string;
  phone: string;
  apiBaseUrl: string;
  emailInfo: string;
  emailSupport: string;
  emailPartners: string;
  emailPress: string;
  emailCareers: string;
  twitterUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
}

const defaultCompanyInfo: CompanyInfo = {
  companyName: 'Vehicle Imagery',
  productName: 'Vehicle Imagery API',
  founded: '2024',
  headquarters: 'Germany',
  industry: 'Automotive SaaS',
  phone: '+49-151-4798371',
  apiBaseUrl: 'https://api.vehicleimagery.com',
  emailInfo: 'info@vehicleimagery.com',
  emailSupport: 'support@vehicleimagery.com',
  emailPartners: 'partners@vehicleimagery.com',
  emailPress: 'press@vehicleimagery.com',
  emailCareers: 'careers@vehicleimagery.com',
  twitterUrl: 'https://x.com/VehicleImagery',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61581800704053',
  linkedinUrl: 'https://linkedin.com/company/vehicleimagery',
  githubUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
};

let cachedCompanyInfo: CompanyInfo | null = null;

export async function getCompanyInfo(): Promise<CompanyInfo> {
  if (cachedCompanyInfo) return cachedCompanyInfo;
  try {
    const res = await getEntries({ content_type: 'companyInfo', limit: 1 });
    const fields = res.items?.[0]?.fields as Record<string, string> | undefined;
    if (!fields) return defaultCompanyInfo;
    cachedCompanyInfo = { ...defaultCompanyInfo };
    for (const key of Object.keys(defaultCompanyInfo) as (keyof CompanyInfo)[]) {
      if (fields[key]) cachedCompanyInfo[key] = fields[key];
    }
    return cachedCompanyInfo;
  } catch {
    return defaultCompanyInfo;
  }
}

export { type Locale };
