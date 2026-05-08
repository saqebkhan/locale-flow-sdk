import type { SDKConfig, TranslationData, TOptions } from './types';
import { Cache } from './cache';
import { SDK_DEFAULTS } from './constants';

export class TranslationPlatform {
  private config: SDKConfig;
  private translations: TranslationData = {};
  private cache: Cache;
  private missingKeys: Set<string> = new Set();
  public logs: { type: 'info' | 'warn' | 'error' | 'success', message: string, timestamp: number }[] = [];
  private onLog?: (log: any) => void;

  constructor(config: SDKConfig) {
    this.config = {
      baseUrl: config.baseUrl || SDK_DEFAULTS.BASE_URL,
      defaultLanguage: config.defaultLanguage || SDK_DEFAULTS.LANGUAGE,
      defaultNamespace: config.defaultNamespace || SDK_DEFAULTS.NAMESPACE,
      cacheTime: config.cacheTime || SDK_DEFAULTS.CACHE_TIME,
      reportMissing: config.reportMissing ?? true,
      ...config
    };
    this.cache = new Cache();
    this.onLog = config.onLog;
    this.addLog('success', 'SDK Initialized with Project ID: ' + this.config.projectId);
  }

  private addLog(type: 'info' | 'warn' | 'error' | 'success', message: string) {
    const log = { type, message, timestamp: Date.now() };
    this.logs.unshift(log); // Newest first
    if (this.onLog) this.onLog(log);
  }

  async loadNamespace(namespace: string, lang?: string): Promise<void> {
    return this.loadTranslations(lang, namespace);
  }

  async loadTranslations(lang?: string, namespace?: string): Promise<void> {
    const targetLang = lang || this.config.defaultLanguage || SDK_DEFAULTS.LANGUAGE;
    const targetNamespace = namespace || this.config.defaultNamespace;
    
    // If no namespace provided and no default, use constant
    const finalNamespace = targetNamespace || SDK_DEFAULTS.NAMESPACE;
    
    // Try cache first
    const cacheKey = `${this.config.projectId}_${targetLang}_${finalNamespace}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.addLog('info', `Cache hit for namespace "${finalNamespace}" [${targetLang}]`);
      this.translations[finalNamespace] = { 
        ...(this.translations[finalNamespace] || {}), 
        ...cached 
      };
    }

    try {
      const url = new URL(`${this.config.baseUrl}/translations`);
      url.searchParams.append('lang', targetLang);
      url.searchParams.append('namespace', finalNamespace);

      const response = await fetch(url.toString(), {
        headers: {
          'x-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        this.addLog('error', `Failed to fetch namespace "${finalNamespace}": ${response.statusText}`);
        throw new Error(`Failed to fetch translations: ${response.statusText}`);
      }

      const data = await response.json();
      this.addLog('success', `Fetched ${Object.keys(data).length} keys for namespace "${finalNamespace}"`);
      
      // Store in nested structure
      this.translations[finalNamespace] = { 
        ...(this.translations[finalNamespace] || {}), 
        ...data 
      };
      
      // Update cache
      this.cache.set(cacheKey, data, this.config.cacheTime!);
    } catch (error) {
      console.warn(`TranslationPlatform: Failed to load namespace "${finalNamespace}"`, error);
    }
  }

  t(key: string, options?: TOptions): string {
    let finalKey = key;
    let namespace = options?.ns || SDK_DEFAULTS.NAMESPACE;

    // Handle Prefix Syntax
    if (key.includes(':')) {
      const [ns, k] = key.split(':');
      // If prefix is "default", use the configured defaultNamespace
      if (ns === 'default') {
        namespace = this.config.defaultNamespace || SDK_DEFAULTS.NAMESPACE;
      } else {
        namespace = ns;
      }
      finalKey = k;
    }

    const nsData = this.translations[namespace];
    let value = nsData ? nsData[finalKey] : undefined;

    if (!value) {
      const fullKey = `${namespace}:${finalKey}`;
      if (this.config.reportMissing && !this.missingKeys.has(fullKey)) {
        this.addLog('warn', `Missing key detected: "${fullKey}". Reporting to dashboard...`);
        this.missingKeys.add(fullKey);
        this.reportMissingKey(fullKey);
      }
      return finalKey; // Return key as fallback
    }

    if (options) {
      // Basic interpolation: {{name}}
      Object.entries(options).forEach(([k, v]) => {
        value = value!.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });

      // Basic pluralization: {count, plural, one{...} other{...}}
      const pluralMatch = value.match(/{(\w+),\s*plural,\s*(.*)}/);
      if (pluralMatch) {
        const countVar = pluralMatch[1];
        const optionsStr = pluralMatch[2];
        const countValue = Number(options[countVar]);
        
        const opts: { [key: string]: string } = {};
        const optMatches = optionsStr.matchAll(/(\w+)\s*{(.*?)}/g);
        for (const m of optMatches) {
          opts[m[1]] = m[2];
        }

        const result = countValue === 1 ? opts['one'] : opts['other'];
        value = value.replace(pluralMatch[0], result || '');
      }
    }

    return value;
  }

  async getProjectConfig(): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/config`, {
        headers: {
          'x-api-key': this.config.apiKey
        }
      });
      if (!response.ok) throw new Error('Failed to fetch config');
      return await response.json();
    } catch (error) {
      console.error('TranslationPlatform: Error fetching project config', error);
      return null;
    }
  }

  private async reportMissingKey(key: string) {
    try {
      const response = await fetch(`${this.config.baseUrl}/missing-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        },
        body: JSON.stringify({
          lang: this.config.defaultLanguage,
          keys: [key]
        })
      });
      if (response.ok) {
        this.addLog('info', `Successfully reported missing key: "${key}"`);
      }
    } catch {
      this.addLog('error', `Failed to report missing key: "${key}"`);
    }
  }
}
