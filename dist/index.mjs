// src/cache.ts
var Cache = class {
  prefix = "tp_cache_";
  set(projectId, lang, data, ttl) {
    if (typeof localStorage === "undefined") return;
    const item = {
      data,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(`${this.prefix}${projectId}_${lang}`, JSON.stringify(item));
  }
  get(projectId, lang) {
    if (typeof localStorage === "undefined") return null;
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
};

// src/index.ts
var TranslationPlatform = class {
  config;
  translations = {};
  cache;
  missingKeys = /* @__PURE__ */ new Set();
  constructor(config) {
    this.config = {
      baseUrl: "http://localhost:5000/api/v1/sdk",
      defaultLanguage: "en",
      cacheTime: 1e3 * 60 * 60,
      // 1 hour
      reportMissing: true,
      ...config
    };
    this.cache = new Cache();
  }
  async loadTranslations(lang, namespace) {
    const targetLang = lang || this.config.defaultLanguage || "en";
    const cached = this.cache.get(this.config.projectId, targetLang);
    if (cached) {
      this.translations = { ...this.translations, ...cached };
    }
    try {
      const url = new URL(`${this.config.baseUrl}/translations`);
      url.searchParams.append("lang", targetLang);
      if (namespace) url.searchParams.append("namespace", namespace);
      const response = await fetch(url.toString(), {
        headers: {
          "x-api-key": this.config.apiKey
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch translations: ${response.statusText}`);
      const data = await response.json();
      this.translations = { ...this.translations, ...data };
      this.cache.set(this.config.projectId, targetLang, data, this.config.cacheTime);
    } catch (error) {
      console.warn("TranslationPlatform: Falling back to cache or empty data due to network error", error);
    }
  }
  t(key, params) {
    let value = this.translations[key];
    if (!value) {
      if (this.config.reportMissing && !this.missingKeys.has(key)) {
        this.missingKeys.add(key);
        this.reportMissingKey(key);
      }
      return key;
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      });
      const pluralMatch = value.match(/{(\w+),\s*plural,\s*(.*)}/);
      if (pluralMatch) {
        const countVar = pluralMatch[1];
        const optionsStr = pluralMatch[2];
        const countValue = Number(params[countVar]);
        const options = {};
        const optMatches = optionsStr.matchAll(/(\w+)\s*{(.*?)}/g);
        for (const m of optMatches) {
          options[m[1]] = m[2];
        }
        const result = countValue === 1 ? options["one"] : options["other"];
        value = value.replace(pluralMatch[0], result || "");
      }
    }
    return value;
  }
  async reportMissingKey(key) {
    try {
      await fetch(`${this.config.baseUrl}/missing-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey
        },
        body: JSON.stringify({
          lang: this.config.defaultLanguage,
          keys: [key]
        })
      });
    } catch {
    }
  }
};

export { TranslationPlatform };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map