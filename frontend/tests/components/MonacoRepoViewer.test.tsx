import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MonacoRepoViewer, detectMonacoLanguage } from '../../src/components/code_repo/MonacoRepoViewer';

describe('MonacoRepoViewer', () => {
  it('detectMonacoLanguage maps file extensions accurately', () => {
    expect(detectMonacoLanguage('index.ts')).toBe('typescript');
    expect(detectMonacoLanguage('App.tsx')).toBe('typescript');
    expect(detectMonacoLanguage('script.js')).toBe('javascript');
    expect(detectMonacoLanguage('server.py')).toBe('python');
    expect(detectMonacoLanguage('kernel.c')).toBe('c');
    expect(detectMonacoLanguage('header.h')).toBe('c');
    expect(detectMonacoLanguage('driver.cpp')).toBe('cpp');
    expect(detectMonacoLanguage('main.rs')).toBe('rust');
    expect(detectMonacoLanguage('worker.go')).toBe('go');
    expect(detectMonacoLanguage('schema.sql')).toBe('sql');
    expect(detectMonacoLanguage('rpc.proto')).toBe('protobuf');
    expect(detectMonacoLanguage('README.md')).toBe('markdown');
    expect(detectMonacoLanguage('config.json')).toBe('json');
    expect(detectMonacoLanguage('style.css')).toBe('css');
    expect(detectMonacoLanguage('page.html')).toBe('html');
    expect(detectMonacoLanguage('LICENSE')).toBe('plaintext');
  });

  it('renders tab bar with open files and highlights active file', () => {
    const onSelectFile = vi.fn();
    const onCloseFile = vi.fn();

    render(
      <MonacoRepoViewer
        openFiles={['src/index.ts', 'README.md']}
        activeFilePath="src/index.ts"
        fileContent="console.log('hello');"
        onSelectFile={onSelectFile}
        onCloseFile={onCloseFile}
      />
    );

    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();

    // Click tab to switch file
    fireEvent.click(screen.getByText('README.md'));
    expect(onSelectFile).toHaveBeenCalledWith('README.md');

    // Click close button
    const closeBtn = screen.getByTestId('close-tab-src-index.ts');
    fireEvent.click(closeBtn);
    expect(onCloseFile).toHaveBeenCalledWith('src/index.ts');
  });

  it('renders placeholder when no file is active', () => {
    render(
      <MonacoRepoViewer
        openFiles={[]}
        activeFilePath={null}
        fileContent=""
        onSelectFile={vi.fn()}
        onCloseFile={vi.fn()}
      />
    );

    expect(
      screen.getByText('Select a file from the repository tree to begin studying')
    ).toBeInTheDocument();
  });

  it('renders editor container with file content when active file is provided', () => {
    render(
      <MonacoRepoViewer
        openFiles={['src/index.ts']}
        activeFilePath="src/index.ts"
        fileContent="const x: number = 42;"
        onSelectFile={vi.fn()}
        onCloseFile={vi.fn()}
      />
    );

    expect(screen.getByTestId('monaco-editor-container')).toBeInTheDocument();
    expect(screen.getByTestId('monaco-editor-textarea')).toHaveValue('const x: number = 42;');
  });

  it('shows Mac mini truncation banner when isTruncated is true', () => {
    render(
      <MonacoRepoViewer
        openFiles={['huge.log']}
        activeFilePath="huge.log"
        fileContent="partial content..."
        isTruncated={true}
        onSelectFile={vi.fn()}
        onCloseFile={vi.fn()}
      />
    );

    expect(
      screen.getByText('File exceeds 1MB and was truncated to protect Mac mini memory.')
    ).toBeInTheDocument();
  });

  it('shows loading message when isLoading is true', () => {
    render(
      <MonacoRepoViewer
        openFiles={['main.c']}
        activeFilePath="main.c"
        fileContent=""
        isLoading={true}
        onSelectFile={vi.fn()}
        onCloseFile={vi.fn()}
      />
    );

    expect(screen.getByText('Fetching file blob...')).toBeInTheDocument();
  });
});
