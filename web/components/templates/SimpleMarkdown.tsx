import React, { useMemo } from 'react';

interface SimpleMarkdownProps {
  content: string;
  className?: string;
  maxHeight?: string;
}

/**
 * Lightweight Markdown renderer for knowledge items.
 * Supports: headings, bold, italic, inline code, code blocks, links, lists, paragraphs.
 * No external dependencies.
 */
const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ content, className, maxHeight }) => {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={`simple-markdown text-[10px] leading-relaxed text-slate-600 dark:text-white/50 ${className || ''}`}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  const output: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  const closeList = () => {
    if (inList) {
      output.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        output.push(
          `<pre class="bg-slate-50 dark:bg-black/20 rounded-lg p-2 my-1.5 text-[9px] font-mono overflow-x-auto"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
        );
        inCodeBlock = false;
        codeLines = [];
        codeBlockLang = '';
      } else {
        closeList();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const text = renderInline(headingMatch[2]);
      const sizes: Record<number, string> = {
        1: 'text-[13px] font-bold mt-3 mb-1',
        2: 'text-[12px] font-bold mt-2.5 mb-1',
        3: 'text-[11px] font-bold mt-2 mb-0.5',
        4: 'text-[10px] font-bold mt-1.5 mb-0.5',
      };
      output.push(`<div class="${sizes[level] || sizes[4]} text-slate-800 dark:text-white/80">${text}</div>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList();
        inList = true;
        listType = 'ul';
        output.push('<ul class="list-disc list-inside space-y-0.5 my-1">');
      }
      output.push(`<li>${renderInline(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList();
        inList = true;
        listType = 'ol';
        output.push('<ol class="list-decimal list-inside space-y-0.5 my-1">');
      }
      output.push(`<li>${renderInline(olMatch[2])}</li>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeList();
      output.push('<hr class="border-slate-200 dark:border-white/10 my-2" />');
      continue;
    }

    // Paragraph
    closeList();
    output.push(`<p class="my-1">${renderInline(line)}</p>`);
  }

  // Close any open blocks
  if (inCodeBlock && codeLines.length > 0) {
    output.push(
      `<pre class="bg-slate-50 dark:bg-black/20 rounded-lg p-2 my-1.5 text-[9px] font-mono overflow-x-auto"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
    );
  }
  closeList();

  return output.join('\n');
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  // Bold + italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-700 dark:text-white/70">$1</strong>');
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.+?)_/g, '<em>$1</em>');
  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-white/[0.08] px-1 py-0.5 rounded text-[9px] font-mono">$1</code>');
  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary hover:underline">$1</a>');

  return result;
}

export default SimpleMarkdown;
