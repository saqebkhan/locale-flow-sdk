interface SDKConfig {
    apiKey: string;
    projectId: string;
    baseUrl?: string;
    defaultLanguage?: string;
    cacheTime?: number;
    reportMissing?: boolean;
}
type InterpolationParams = {
    [key: string]: string | number;
};

declare class TranslationPlatform {
    private config;
    private translations;
    private cache;
    private missingKeys;
    constructor(config: SDKConfig);
    loadTranslations(lang?: string, namespace?: string): Promise<void>;
    t(key: string, params?: InterpolationParams): string;
    private reportMissingKey;
}

export { TranslationPlatform };
