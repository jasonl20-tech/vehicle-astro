// Hardcoded site configuration (replaces former Contentful `companyInfo` / `statistics` types).
// Update values here when company data, contact details or stat numbers change.

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
  emailPress: string;
  emailCareers: string;
  twitterUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
}

export const companyInfo: CompanyInfo = {
  companyName: 'Vehicle Imagery',
  productName: 'Vehicle Imagery API',
  founded: '2024',
  headquarters: 'Germany',
  industry: 'Automotive SaaS',
  phone: '+49-151-4798371',
  apiBaseUrl: 'https://api.vehicleimagery.com',
  emailInfo: 'info@vehicleimagery.com',
  emailSupport: 'support@vehicleimagery.com',
  emailPress: 'press@vehicleimagery.com',
  emailCareers: 'careers@vehicleimagery.com',
  twitterUrl: 'https://x.com/VehicleImagery',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61581800704053',
  linkedinUrl: 'https://linkedin.com/company/vehicleimagery',
  githubUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
};

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

export const siteStats: SiteStats = {
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

// Async wrappers for backwards compatibility with existing `await` call sites.
export async function getCompanyInfo(): Promise<CompanyInfo> {
  return companyInfo;
}

export async function getSiteStats(): Promise<SiteStats> {
  return siteStats;
}
