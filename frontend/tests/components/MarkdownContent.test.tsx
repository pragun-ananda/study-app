import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarkdownContent from '../../src/components/hud/MarkdownContent';

describe('MarkdownContent Component', () => {
  it('renders nothing when content is empty', () => {
    const { container } = render(<MarkdownContent content="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders headings, paragraphs, and lists cleanly', () => {
    const markdown = `
# Topic Header
## Subtopic Heading
### Mechanism Details

This is an architectural overview of LSM trees.

- Append-only writes
- Immutable SSTables
- Background compaction
`;
    render(<MarkdownContent content={markdown} accentColor="#00f0ff" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Topic Header');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Subtopic Heading');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Mechanism Details');
    expect(screen.getByText(/This is an architectural overview/i)).toBeInTheDocument();
    expect(screen.getByText('Append-only writes')).toBeInTheDocument();
    expect(screen.getByText('Immutable SSTables')).toBeInTheDocument();
    expect(screen.getByText('Background compaction')).toBeInTheDocument();
  });

  it('renders structured tables with headers and cell borders', () => {
    const markdown = `
| Feature | LSM Tree | B-Tree |
| :--- | :--- | :--- |
| Write Latency | Low (Sequential) | High (Random) |
| Read Latency | Moderate | Fast |
`;
    render(<MarkdownContent content={markdown} accentColor="#00f0ff" />);

    expect(screen.getByText('Feature')).toBeInTheDocument();
    expect(screen.getByText('LSM Tree')).toBeInTheDocument();
    expect(screen.getByText('B-Tree')).toBeInTheDocument();
    expect(screen.getByText('Low (Sequential)')).toBeInTheDocument();
    expect(screen.getByText('High (Random)')).toBeInTheDocument();
  });

  it('renders inline code and code block with language header and copy button', () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
      }
    });

    const markdown = `
Here is \`inlineCode\` and a block:

\`\`\`typescript
const memtable = new SkipList();
\`\`\`
`;
    render(<MarkdownContent content={markdown} accentColor="#00f0ff" />);

    expect(screen.getByText('inlineCode')).toBeInTheDocument();
    expect(screen.getByText('TYPESCRIPT')).toBeInTheDocument();
    expect(screen.getByText('COPY')).toBeInTheDocument();

    const copyBtn = screen.getByText('COPY');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('SkipList'));
  });

  it('renders Mermaid diagram code fences properly', async () => {
    const markdown = `
\`\`\`mermaid
flowchart TD
  A[Write] --> B[WAL]
\`\`\`
`;
    render(<MarkdownContent content={markdown} accentColor="#00f0ff" />);

    expect(await screen.findByText(/MERMAID/i)).toBeInTheDocument();
  });

  it('renders Wikipedia-style app:// and concept:// interactive link buttons and triggers callbacks', () => {
    const onNavigateApp = vi.fn();
    const onNavigateConcept = vi.fn();

    const markdown = `
Here is a reference to [Dynamo & Cassandra](app://APP-001) and [Consistent Hashing](concept://Consistent%20Hashing%20%26%20DHT) and an [External Page](https://example.com).
`;
    render(
      <MarkdownContent
        content={markdown}
        onNavigateApplication={onNavigateApp}
        onNavigateConcept={onNavigateConcept}
      />
    );

    // App link button
    const appBtn = screen.getByTestId('wiki-link-app-APP-001');
    expect(appBtn).toBeInTheDocument();
    expect(appBtn).toHaveTextContent('Dynamo & Cassandra');
    fireEvent.click(appBtn);
    expect(onNavigateApp).toHaveBeenCalledWith('APP-001');

    // Concept link button (decoded target)
    const conceptBtn = screen.getByTestId('wiki-link-concept-Consistent Hashing & DHT');
    expect(conceptBtn).toBeInTheDocument();
    expect(conceptBtn).toHaveTextContent('Consistent Hashing');
    fireEvent.click(conceptBtn);
    expect(onNavigateConcept).toHaveBeenCalledWith('Consistent Hashing & DHT');

    // External link
    const extLink = screen.getByText('External Page');
    expect(extLink.closest('a')).toHaveAttribute('href', 'https://example.com');
  });

  it('correctly handles raw concept links with unencoded spaces and nested parentheses', () => {
    const onNavigateConcept = vi.fn();
    const markdown = `
Modern [Retrieval-Augmented Generation (RAG)](concept://Retrieval-Augmented Generation (RAG)) goes far beyond simple search.
Also see [Consistent Hashing & DHT](concept://Consistent Hashing & DHT) for distributed routing.
`;
    render(
      <MarkdownContent
        content={markdown}
        onNavigateConcept={onNavigateConcept}
      />
    );

    const ragBtn = screen.getByTestId('wiki-link-concept-Retrieval-Augmented Generation (RAG)');
    expect(ragBtn).toBeInTheDocument();
    expect(ragBtn).toHaveTextContent('Retrieval-Augmented Generation (RAG)');
    fireEvent.click(ragBtn);
    expect(onNavigateConcept).toHaveBeenCalledWith('Retrieval-Augmented Generation (RAG)');

    const chBtn = screen.getByTestId('wiki-link-concept-Consistent Hashing & DHT');
    expect(chBtn).toBeInTheDocument();
    expect(chBtn).toHaveTextContent('Consistent Hashing & DHT');
    fireEvent.click(chBtn);
    expect(onNavigateConcept).toHaveBeenCalledWith('Consistent Hashing & DHT');
  });
});
