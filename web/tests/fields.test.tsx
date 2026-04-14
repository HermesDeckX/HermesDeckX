import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {
  TextField,
  NumberField,
  SwitchField,
  PasswordField,
  KeyValueField,
  ConfigSection,
  ConfigCard,
  AddButton,
  EmptyState,
  EditorFieldsI18nProvider,
} from '../windows/Editor/fields';

// ============================================================================
// Helper: wrap components that use EditorFieldsI18nContext
// ============================================================================
const Wrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EditorFieldsI18nProvider language="en">{children}</EditorFieldsI18nProvider>
);

// ============================================================================
// TextField
// ============================================================================
describe('TextField', () => {
  it('renders label and input with value', () => {
    render(<TextField label="Base URL" value="https://api.example.com" onChange={() => {}} />);
    expect(screen.getByText('Base URL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.example.com')).toBeInTheDocument();
  });

  it('calls onChange on input', async () => {
    const onChange = vi.fn();
    render(<TextField label="URL" value="" onChange={onChange} placeholder="Enter URL" />);
    const input = screen.getByPlaceholderText('Enter URL');
    await userEvent.type(input, 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('renders placeholder', () => {
    render(<TextField label="Test" value="" onChange={() => {}} placeholder="type here" />);
    expect(screen.getByPlaceholderText('type here')).toBeInTheDocument();
  });

  it('renders multiline textarea', () => {
    render(<TextField label="Desc" value="hello" onChange={() => {}} multiline />);
    const textarea = screen.getByDisplayValue('hello');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders tooltip when provided', () => {
    render(<TextField label="Field" value="" onChange={() => {}} tooltip="Help text" />);
    expect(screen.getByText('info')).toBeInTheDocument();
  });
});

// ============================================================================
// SwitchField
// ============================================================================
describe('SwitchField', () => {
  it('renders label', () => {
    render(<SwitchField label="Enable Feature" value={false} onChange={() => {}} />);
    expect(screen.getByText('Enable Feature')).toBeInTheDocument();
  });

  it('calls onChange with toggled value on click', () => {
    const onChange = vi.fn();
    render(<SwitchField label="Toggle" value={false} onChange={onChange} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles from true to false', () => {
    const onChange = vi.fn();
    render(<SwitchField label="Toggle" value={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

// ============================================================================
// PasswordField
// ============================================================================
describe('PasswordField', () => {
  it('renders as password input by default', () => {
    render(
      <Wrap>
        <PasswordField label="API Key" value="sk-123" onChange={() => {}} />
      </Wrap>
    );
    const input = screen.getByDisplayValue('sk-123');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles visibility on button click', () => {
    render(
      <Wrap>
        <PasswordField label="API Key" value="sk-123" onChange={() => {}} />
      </Wrap>
    );
    const input = screen.getByDisplayValue('sk-123');
    expect(input).toHaveAttribute('type', 'password');

    // Find and click the visibility toggle button
    const toggleBtn = screen.getAllByRole('button').find(b => b.querySelector('.material-symbols-outlined'));
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn!);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('calls onChange on input', async () => {
    const onChange = vi.fn();
    render(
      <Wrap>
        <PasswordField label="Key" value="" onChange={onChange} placeholder="Enter key" />
      </Wrap>
    );
    await userEvent.type(screen.getByPlaceholderText('Enter key'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });
});

// ============================================================================
// KeyValueField
// ============================================================================
describe('KeyValueField', () => {
  it('renders existing entries', () => {
    render(
      <Wrap>
        <KeyValueField
          label="Headers"
          value={{ 'X-Custom': 'val1', Authorization: 'Bearer tok' }}
          onChange={() => {}}
        />
      </Wrap>
    );
    expect(screen.getByText('X-Custom')).toBeInTheDocument();
    expect(screen.getByText('Authorization')).toBeInTheDocument();
    expect(screen.getByDisplayValue('val1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bearer tok')).toBeInTheDocument();
  });

  it('calls onChange to add a new entry', async () => {
    const onChange = vi.fn();
    render(
      <Wrap>
        <KeyValueField
          label="Headers"
          value={{}}
          onChange={onChange}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
        />
      </Wrap>
    );
    await userEvent.type(screen.getByPlaceholderText('Key'), 'X-New');
    await userEvent.type(screen.getByPlaceholderText('Value'), 'newval');
    // Click the + button
    fireEvent.click(screen.getByText('+'));
    expect(onChange).toHaveBeenCalledWith({ 'X-New': 'newval' });
  });

  it('calls onChange to delete an entry', () => {
    const onChange = vi.fn();
    render(
      <Wrap>
        <KeyValueField label="H" value={{ foo: 'bar' }} onChange={onChange} />
      </Wrap>
    );
    // Click close button
    const closeBtn = screen.getByText('close').closest('button');
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn!);
    expect(onChange).toHaveBeenCalledWith({});
  });
});

// ============================================================================
// ConfigSection
// ============================================================================
describe('ConfigSection', () => {
  it('renders title and children when defaultOpen=true', () => {
    render(
      <ConfigSection title="Models" icon="model_training">
        <span>Child content</span>
      </ConfigSection>
    );
    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('hides children when defaultOpen=false', () => {
    render(
      <ConfigSection title="Hidden" icon="lock" defaultOpen={false}>
        <span>Secret</span>
      </ConfigSection>
    );
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('toggles children on click', () => {
    render(
      <ConfigSection title="Toggle Me" icon="settings" defaultOpen={false}>
        <span>Now visible</span>
      </ConfigSection>
    );
    expect(screen.queryByText('Now visible')).not.toBeInTheDocument();

    // Click the header to expand
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Me' }));
    expect(screen.getByText('Now visible')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Me' }));
    expect(screen.queryByText('Now visible')).not.toBeInTheDocument();
  });

  it('does not collapse when collapsible=false', () => {
    render(
      <ConfigSection title="Always Open" icon="lock_open" collapsible={false}>
        <span>Always here</span>
      </ConfigSection>
    );
    expect(screen.getByText('Always here')).toBeInTheDocument();
    // No button role when not collapsible
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ============================================================================
// ConfigCard
// ============================================================================
describe('ConfigCard', () => {
  it('renders title, hides children by default (defaultOpen=false)', () => {
    render(
      <ConfigCard title="OpenAI">
        <span>Provider settings</span>
      </ConfigCard>
    );
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.queryByText('Provider settings')).not.toBeInTheDocument();
  });

  it('expands on click', () => {
    render(
      <ConfigCard title="OpenAI">
        <span>Provider settings</span>
      </ConfigCard>
    );
    fireEvent.click(screen.getByRole('button', { name: 'OpenAI' }));
    expect(screen.getByText('Provider settings')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(
      <ConfigCard title="Custom" onDelete={onDelete}>
        <span>Content</span>
      </ConfigCard>
    );
    // Find the delete button (has "delete" text from material icon)
    const deleteBtn = screen.getByText('delete').closest('button');
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn!);
    expect(onDelete).toHaveBeenCalled();
  });
});

// ============================================================================
// AddButton
// ============================================================================
describe('AddButton', () => {
  it('renders label and calls onClick', () => {
    const onClick = vi.fn();
    render(<AddButton label="Add Provider" onClick={onClick} />);
    const btn = screen.getByText('Add Provider').closest('button') || screen.getByRole('button');
    fireEvent.click(btn!);
    expect(onClick).toHaveBeenCalled();
  });
});

// ============================================================================
// EmptyState
// ============================================================================
describe('EmptyState', () => {
  it('renders message and default icon', () => {
    render(<EmptyState message="No providers configured" />);
    expect(screen.getByText('No providers configured')).toBeInTheDocument();
    expect(screen.getByText('inbox')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<EmptyState message="Empty" icon="search" />);
    expect(screen.getByText('search')).toBeInTheDocument();
  });
});
