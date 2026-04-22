export interface SDKConfig {
  apiKey: string;
  projectId: string;
  baseUrl?: string;
  defaultLanguage?: string;
  cacheTime?: number; // in milliseconds
  reportMissing?: boolean;
}

export interface TranslationData {
  [key: string]: string;
}

export type InterpolationParams = { [key: string]: string | number };
