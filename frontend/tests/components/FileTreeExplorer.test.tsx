import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileTreeExplorer, getFileIcon } from '../../src/components/code_repo/FileTreeExplorer';
import { RepoTreeNode, CodeAnnotationDTO } from '../../src/types/telemetry';

describe('FileTreeExplorer', () => {
  const sampleTree: RepoTreeNode[] = [
    {
      path: 'README.md',
      name: 'README.md',
      type: 'file',
      size: 150
    },
    {
      path: 'src',
      name: 'src',
      type: 'dir',
      children: [
        {
          path: 'src/index.ts',
          name: 'index.ts',
          type: 'file',
          size: 400
        },
        {
          path: 'src/utils',
          name: 'utils',
          type: 'dir',
          children: [
            {
              path: 'src/utils/math.ts',
              name: 'math.ts',
              type: 'file',
              size: 200
            }
          ]
        }
      ]
    }
  ];

  const sampleAnnotations: CodeAnnotationDTO[] = [
    {
      id: 'ANN-1',
      repositoryId: 'REPO-1',
      commitSha: 'abc',
      filePath: 'src/index.ts',
      startLine: 1,
      endLine: 10,
      title: 'Bootstrap Entrypoint',
      content: 'Initializes the client application runtime.',
      anchorCodeSnippet: 'export function init() {}',
      designCategory: 'ARCHITECTURE',
      aiExplanation: null,
      topicId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  it('renders root files and directories properly', () => {
    const onSelectFile = vi.fn();
    render(
      <FileTreeExplorer
        tree={sampleTree}
        activeFilePath={null}
        annotations={[]}
        onSelectFile={onSelectFile}
      />
    );

    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument();
  });

  it('calls onSelectFile when a file is clicked', () => {
    const onSelectFile = vi.fn();
    render(
      <FileTreeExplorer
        tree={sampleTree}
        activeFilePath={null}
        annotations={[]}
        onSelectFile={onSelectFile}
      />
    );

    const readmeNode = screen.getByText('README.md');
    fireEvent.click(readmeNode);
    expect(onSelectFile).toHaveBeenCalledWith('README.md');
  });

  it('toggles folder expansion on directory click', () => {
    const onSelectFile = vi.fn();
    render(
      <FileTreeExplorer
        tree={sampleTree}
        activeFilePath={null}
        annotations={[]}
        onSelectFile={onSelectFile}
      />
    );

    // 'src' is default expanded in FileTreeExplorer initial state
    expect(screen.getByText('index.ts')).toBeInTheDocument();

    // Click 'src' directory to collapse
    const srcDir = screen.getByText('src');
    fireEvent.click(srcDir);

    expect(screen.queryByText('index.ts')).not.toBeInTheDocument();

    // Click again to re-expand
    fireEvent.click(srcDir);
    expect(screen.getByText('index.ts')).toBeInTheDocument();
  });

  it('filters tree to matching files when search input is typed', () => {
    const onSelectFile = vi.fn();
    render(
      <FileTreeExplorer
        tree={sampleTree}
        activeFilePath={null}
        annotations={[]}
        onSelectFile={onSelectFile}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'math' } });

    // Should only show math.ts and hide README.md
    expect(screen.getByText('math.ts')).toBeInTheDocument();
    expect(screen.queryByText('README.md')).not.toBeInTheDocument();

    // Clearing search restores README.md
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('shows annotation count badge next to files with notes', () => {
    const onSelectFile = vi.fn();
    render(
      <FileTreeExplorer
        tree={sampleTree}
        activeFilePath={null}
        annotations={sampleAnnotations}
        onSelectFile={onSelectFile}
      />
    );

    // 'src/index.ts' has 1 annotation
    expect(screen.getByTitle('1 note')).toBeInTheDocument();
    expect(screen.getByTitle('1 note')).toHaveTextContent('1');
  });

  it('getFileIcon returns valid icon element across common languages', () => {
    expect(getFileIcon('index.ts')).toBeTruthy();
    expect(getFileIcon('script.py')).toBeTruthy();
    expect(getFileIcon('main.rs')).toBeTruthy();
    expect(getFileIcon('server.go')).toBeTruthy();
    expect(getFileIcon('doc.md')).toBeTruthy();
    expect(getFileIcon('data.json')).toBeTruthy();
    expect(getFileIcon('unknown.xyz')).toBeTruthy();
  });
});
