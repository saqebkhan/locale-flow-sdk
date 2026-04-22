import type { SDKConfig, TranslationData, InterpolationParams } from './types';
import { Cache } from './cache';

export class TranslationPlatform {
  private config: SDKConfig;
  private translations: TranslationData = {};
  private cache: Cache;
  private missingKeys: Set<string> = new Set();

  constructor(config: SDKConfig) {
    this.config = {
      baseUrl: 'http://localhost:5000/api/v1/sdk',
      defaultLanguage: 'en',
      cacheTime: 1000 * 60 * 60, // 1 hour
      reportMissing: true,
      ...config
    };
    this.cache = new Cache();
  }

  async loadTranslations(lang?: string, namespace?: string): Promise<void> {
    const targetLang = lang || this.config.defaultLanguage || 'en';
    
    // Try cache first
    const cached = this.cache.get(this.config.projectId, targetLang);
    if (cached) {
      this.translations = { ...this.translations, ...cached };
    }

    try {
      const url = new URL(`${this.config.baseUrl}/translations`);
      url.searchParams.append('lang', targetLang);
      if (namespace) url.searchParams.append('namespace', namespace);

      const response = await fetch(url.toString(), {
        headers: {
          'x-api-key': this.config.apiKey
        }
      });

      if (!response.ok) throw new Error(`Failed to fetch translations: ${response.statusText}`);

      const data = await response.json();
      this.translations = { ...this.translations, ...data };
      
      // Update cache
      this.cache.set(this.config.projectId, targetLang, data, this.config.cacheTime!);
    } catch (error) {
      console.warn('TranslationPlatform: Falling back to cache or empty data due to network error', error);
    }
  }

  t(key: string, params?: InterpolationParams): string {
    let value = this.translations[key];

    if (!value) {
      if (this.config.reportMissing && !this.missingKeys.has(key)) {
        this.missingKeys.add(key);
        this.reportMissingKey(key);
      }
      return key; // Return key as fallback
    }

    if (params) {
      // Basic interpolation: {{name}}
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });

      // Basic pluralization: {count, plural, one{...} other{...}}
      // Simple implementation for demo
      const pluralMatch = value.match(/{(\w+),\s*plural,\s*(.*)}/);
      if (pluralMatch) {
        const countVar = pluralMatch[1];
        const optionsStr = pluralMatch[2];
        const countValue = Number(params[countVar]);
        
        const options: { [key: string]: string } = {};
        const optMatches = optionsStr.matchAll(/(\w+)\s*{(.*?)}/g);
        for (const m of optMatches) {
          options[m[1]] = m[2];
        }

        const result = countValue === 1 ? options['one'] : options['other'];
        value = value.replace(pluralMatch[0], result || '');
      }
    }

    return value;
  }

  private async reportMissingKey(key: string) {
    try {
      await fetch(`${this.config.baseUrl}/missing-report`, {
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
    } catch {
      // Silently fail for reporting
    }
  }
}
