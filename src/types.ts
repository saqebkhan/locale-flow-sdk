export interface SDKConfig {
  apiKey: string;
  projectId: string;
  baseUrl?: string;
  defaultLanguage?: string;
  defaultNamespace?: string;
  cacheTime?: number; // in milliseconds
  reportMissing?: boolean;
  onLog?: (log: any) => void;
}

export interface TranslationData {
  [namespace: string]: {
    [key: string]: string;
  };
}

export type InterpolationParams = { [key: string]: string | number };

export type TOptions = InterpolationParams & {
  ns?: string;
};
