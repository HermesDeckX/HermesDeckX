import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Language } from '../../types';
import { knowledgeApi } from '../../services/api';
import type { KnowledgeSearchResult } from '../../services/api';
import SearchResultCard from './SearchResultCard';

interface Props {
  language: Language;
  t: Record<string, any>;
}

type SourceFilter = 'all' | 'sessions' | 'memory';

const SearchWorkbench: React.FC<Props> = ({ language, t }) => {
  const k = t.know || {};
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string, src: SourceFilter) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const sources = src === 'all' ? 'sessions,memory' : src;
      const data = await knowledgeApi.search(q, sources, 30);
      setResults(data.results || []);
      setSearched(true);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(val, sourceFilter);
    }, 400);
  }, [doSearch, sourceFilter]);

  const handleFilterChange = useCallback((f: SourceFilter) => {
    setSourceFilter(f);
    if (query.trim()) {
      doSearch(query, f);
    }
  }, [query, doSearch]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query, sourceFilter);
  }, [query, sourceFilter, doSearch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const filters: { key: SourceFilter; label: string; icon: string }[] = [
    { key: 'all', label: k.filterAll || 'All', icon: 'select_all' },
    { key: 'sessions', label: k.filterSessions || 'Sessions', icon: 'forum' },
    { key: 'memory', label: k.filterMemory || 'Memory', icon: 'psychology' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] theme-text-muted">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInput}
            placeholder={k.searchPlaceholder || 'Search sessions, memory, profiles...'}
            className="sci-input theme-field h-10 w-full rounded-xl ps-10 pe-20 text-sm placeholder:text-slate-400 dark:placeholder:text-white/20 outline-none focus:ring-1 focus:ring-primary/40"
          />
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setSearched(false);
                setError('');
                inputRef.current?.focus();
              }}
              className="absolute end-10 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full theme-text-muted transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white/80"
              aria-label={k.clearSearch || 'Clear search'}
            >
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          )}
          {loading && (
            <span className="material-symbols-outlined absolute end-3 top-1/2 -translate-y-1/2 text-[14px] text-info animate-spin">
              progress_activity
            </span>
          )}
        </div>
      </form>

      {/* Source filters */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors font-medium
              ${sourceFilter === f.key
                ? 'bg-info/15 text-info ring-1 ring-info/30'
                : 'bg-surface-raised text-text-secondary hover:bg-surface-sunken'
              }`}
          >
            <span className="material-symbols-outlined text-[12px]">{f.icon}</span>
            {f.label}
          </button>
        ))}
        {searched && (
          <span className="text-[10px] text-text-muted ms-auto">
            {results.length} {k.resultsFound || 'results'}
          </span>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar neon-scrollbar space-y-2 min-h-0">
        {error && (
          <div className="text-xs text-danger bg-danger/10 rounded-lg p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {error}
          </div>
        )}

        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <span className="material-symbols-outlined text-[40px] mb-3 opacity-30">manage_search</span>
            <p className="text-sm font-medium">{k.searchPrompt || 'Search your knowledge base'}</p>
            <p className="text-[11px] mt-1 opacity-70">
              {k.searchHint || 'Search across sessions, memory files, and user profiles'}
            </p>
          </div>
        )}

        {searched && results.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <span className="material-symbols-outlined text-[36px] mb-2 opacity-30">search_off</span>
            <p className="text-xs">{k.noResults || 'No results found'}</p>
          </div>
        )}

        {results.map(r => (
          <SearchResultCard key={r.id} result={r} t={k} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(SearchWorkbench);
