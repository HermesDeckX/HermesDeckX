import { useEffect, useRef, useCallback, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput, foldKeymap } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';

// Language imports (lazy)
const langLoaders: Record<string, () => Promise<any>> = {
  javascript: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true, typescript: false })),
  typescript: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true, typescript: true })),
  json: () => import('@codemirror/lang-json').then(m => m.json()),
  html: () => import('@codemirror/lang-html').then(m => m.html()),
  css: () => import('@codemirror/lang-css').then(m => m.css()),
  python: () => import('@codemirror/lang-python').then(m => m.python()),
  xml: () => import('@codemirror/lang-xml').then(m => m.xml()),
  markdown: () => import('@codemirror/lang-markdown').then(m => m.markdown()),
  sql: () => import('@codemirror/lang-sql').then(m => m.sql()),
  yaml: () => import('@codemirror/lang-yaml').then(m => m.yaml()),
  rust: () => import('@codemirror/lang-rust').then(m => m.rust()),
  java: () => import('@codemirror/lang-java').then(m => m.java()),
  go: () => import('@codemirror/lang-go').then(m => m.go()),
  cpp: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
  php: () => import('@codemirror/lang-php').then(m => m.php()),
};

const extToLang: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', mts: 'typescript',
  json: 'json', jsonc: 'json',
  html: 'html', htm: 'html', vue: 'html', svelte: 'html',
  css: 'css', scss: 'css', less: 'css',
  py: 'python', pyw: 'python',
  xml: 'xml', svg: 'xml', plist: 'xml',
  md: 'markdown', mdx: 'markdown',
  sql: 'sql',
  yaml: 'yaml', yml: 'yaml',
  rs: 'rust',
  java: 'java',
  go: 'go',
  c: 'cpp', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', h: 'cpp', hpp: 'cpp',
  php: 'php',
};

const nameToLang: Record<string, string> = {
  Dockerfile: 'python', Makefile: 'python', Vagrantfile: 'python',
  '.env': 'yaml', '.gitignore': 'yaml', '.dockerignore': 'yaml',
};

function detectLanguage(filename: string): string | null {
  if (nameToLang[filename]) return nameToLang[filename];
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return extToLang[ext] || null;
}

export interface SftpEditorProps {
  content: string;
  filename: string;
  filePath: string;
  isDark: boolean;
  isDirty: boolean;
  saving: boolean;
  fileSize: number;
  lineEnding: 'lf' | 'crlf';
  onContentChange: (content: string) => void;
  onSave: () => void;
  onClose: () => void;
  tt: Record<string, string>;
}

export default function SftpEditor({ content, filename, filePath, isDark, isDirty, saving, fileSize, lineEnding, onContentChange, onSave, onClose, tt }: SftpEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeComp = useRef(new Compartment());
  const langComp = useRef(new Compartment());
  const onChangeRef = useRef(onContentChange);
  onChangeRef.current = onContentChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const [lineCol, setLineCol] = useState({ line: 1, col: 1 });
  const detectedLang = detectLanguage(filename);
  const [overrideLang, setOverrideLang] = useState<string | null>(null);
  const currentLang = overrideLang ?? detectedLang ?? 'plain';
  const availableLangs = ['plain', ...Object.keys(langLoaders).sort()];

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
      if (update.selectionSet) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        setLineCol({ line: line.number, col: pos - line.from + 1 });
      }
    });

    const saveKeymap = keymap.of([{
      key: 'Mod-s',
      run: () => { onSaveRef.current(); return true; },
    }]);

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        themeComp.current.of(isDark ? oneDark : []),
        langComp.current.of([]),
        updateListener,
        saveKeymap,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    // Load language extension
    const lang = detectLanguage(filename);
    if (lang && langLoaders[lang]) {
      langLoaders[lang]().then((ext) => {
        if (viewRef.current) {
          viewRef.current.dispatch({ effects: langComp.current.reconfigure(ext) });
        }
      }).catch(() => { /* silent */ });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch language when overrideLang changes
  useEffect(() => {
    if (!viewRef.current) return;
    const lang = overrideLang ?? detectedLang;
    if (lang && langLoaders[lang]) {
      langLoaders[lang]().then((ext) => {
        if (viewRef.current) viewRef.current.dispatch({ effects: langComp.current.reconfigure(ext) });
      }).catch(() => {});
    } else {
      viewRef.current.dispatch({ effects: langComp.current.reconfigure([]) });
    }
  }, [overrideLang]);

  // Update theme when isDark changes
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeComp.current.reconfigure(isDark ? oneDark : []),
      });
    }
  }, [isDark]);

  const fmtSize = useCallback((b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 ** 2).toFixed(1)} MB`;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ animation: 'fade-in 0.15s ease-out' }}>
      {/* Backdrop */}
      <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/30'} backdrop-blur-sm`} onClick={onClose} />
      {/* Modal Panel */}
      <div className={`relative flex flex-col rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#1e1e2e] border border-white/10' : 'bg-white border border-black/10'}`} style={{ width: '80vw', height: '75vh', maxWidth: '1200px', maxHeight: '800px', minWidth: '500px', minHeight: '400px' }}>
        {/* Title bar */}
        <div className={`flex items-center gap-2 px-4 py-2.5 border-b shrink-0 ${isDark ? 'border-white/5 bg-white/[.03]' : 'border-black/5 bg-gray-50'}`}>
          <span className="material-symbols-outlined text-base text-amber-400">edit_document</span>
          <span className={`text-sm font-medium truncate ${isDark ? 'text-white/80' : 'text-black/80'}`}>{filename}</span>
          {isDirty && <span className="text-amber-400 text-sm">●</span>}
          <span className={`text-[10px] font-mono truncate flex-1 min-w-0 ${isDark ? 'text-white/25' : 'text-black/25'}`} title={filePath}>{filePath}</span>
          <span className={`text-[10px] font-mono shrink-0 ${isDark ? 'text-white/25' : 'text-black/25'}`}>
            <select value={currentLang} onChange={(e) => setOverrideLang(e.target.value === (detectedLang ?? 'plain') ? null : e.target.value)} className={`bg-transparent border-none outline-none cursor-pointer text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-black/40'}`}>{availableLangs.map((l) => <option key={l} value={l}>{l}</option>)}</select>
            | {lineEnding.toUpperCase()} | Ln {lineCol.line}, Col {lineCol.col} | {fmtSize(fileSize)}
          </span>
          <button
            onClick={onSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1 px-3 py-1 text-[11px] font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-40 transition-colors shrink-0"
            title="Ctrl+S"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px' }}>progress_activity</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>save</span>
            )}
            {tt.save || 'Save'}
          </button>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors shrink-0 ${isDark ? 'hover:bg-white/10 text-white/40 hover:text-white/70' : 'hover:bg-black/5 text-gray-400 hover:text-gray-600'}`}
            title={tt.close || 'Close'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
        {/* Editor */}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto" />
      </div>
    </div>
  );
}
