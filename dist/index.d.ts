interface SDKConfig {
    apiKey: string;
    projectId: string;
    baseUrl?: string;
    defaultLanguage?: string;
    defaultNamespace?: string;
    cacheTime?: number;
    reportMissing?: boolean;
}
type InterpolationParams = {
    [key: string]: string | number;
};
type TOptions = InterpolationParams & {
    ns?: string;
};

declare class TranslationPlatform {
    private config;
    private translations;
    private cache;
    private missingKeys;
    constructor(config: SDKConfig);
    loadNamespace(namespace: string, lang?: string): Promise<void>;
    loadTranslations(lang?: string, namespace?: string): Promise<void>;
    t(key: string, options?: TOptions): string;
    getProjectConfig(): Promise<any>;
    private reportMissingKey;
}

export { TranslationPlatform };
