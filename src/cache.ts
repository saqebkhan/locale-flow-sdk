import type { TranslationData } from './types';

export class Cache {
  private prefix = 'tp_cache_';

  set(projectId: string, lang: string, data: TranslationData, ttl: number) {
    if (typeof localStorage === 'undefined') return;
    const item = {
      data,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(`${this.prefix}${projectId}_${lang}`, JSON.stringify(item));
  }

  get(projectId: string, lang: string): TranslationData | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(`${this.prefix}${projectId}_${lang}`);
    if (!raw) return null;

    try {
      const item = JSON.parse(raw);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(`${this.prefix}${projectId}_${lang}`);
        return null;
      }
      return item.data;
    } catch {
      return null;
    }
  }
}
