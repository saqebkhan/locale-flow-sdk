'use strict';

// src/cache.ts
var Cache = class {
  prefix = "tp_cache_";
  set(key, data, ttl) {
    if (typeof localStorage === "undefined") return;
    const item = {
      data,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
  }
  get(key) {
    if (typeof localStorage === "undefined") return null;
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
};

// src/index.ts
var TranslationPlatform = class {
  config;
  translations = {};
  cache;
  missingKeys = /* @__PURE__ */ new Set();
  constructor(config) {
    this.config = {
      baseUrl: config.baseUrl || "https://locale-flow-backend-2.onrender.com/api/v1/sdk",
      defaultLanguage: "en",
      defaultNamespace: "common",
      cacheTime: 1e3 * 60 * 60,
      // 1 hour
      reportMissing: true,
      ...config
    };
    this.cache = new Cache();
  }
  async loadNamespace(namespace, lang) {
    return this.loadTranslations(lang, namespace);
  }
  async loadTranslations(lang, namespace) {
    const targetLang = lang || this.config.defaultLanguage || "en";
    const targetNamespace = namespace || this.config.defaultNamespace;
    const finalNamespace = targetNamespace || "common";
    const cacheKey = `${this.config.projectId}_${targetLang}_${finalNamespace}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.translations[finalNamespace] = {
        ...this.translations[finalNamespace] || {},
        ...cached
      };
    }
    try {
      const url = new URL(`${this.config.baseUrl}/translations`);
      url.searchParams.append("lang", targetLang);
      url.searchParams.append("namespace", finalNamespace);
      const response = await fetch(url.toString(), {
        headers: {
          "x-api-key": this.config.apiKey
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch translations: ${response.statusText}`);
      const data = await response.json();
      this.translations[finalNamespace] = {
        ...this.translations[finalNamespace] || {},
        ...data
      };
      this.cache.set(cacheKey, data, this.config.cacheTime);
    } catch (error) {
      console.warn(`TranslationPlatform: Failed to load namespace "${finalNamespace}"`, error);
    }
  }
  t(key, options) {
    let finalKey = key;
    let namespace = options?.ns || "common";
    if (key.includes(":")) {
      const [ns, k] = key.split(":");
      if (ns === "default") {
        namespace = this.config.defaultNamespace || "common";
      } else {
        namespace = ns;
      }
      finalKey = k;
    }
    const nsData = this.translations[namespace];
    let value = nsData ? nsData[finalKey] : void 0;
    if (!value) {
      const fullKey = `${namespace}:${finalKey}`;
      if (this.config.reportMissing && !this.missingKeys.has(fullKey)) {
        this.missingKeys.add(fullKey);
        this.reportMissingKey(fullKey);
      }
      return finalKey;
    }
    if (options) {
      Object.entries(options).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      });
      const pluralMatch = value.match(/{(\w+),\s*plural,\s*(.*)}/);
      if (pluralMatch) {
        const countVar = pluralMatch[1];
        const optionsStr = pluralMatch[2];
        const countValue = Number(options[countVar]);
        const opts = {};
        const optMatches = optionsStr.matchAll(/(\w+)\s*{(.*?)}/g);
        for (const m of optMatches) {
          opts[m[1]] = m[2];
        }
        const result = countValue === 1 ? opts["one"] : opts["other"];
        value = value.replace(pluralMatch[0], result || "");
      }
    }
    return value;
  }
  async getProjectConfig() {
    try {
      const response = await fetch(`${this.config.baseUrl}/config`, {
        headers: {
          "x-api-key": this.config.apiKey
        }
      });
      if (!response.ok) throw new Error("Failed to fetch config");
      return await response.json();
    } catch (error) {
      console.error("TranslationPlatform: Error fetching project config", error);
      return null;
    }
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

exports.TranslationPlatform = TranslationPlatform;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map