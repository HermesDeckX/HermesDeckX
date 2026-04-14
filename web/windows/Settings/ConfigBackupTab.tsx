import React, { useState, useEffect, useCallback } from 'react';
import { configBackupApi, type ConfigBackupFile } from '../../services/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';

interface ConfigBackupTabProps { s: any; }

const ConfigBackupTab: React.FC<ConfigBackupTabProps> = ({ s }) => {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [configPath, setConfigPath] = useState('');
  const [backups, setBackups] = useState<ConfigBackupFile[]>([]);
  const [error, setError] = useState('');
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const [diffLines, setDiffLines] = useState<{ type: 'equal' | 'add' | 'remove' | 'separator'; text: string }[]>([]);
  const [jsonChanges, setJsonChanges] = useState<{ path: string; type: 'changed' | 'added' | 'removed'; oldValue?: string; newValue?: string }[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await configBackupApi.list();
      setConfigPath(data.configPath || '');
      setBackups(data.backups || []);
    } catch {
      setError(s.configBackupNotInstalled || 'Hermes Agent not installed or config path not found');
    } finally {
      setLoading(false);
    }
  }, [s]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handlePreview = async (path: string) => {
    if (previewPath === path) { setPreviewPath(null); return; }
    setPreviewPath(path);
    setPreviewLoading(true);
    try {
      const data = await configBackupApi.preview(path);
      setPreviewContent(data.content);
    } catch {
      setPreviewContent('Error loading file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDiff = async (path: string) => {
    if (diffPath === path) { setDiffPath(null); return; }
    setDiffPath(path);
    setDiffLoading(true);
    try {
      const data = await configBackupApi.diff(path);
      setDiffLines(data.diffLines || []);
      setJsonChanges(data.jsonChanges || []);
    } catch {
      setDiffLines([{ type: 'equal', text: 'Error loading diff' }]);
      setJsonChanges([]);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleRestore = async (path: string, name: string) => {
    const ok = await confirm({
      title: s.configBackupRestore || 'Restore',
      message: (s.configBackupRestoreConfirm || 'Are you sure you want to restore this backup? The current config will be overwritten.'),
      confirmText: s.configBackupRestore || 'Restore',
      danger: true,
    });
    if (!ok) return;
    setRestoring(path);
    try {
      await configBackupApi.restore(path);
      toast('success', s.configBackupRestoreOk || 'Config restored successfully');
      fetchBackups();
    } catch {
      toast('error', s.configBackupRestoreFail || 'Failed to restore config');
    } finally {
      setRestoring(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-symbols-outlined text-[20px] animate-spin text-primary/40">progress_activity</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-white/20">folder_off</span>
        <p className="text-[12px] text-slate-400 dark:text-white/40">{error}</p>
      </div>
    );
  }

  if (backups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-white/20">inventory_2</span>
        <p className="text-[12px] text-slate-400 dark:text-white/40">{s.configBackupEmpty || 'No config backup files found'}</p>
        {configPath && <p className="text-[10px] text-slate-300 dark:text-white/20 font-mono">{configPath}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400 dark:text-white/40">{s.configBackupDesc || 'View and restore Hermes Agent configuration backup files (.bak)'}</p>
        <button onClick={() => fetchBackups()} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[12px]">refresh</span>
        </button>
      </div>

      {configPath && (
        <div className="text-[10px] font-mono text-slate-300 dark:text-white/20 truncate" title={configPath}>
          {configPath}
        </div>
      )}

      <div className="space-y-1.5">
        {backups.map((bak) => (
          <div key={bak.path} className="theme-panel rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-white/30">description</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-slate-700 dark:text-white/80 font-mono truncate">{bak.name}</span>
                  {bak.index === 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                      {s.configBackupLatest || 'Latest'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400 dark:text-white/30">
                  <span>{formatSize(bak.size)}</span>
                  <span>{new Date(bak.modTime).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handlePreview(bak.path)} title={s.configBackupPreview || 'Preview'}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${previewPath === bak.path ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                </button>
                <button onClick={() => handleDiff(bak.path)} title={s.configBackupDiff || 'Compare'}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${diffPath === bak.path ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-[14px]">compare</span>
                </button>
                <button onClick={() => handleRestore(bak.path, bak.name)} disabled={restoring === bak.path}
                  title={s.configBackupRestore || 'Restore'}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors disabled:opacity-40">
                  <span className={`material-symbols-outlined text-[14px] ${restoring === bak.path ? 'animate-spin' : ''}`}>
                    {restoring === bak.path ? 'progress_activity' : 'settings_backup_restore'}
                  </span>
                </button>
              </div>
            </div>

            {previewPath === bak.path && (
              <div className="border-t border-slate-100 dark:border-white/5 px-3 py-2">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="material-symbols-outlined text-[16px] animate-spin text-primary/40">progress_activity</span>
                  </div>
                ) : (
                  <pre className="text-[10px] font-mono text-slate-600 dark:text-white/50 overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar neon-scrollbar whitespace-pre-wrap break-words leading-relaxed">{previewContent}</pre>
                )}
              </div>
            )}

            {diffPath === bak.path && (
              <div className="border-t border-slate-100 dark:border-white/5">
                {diffLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="material-symbols-outlined text-[16px] animate-spin text-primary/40">progress_activity</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 max-h-[350px] overflow-y-auto custom-scrollbar neon-scrollbar">
                    {jsonChanges.length > 0 && (
                      <div className="mb-3 p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-white/50 mb-1.5">{s.configBackupChangeSummary || 'Changes Summary'}</p>
                        <div className="space-y-1">
                          {jsonChanges.map((ch, ci) => (
                            <div key={ci} className="flex items-start gap-1.5 text-[9px] font-mono">
                              <span className={`shrink-0 mt-px px-1 py-0.5 rounded text-[8px] font-bold leading-none ${
                                ch.type === 'changed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                                ch.type === 'added' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                                'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                              }`}>{ch.type === 'changed' ? '~' : ch.type === 'added' ? '+' : '-'}</span>
                              <span className="text-primary/80 dark:text-primary/60 shrink-0">{ch.path}</span>
                              {ch.type === 'changed' && (
                                <span className="text-slate-400 dark:text-white/30 min-w-0 truncate">
                                  <span className="text-red-500/70 dark:text-red-400/50 line-through">{ch.oldValue}</span>
                                  <span className="mx-0.5">→</span>
                                  <span className="text-emerald-600/70 dark:text-emerald-400/50">{ch.newValue}</span>
                                </span>
                              )}
                              {ch.type === 'added' && <span className="text-emerald-600/70 dark:text-emerald-400/50 min-w-0 truncate">{ch.newValue}</span>}
                              {ch.type === 'removed' && <span className="text-red-500/70 dark:text-red-400/50 min-w-0 truncate line-through">{ch.oldValue}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-2 text-[9px]">
                      <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/30" />{s.configBackupCurrent || 'Current'}</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30" />{s.configBackupBackup || 'Backup'}</span>
                    </div>
                    {diffLines.map((dl, idx) => {
                      if (dl.type === 'separator') return <div key={idx} className="text-[9px] text-slate-300 dark:text-white/15 text-center py-0.5 select-none">···</div>;
                      const bgCls = dl.type === 'add' ? 'bg-emerald-50 dark:bg-emerald-500/10' : dl.type === 'remove' ? 'bg-red-50 dark:bg-red-500/10' : '';
                      const textCls = dl.type === 'add' ? 'text-emerald-700 dark:text-emerald-300' : dl.type === 'remove' ? 'text-red-700 dark:text-red-300' : 'text-slate-500 dark:text-white/40';
                      const prefix = dl.type === 'add' ? '+' : dl.type === 'remove' ? '-' : ' ';
                      return <div key={idx} className={`flex ${bgCls} rounded-sm`}><span className={`inline-block w-4 shrink-0 text-center text-[9px] font-mono select-none ${textCls} opacity-60`}>{prefix}</span><pre className={`text-[9px] font-mono ${textCls} whitespace-pre-wrap break-words leading-relaxed flex-1 min-w-0`}>{dl.text}</pre></div>;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfigBackupTab;
