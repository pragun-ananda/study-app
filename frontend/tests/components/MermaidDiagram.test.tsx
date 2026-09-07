import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MermaidDiagram } from '../../src/components/hud/MermaidDiagram';
import mermaid from 'mermaid';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn()
  }
}));

describe('MermaidDiagram Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders diagram SVG successfully when mermaid.render succeeds', async () => {
    (mermaid.render as any).mockResolvedValueOnce({
      svg: '<svg data-testid="mermaid-svg"><g><text>Node A</text></g></svg>'
    });

    render(
      <MermaidDiagram
        codeString={`flowchart TD\n  A[Start] --> B[End]`}
      />
    );

    expect(await screen.findByText('MERMAID DIAGRAM')).toBeInTheDocument();
    expect(screen.getByText('VIEW CODE')).toBeInTheDocument();

    // Toggle to CODE view
    fireEvent.click(screen.getByText('VIEW CODE'));
    expect(screen.getByText('SHOW DIAGRAM')).toBeInTheDocument();
    expect(screen.getByText('MERMAID CODE')).toBeInTheDocument();
  });

  it('handles mermaid.render errors gracefully and renders error banner with syntax highlighter fallback', async () => {
    (mermaid.render as any).mockRejectedValueOnce(new Error('Parse error on line 2'));

    render(
      <MermaidDiagram
        codeString={`invalid diagram string`}
      />
    );

    expect(await screen.findByText(/MERMAID CODE \(SYNTAX ERROR\)/i)).toBeInTheDocument();
    expect(screen.getByText('Parse error on line 2')).toBeInTheDocument();
  });
});
