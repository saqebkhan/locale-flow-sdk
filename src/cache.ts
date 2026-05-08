
export class Cache {
  private prefix = 'tp_cache_';

  set(key: string, data: any, ttl: number) {
    if (typeof localStorage === 'undefined') return;
    const item = {
      data,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
  }

  get(key: string): any | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(`${this.prefix}${key}`);
    if (!raw) return null;

    try {
      const item = JSON.parse(raw);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(`${this.prefix}${key}`);
        return null;
      }
      return item.data;
    } catch {
      return null;
    }
  }
}
