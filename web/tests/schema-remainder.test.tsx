/**
 * schema-remainder.test.tsx — Regression tests for SchemaRemainder component.
 *
 * Covers:
 *   - React hooks order stability (fix for React error #310)
 *   - Schema transition from null → populated → null
 *   - Renders remainder fields when schema has unhandled keys
 *   - Returns null when all keys are handled
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// Mock gwApi.configSchema to avoid real HTTP calls
vi.mock('../services/api', () => ({
  gwApi: {
    configSchema: vi.fn(() => Promise.resolve({ schema: { properties: {} } })),
  },
}));

import SchemaRemainder from '../windows/Editor/SchemaRemainder';

const setField = vi.fn();

const baseProps = {
  sectionPath: 'agents.defaults',
  handledKeys: ['maxConcurrent', 'workspace'],
  config: {},
  setField,
  language: 'en' as const,
};

// Helper: build a minimal schema with given top-level keys under agents.defaults
function buildSchema(keys: string[]): Record<string, any> {
  const properties: Record<string, any> = {};
  for (const k of keys) {
    properties[k] = { type: 'string', title: k };
  }
  return {
    properties: {
      agents: {
        properties: {
          defaults: {
            properties,
          },
        },
      },
    },
  };
}

describe('SchemaRemainder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Regression: React error #310 (hooks order) ──

  it('does not crash when schema transitions from null to populated', () => {
    // First render: schema=null → remainderFields=[] → early return
    const { rerender } = render(
      <SchemaRemainder {...baseProps} schema={null} />
    );

    // Second render: schema provided with unhandled keys → remainderFields > 0
    const schema = buildSchema(['maxConcurrent', 'workspace', 'newField']);
    expect(() => {
      rerender(<SchemaRemainder {...baseProps} schema={schema} />);
    }).not.toThrow();
  });

  it('does not crash when schema transitions from populated to null', () => {
    const schema = buildSchema(['maxConcurrent', 'workspace', 'newField']);

    const { rerender } = render(
      <SchemaRemainder {...baseProps} schema={schema} />
    );

    // Transition to null schema
    expect(() => {
      rerender(<SchemaRemainder {...baseProps} schema={null} />);
    }).not.toThrow();
  });

  it('does not crash on repeated schema transitions', () => {
    const schemaA = buildSchema(['maxConcurrent', 'workspace', 'fieldA']);
    const schemaB = buildSchema(['maxConcurrent', 'workspace', 'fieldB', 'fieldC']);

    const { rerender } = render(
      <SchemaRemainder {...baseProps} schema={null} />
    );

    // Rapid transitions: null → A → null → B → null
    expect(() => {
      rerender(<SchemaRemainder {...baseProps} schema={schemaA} />);
      rerender(<SchemaRemainder {...baseProps} schema={null} />);
      rerender(<SchemaRemainder {...baseProps} schema={schemaB} />);
      rerender(<SchemaRemainder {...baseProps} schema={null} />);
    }).not.toThrow();
  });

  // ── Rendering behavior ──

  it('returns null when all keys are handled', () => {
    const schema = buildSchema(['maxConcurrent', 'workspace']);
    const { container } = render(
      <SchemaRemainder {...baseProps} schema={schema} />
    );
    // All keys in handledKeys → nothing rendered
    expect(container.innerHTML).toBe('');
  });

  it('renders remainder fields when schema has unhandled keys', () => {
    const schema = buildSchema(['maxConcurrent', 'workspace', 'newUnhandled']);
    render(
      <SchemaRemainder {...baseProps} schema={schema} defaultOpen={true} />
    );
    // Should show the badge count
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders correct count for multiple unhandled keys', () => {
    const schema = buildSchema(['maxConcurrent', 'workspace', 'extra1', 'extra2', 'extra3']);
    render(
      <SchemaRemainder {...baseProps} schema={schema} />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('returns null when schema is null', () => {
    const { container } = render(
      <SchemaRemainder {...baseProps} schema={null} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when schema has no properties at sectionPath', () => {
    const schema = { properties: { other: { properties: {} } } };
    const { container } = render(
      <SchemaRemainder {...baseProps} schema={schema} />
    );
    expect(container.innerHTML).toBe('');
  });
});
