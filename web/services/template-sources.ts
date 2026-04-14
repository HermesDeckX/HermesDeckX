import { Language } from '../types';

export type TemplateSourceType = 'local' | 'cdn' | 'github' | 'api';

export interface TemplateSource {
  id: string;
  name: string;
  type: TemplateSourceType;
  enabled: boolean;
  priority: number;
  offline?: boolean;
  
  // Local source
  path?: string;
  
  // CDN source
  url?: string;
  cacheTTL?: number;
  fallback?: string;
  
  // GitHub source
  repo?: string;
  branch?: string;
  githubPath?: string;
  manifestPath?: string; // override path for manifest.json (defaults to githubPath/manifest.json)
  requiresApproval?: boolean;
  
  // API source
  baseUrl?: string;
  auth?: {
    type: 'bearer' | 'apikey';
    token?: string;
  };
}

export interface TemplateSourceConfig {
  sources: TemplateSource[];
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  autoUpdate: {
    enabled: boolean;
    interval: number;
    checkOnStartup: boolean;
  };
}

export const DEFAULT_TEMPLATE_SOURCES: TemplateSource[] = [
  {
    id: 'local',
    name: 'Built-in Templates',
    type: 'local',
    enabled: true,
    priority: 100,
    offline: true,
    path: '../../templates/official'
  },
  {
    id: 'cdn',
    name: 'Official CDN',
    type: 'cdn',
    enabled: true,
    priority: 95,
    url: 'https://templates.hermesdeckx.com',
    cacheTTL: 86400000, // 24 hours
    fallback: 'local'
  },
  {
    id: 'github',
    name: 'Official Online Templates',
    type: 'github',
    enabled: true,
    priority: 90,
    repo: 'HermesDeckX/HermesDeckX',
    branch: 'main',
    githubPath: 'templates/official',
    manifestPath: 'templates/manifest.json',
    fallback: 'local',
    requiresApproval: false
  }
];

export const DEFAULT_CONFIG: TemplateSourceConfig = {
  sources: DEFAULT_TEMPLATE_SOURCES,
  cache: {
    enabled: true,
    ttl: 86400000, // 24 hours
    maxSize: 100 * 1024 * 1024 // 100MB
  },
  autoUpdate: {
    enabled: true,
    interval: 86400000, // 24 hours
    checkOnStartup: true
  }
};

export class TemplateSourceManager {
  private config: TemplateSourceConfig;
  private storageKey = 'hermesdeckx_template_sources';

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): TemplateSourceConfig {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge per-source overrides onto the current DEFAULT_CONFIG sources so newly
        // added sources (e.g. 'local') are never lost due to a stale stored list.
        const mergedSources = DEFAULT_CONFIG.sources.map(def => {
          const override = (parsed.sources as TemplateSource[] | undefined)?.find(s => s.id === def.id);
          return override ? { ...def, ...override } : def;
        });
        return { ...DEFAULT_CONFIG, ...parsed, sources: mergedSources };
      }
    } catch (err) {
      console.error('Failed to load template source config:', err);
    }
    return DEFAULT_CONFIG;
  }

  saveConfig(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (err) {
      console.error('Failed to save template source config:', err);
    }
  }

  getConfig(): TemplateSourceConfig {
    return this.config;
  }

  getSources(): TemplateSource[] {
    return this.config.sources;
  }

  getEnabledSources(): TemplateSource[] {
    return this.config.sources
      .filter(s => s.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  getSource(id: string): TemplateSource | undefined {
    return this.config.sources.find(s => s.id === id);
  }

  updateSource(id: string, updates: Partial<TemplateSource>): void {
    const index = this.config.sources.findIndex(s => s.id === id);
    if (index !== -1) {
      this.config.sources[index] = { ...this.config.sources[index], ...updates };
      this.saveConfig();
    }
  }

  enableSource(id: string): void {
    this.updateSource(id, { enabled: true });
  }

  disableSource(id: string): void {
    this.updateSource(id, { enabled: false });
  }

  addSource(source: TemplateSource): void {
    this.config.sources.push(source);
    this.saveConfig();
  }

  removeSource(id: string): void {
    this.config.sources = this.config.sources.filter(s => s.id !== id);
    this.saveConfig();
  }

  resetToDefaults(): void {
    this.config = DEFAULT_CONFIG;
    this.saveConfig();
  }
}

export const templateSourceManager = new TemplateSourceManager();
