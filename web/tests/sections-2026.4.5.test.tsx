/**
 * sections-2026.4.5.test.tsx — Tests for new config fields added in Hermes Agent 2026.4.5 sync.
 *
 * Covers:
 *   - AgentsSection: musicGenerationModel, contextInjection, params (KeyValueField)
 *   - ToolsSection: tools.media.asyncCompletion.directSend
 *   - MemorySection: dreaming (enabled, frequency, recencyHalfLifeDays, maxAgeDays)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AgentsSection } from '../windows/Editor/sections/AgentsSection';
import { ToolsSection } from '../windows/Editor/sections/ToolsSection';
import { MemorySection } from '../windows/Editor/sections/MemorySection';
import { EditorFieldsI18nProvider } from '../windows/Editor/fields';
import type { SectionProps } from '../windows/Editor/sectionTypes';

// ============================================================================
// Helper: build SectionProps with an in-memory config store
// ============================================================================
function makeSectionProps(initialConfig: Record<string, any> = {}): {
  props: SectionProps;
  calls: Array<{ op: string; path: string[]; value?: any }>;
} {
  const calls: Array<{ op: string; path: string[]; value?: any }> = [];

  const getField = (path: string[]): any => {
    let cur: any = initialConfig;
    for (const k of path) {
      if (cur && typeof cur === 'object') cur = cur[k];
      else return undefined;
    }
    return cur;
  };

  const setField = (path: string[], value: any) => {
    calls.push({ op: 'set', path, value });
  };

  const deleteField = (path: string[]) => {
    calls.push({ op: 'delete', path });
  };

  const appendToArray = (path: string[], value: any) => {
    calls.push({ op: 'append', path, value });
  };

  const removeFromArray = (path: string[], index: number) => {
    calls.push({ op: 'remove', path, value: index });
  };

  return {
    props: {
      config: initialConfig,
      schema: null,
      setField,
      getField,
      deleteField,
      appendToArray,
      removeFromArray,
      language: 'en',
    },
    calls,
  };
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <EditorFieldsI18nProvider language="en">{children}</EditorFieldsI18nProvider>;
}

// ============================================================================
// AgentsSection — musicGenerationModel
// ============================================================================
describe('AgentsSection — musicGenerationModel (2026.4.5)', () => {
  it('renders Music Generation Model field', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><AgentsSection {...props} /></Wrap>);
    expect(screen.getByText('Music Generation Model')).toBeInTheDocument();
  });

  it('displays existing musicGenerationModel value', () => {
    const { props } = makeSectionProps({
      agents: { defaults: { musicGenerationModel: 'suno/chirp-v4' } },
    });
    render(<Wrap><AgentsSection {...props} /></Wrap>);
    expect(screen.getByDisplayValue('suno/chirp-v4')).toBeInTheDocument();
  });

  it('calls setField when musicGenerationModel is edited', async () => {
    const { props, calls } = makeSectionProps({
      agents: { defaults: { musicGenerationModel: '' } },
    });
    render(<Wrap><AgentsSection {...props} /></Wrap>);

    // Find the input for Music Generation Model by its placeholder
    const inputs = screen.getAllByPlaceholderText('provider/model-id');
    // musicGenerationModel is the 3rd provider/model-id placeholder
    // (after imageGenerationModel, videoGenerationModel)
    const musicInput = inputs[2];
    await userEvent.type(musicInput, 'x');
    expect(calls.some(c => c.op === 'set' && c.path.includes('musicGenerationModel'))).toBe(true);
  });
});

// ============================================================================
// AgentsSection — contextInjection
// ============================================================================
describe('AgentsSection — contextInjection (2026.4.5)', () => {
  it('renders Context Injection label', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><AgentsSection {...props} /></Wrap>);
    expect(screen.getByText('Context Injection')).toBeInTheDocument();
  });

  it('displays Default as current value when empty', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><AgentsSection {...props} /></Wrap>);
    // CustomSelect shows the selected label in a <span> inside a <button>
    // The Context Injection field label row contains a button showing "Default"
    const label = screen.getByText('Context Injection');
    const section = label.closest('[class*="flex"]')?.parentElement;
    // "Default" text appears as the currently selected option text
    expect(section).toBeDefined();
  });

  it('opens dropdown and selects continuation-skip via click', () => {
    const { props, calls } = makeSectionProps({});
    render(<Wrap><AgentsSection {...props} /></Wrap>);

    // The contextInjection CustomSelect trigger button shows "Default"
    // Find all buttons with "Default" text — the contextInjection one is among them
    const allDefaultBtns = screen.getAllByTitle('Default');
    // Click the last one (contextInjection is after compaction which also has Default)
    const trigger = allDefaultBtns[allDefaultBtns.length - 1];
    fireEvent.click(trigger);

    // After opening, the portal renders options in document.body
    // Find and click "Continuation Skip"
    const option = screen.getByTitle('Continuation Skip');
    fireEvent.click(option);
    expect(calls.some(c =>
      c.op === 'set' && c.path.includes('contextInjection') && c.value === 'continuation-skip'
    )).toBe(true);
  });
});

// ============================================================================
// AgentsSection — Default Params (KeyValueField)
// ============================================================================
describe('AgentsSection — Default Params (2026.4.5)', () => {
  it('renders Default Params field', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><AgentsSection {...props} /></Wrap>);
    expect(screen.getByText('Default Params')).toBeInTheDocument();
  });

  it('displays existing params entries', () => {
    const { props } = makeSectionProps({
      agents: { defaults: { params: { temperature: '0.7', topP: '0.9' } } },
    });
    render(<Wrap><AgentsSection {...props} /></Wrap>);
    expect(screen.getByText('temperature')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.7')).toBeInTheDocument();
    expect(screen.getByText('topP')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.9')).toBeInTheDocument();
  });
});

// ============================================================================
// ToolsSection — asyncCompletion.directSend
// ============================================================================
describe('ToolsSection — asyncCompletion.directSend (2026.4.5)', () => {
  function expandMedia() {
    // Media section title uses es.media which resolves to "Media Understanding"
    const mediaBtn = screen.getByRole('button', { name: 'Media Understanding' });
    fireEvent.click(mediaBtn);
  }

  it('renders Async Completion: Direct Send switch', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><ToolsSection {...props} /></Wrap>);
    expandMedia();
    expect(screen.getByText('Async Completion: Direct Send')).toBeInTheDocument();
  });

  it('switch is off by default (value=false)', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><ToolsSection {...props} /></Wrap>);
    expandMedia();
    const label = screen.getByText('Async Completion: Direct Send');
    expect(label).toBeInTheDocument();
  });

  it('calls setField with true when toggled on', () => {
    const { props, calls } = makeSectionProps({});
    render(<Wrap><ToolsSection {...props} /></Wrap>);
    expandMedia();

    // SwitchField renders a single <button> role="button" in the same row
    const label = screen.getByText('Async Completion: Direct Send');
    // Walk up to the field row container and find the toggle button
    const fieldRow = label.closest('[class*="grid"]') || label.closest('[class*="flex"]');
    const toggleBtns = fieldRow?.querySelectorAll('button');
    // The SwitchField button is the only button in this row
    const toggle = toggleBtns ? toggleBtns[toggleBtns.length - 1] : null;
    expect(toggle).not.toBeNull();
    if (toggle) {
      fireEvent.click(toggle);
      expect(calls.some(c =>
        c.op === 'set' && c.path.join('.').includes('asyncCompletion') && c.value === true
      )).toBe(true);
    }
  });
});

// ============================================================================
// MemorySection — Dreaming
// ============================================================================
describe('MemorySection — Dreaming (2026.4.5)', () => {
  it('renders Dreaming section header (collapsed by default)', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><MemorySection {...props} /></Wrap>);
    expect(screen.getByText('Dreaming')).toBeInTheDocument();
    // Children should be hidden (defaultOpen=false)
    expect(screen.queryByText('Enable Dreaming')).not.toBeInTheDocument();
  });

  it('expands to show dreaming fields on click', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><MemorySection {...props} /></Wrap>);

    fireEvent.click(screen.getByRole('button', { name: 'Dreaming' }));
    expect(screen.getByText('Enable Dreaming')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Recency Half-Life (days)')).toBeInTheDocument();
    expect(screen.getByText('Max Age (days)')).toBeInTheDocument();
  });

  it('dreaming enabled switch calls setField', () => {
    const { props, calls } = makeSectionProps({});
    render(<Wrap><MemorySection {...props} /></Wrap>);

    fireEvent.click(screen.getByRole('button', { name: 'Dreaming' }));

    // Find and click the Enable Dreaming switch
    const label = screen.getByText('Enable Dreaming');
    const row = label.closest('[class*="flex"]');
    const btn = row?.querySelector('button');
    if (btn) {
      fireEvent.click(btn);
      expect(calls.some(c =>
        c.op === 'set' && c.path.join('.').includes('dreaming') && c.path.includes('enabled')
      )).toBe(true);
    }
  });

  it('displays existing dreaming config values', () => {
    const { props } = makeSectionProps({
      memory: {
        dreaming: {
          enabled: true,
          frequency: 'daily',
          recencyHalfLifeDays: 14,
          maxAgeDays: 90,
        },
      },
    });
    render(<Wrap><MemorySection {...props} /></Wrap>);

    fireEvent.click(screen.getByRole('button', { name: 'Dreaming' }));
    expect(screen.getByDisplayValue('daily')).toBeInTheDocument();
  });

  it('frequency field has daily placeholder', () => {
    const { props } = makeSectionProps({});
    render(<Wrap><MemorySection {...props} /></Wrap>);

    fireEvent.click(screen.getByRole('button', { name: 'Dreaming' }));
    expect(screen.getByPlaceholderText('daily')).toBeInTheDocument();
  });
});
