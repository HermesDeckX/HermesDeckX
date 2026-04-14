import { Language } from '../types';

export interface I18nOverride {
  _tags?: Record<string, string>;
  name?: string;
  description?: string;
  content?: Record<string, any>;
  agents?: Record<string, { name?: string; role?: string; description?: string }>;
  workflow?: { description?: string; steps?: string[] };
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

// All supported languages
const ALL_LANGS: Language[] = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'es', 'pt-BR', 'de', 'fr', 'ru', 'ar', 'hi', 'id'];

// Knowledge item type → directory name mapping (mirrors templates/official/knowledge/ structure)
const KNOWLEDGE_TYPE_DIR: Record<string, string> = {
  faq: 'faq',
  recipe: 'recipes',
  tip: 'tips',
  snippet: 'snippets',
};

// Pre-build all i18n translation file loaders at compile time via import.meta.glob.
// This is required because Vite cannot resolve dynamic import() paths that contain
// multi-level directory variables (e.g. itemPath = "scenarios/productivity/personal-assistant").
const i18nModules: Record<string, () => Promise<any>> = import.meta.glob(
  '../../templates/official/i18n/**/*.json'
);

// Resolve per-item translation file path for each category
// All categories use per-item files mirroring the source file structure:
//   scenarios: i18n/{lang}/scenarios/{subcategory}/{id}.json
//   agents:    i18n/{lang}/agents/{id}.json
//   multi-agent: i18n/{lang}/multi-agent/{id}.json
//   knowledge: i18n/{lang}/knowledge/{typeDir}/{slug}.json
function resolveItemPath(item: { id: string; type?: string; metadata?: any }, category: string): string | null {
  switch (category) {
    case 'scenarios': {
      const subcat = item.metadata?.category;
      if (!subcat) return null;
      return `scenarios/${subcat}/${item.id}`;
    }
    case 'agents':
      return `agents/${item.id}`;
    case 'multi-agent':
      return `multi-agent/${item.id}`;
    case 'knowledge': {
      const type = item.type as string;
      const dir = KNOWLEDGE_TYPE_DIR[type];
      if (!dir) return null;
      const prefix = type + '-';
      const slug = item.id.startsWith(prefix) ? item.id.slice(prefix.length) : item.id;
      return `knowledge/${dir}/${slug}`;
    }
    default:
      return null;
  }
}

class TemplateI18nManager {
  private itemCache: Map<string, I18nOverride | null> = new Map();

  // Load and apply translation for a single template item (any category)
  async loadItemTranslation<T extends { id: string; type?: string; metadata?: any; content?: any }>(
    item: T,
    category: string,
    lang: Language
  ): Promise<T> {
    // English is the source language for scenarios/agents/multi-agent — skip
    if (lang === 'en' && category !== 'knowledge') return item;

    const itemPath = resolveItemPath(item, category);
    if (!itemPath) return item;

    const cacheKey = `${lang}:${itemPath}`;

    if (!this.itemCache.has(cacheKey)) {
      try {
        const globKey = `../../templates/official/i18n/${lang}/${itemPath}.json`;
        const loader = i18nModules[globKey];
        if (loader) {
          const mod = await loader();
          this.itemCache.set(cacheKey, (mod.default || mod) as I18nOverride);
        } else {
          this.itemCache.set(cacheKey, null);
        }
      } catch {
        this.itemCache.set(cacheKey, null);
      }
    }

    const override = this.itemCache.get(cacheKey);
    if (!override) return item;
    return this.mergeTranslation(item, override);
  }

  // Batch-load translations for a list of template items (any category)
  async localizeItems<T extends { id: string; type?: string; metadata?: any; content?: any }>(
    items: T[],
    category: string,
    lang: Language
  ): Promise<T[]> {
    return Promise.all(items.map(item => this.loadItemTranslation(item, category, lang)));
  }

  // Legacy aliases for backward compatibility
  async localizeKnowledgeItems<T extends { id: string; type?: string; metadata?: any; content?: any }>(
    items: T[],
    lang: Language
  ): Promise<T[]> {
    return this.localizeItems(items, 'knowledge', lang);
  }

  getTagTranslations(_category: string, _subcategory: string | null, lang: Language): Record<string, string> {
    if (lang === 'en') return {};
    // With per-item files, _tags are embedded in each item's translation file.
    // Callers should use the _tags from the item override directly.
    // This method is kept for compatibility but returns empty — tag translation
    // is now handled inside mergeTranslation via override._tags.
    return {};
  }

  private mergeTranslation<T extends { id: string; metadata?: any; content?: any }>(
    template: T,
    translation: I18nOverride,
    tagMap?: Record<string, string>
  ): T {
    const result = { ...template };

    // Use _tags from the translation file if not provided externally
    const effectiveTagMap = tagMap || translation._tags || {};

    // Merge metadata
    if (translation.name || translation.description || translation.metadata) {
      result.metadata = {
        ...result.metadata,
        ...(translation.name && { name: translation.name }),
        ...(translation.description && { description: translation.description }),
        ...translation.metadata,
      };
    }

    // Translate tags using tagMap from _tags field
    if (result.metadata?.tags && Object.keys(effectiveTagMap).length > 0) {
      result.metadata = {
        ...result.metadata,
        tags: result.metadata.tags.map((tag: string) => effectiveTagMap[tag] || tag),
      };
    }

    // Merge content
    if (translation.content) {
      result.content = { ...result.content, ...translation.content };
    }

    // Merge agents (for multi-agent templates)
    if (translation.agents && (result as any).content?.agents) {
      const agents = [...(result as any).content.agents];
      for (let i = 0; i < agents.length; i++) {
        const agentOverride = translation.agents[agents[i].id];
        if (agentOverride) {
          agents[i] = {
            ...agents[i],
            ...(agentOverride.name && { name: agentOverride.name }),
            ...(agentOverride.role && { role: agentOverride.role }),
            ...(agentOverride.description && { description: agentOverride.description }),
          };
        }
      }
      (result as any).content = { ...(result as any).content, agents };
    }

    // Merge workflow
    if (translation.workflow && (result as any).content?.workflow) {
      (result as any).content = {
        ...(result as any).content,
        workflow: {
          ...(result as any).content.workflow,
          ...translation.workflow,
        },
      };
    }

    return result;
  }

  async preloadLanguage(_lang: Language, _categories: string[]): Promise<void> {
    // Per-item files are loaded on-demand, no bulk preload needed
  }

  clearCache(path?: string): void {
    if (path) {
      // Clear all items matching path prefix
      for (const key of this.itemCache.keys()) {
        if (key.includes(path)) this.itemCache.delete(key);
      }
    } else {
      this.itemCache.clear();
    }
  }

  getAvailableLanguages(): Language[] {
    return ALL_LANGS;
  }
}

export const templateI18n = new TemplateI18nManager();
export default templateI18n;
