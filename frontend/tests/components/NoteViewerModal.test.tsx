import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NoteViewerModal from '../../src/components/hud/NoteViewerModal';
import { useStore } from '../../src/store/useStore';

describe('NoteViewerModal Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  it('renders nothing when activeNote is null', () => {
    const { container } = render(<NoteViewerModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders note header, title, formatted markdown, tables, blockquotes, and inline code', async () => {
    const mockNote = {
      id: 'NOTE-001',
      title: 'Neural Networks Note',
      content: '# Heading 1\n\n> Important quote block\n\nInline math: $E=mc^2$\n\nInline `variable_name` code.\n\n| Param | Value |\n| --- | --- |\n| lr | 0.001 |\n\n```python\nprint("hello world")\n```'
    };

    useStore.getState().setActiveNote(mockNote);
    render(<NoteViewerModal />);

    expect(screen.getByText('Neural Networks Note')).toBeInTheDocument();
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Important quote block')).toBeInTheDocument();
    expect(screen.getByText('variable_name')).toBeInTheDocument();
    expect(screen.getByText('lr')).toBeInTheDocument();
    expect(screen.getByText('PYTHON')).toBeInTheDocument();
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    const mockNote = {
      id: 'NOTE-002',
      title: 'Code Snippet Note',
      content: '```javascript\nconst a = 10;\n```'
    };

    useStore.getState().setActiveNote(mockNote);
    render(<NoteViewerModal />);

    const copyBtn = screen.getByTitle('Copy code snippet');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const a = 10;');
    await waitFor(() => {
      expect(screen.getByText('COPIED')).toBeInTheDocument();
    });
  });

  it('copies entire note content in view mode when footer copy button is clicked', async () => {
    const mockNote = {
      id: 'NOTE-VIEW-1',
      title: 'Full Note View',
      content: 'Full body content to copy'
    };

    useStore.getState().setActiveNote(mockNote, false);
    render(<NoteViewerModal />);

    const copyFooterBtn = screen.getByTitle('Copy note content');
    fireEvent.click(copyFooterBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Full body content to copy');
    await waitFor(() => {
      expect(screen.getByText('COPIED')).toBeInTheDocument();
    });
  });

  it('allows switching to edit mode, typing in textarea, and saving changes to topic note', async () => {
    const targetTopic = useStore.getState().topicNodes[0];
    useStore.getState().setSelectedTopicId(targetTopic.id);
    useStore.getState().setActiveNote({ id: '', title: '', content: '' }, true);

    render(<NoteViewerModal />);

    const titleInput = screen.getByPlaceholderText('Note title...');
    fireEvent.change(titleInput, { target: { value: 'New Test Note' } });

    const contentTextarea = screen.getByPlaceholderText('Start typing your note here...');
    fireEvent.change(contentTextarea, { target: { value: 'Body of the new test note.' } });

    const saveButton = screen.getByText('SAVE NOTE');
    fireEvent.click(saveButton);

    const topic = useStore.getState().topicNodes.find((n) => n.id === targetTopic.id);
    const added = topic?.notes?.find((n) => n.title === 'New Test Note');
    expect(added).toBeDefined();
    expect(added?.content).toBe('Body of the new test note.');
  });

  it('updates an existing note in topic and persists changes on save', async () => {
    const targetTopic = useStore.getState().topicNodes[0];
    const existingNote = targetTopic.notes?.[0]!;
    useStore.getState().setSelectedTopicId(targetTopic.id);
    useStore.getState().setActiveNote(existingNote, true);

    render(<NoteViewerModal />);

    const titleInput = screen.getByPlaceholderText('Note title...');
    fireEvent.change(titleInput, { target: { value: 'Modified Existing Note' } });

    const saveButton = screen.getByText('SAVE NOTE');
    fireEvent.click(saveButton);

    const topic = useStore.getState().topicNodes.find((n) => n.id === targetTopic.id);
    const updated = topic?.notes?.find((n) => n.id === existingNote.id);
    expect(updated?.title).toBe('Modified Existing Note');
  });

  it('switches between WRITE and PREVIEW tabs in edit mode', async () => {
    const targetTopic = useStore.getState().topicNodes[0];
    useStore.getState().setSelectedTopicId(targetTopic.id);
    useStore.getState().setActiveNote({ id: 'NOTE-99', title: 'Preview Note', content: '### Live Markdown Header' }, true);

    render(<NoteViewerModal />);

    // Switch to PREVIEW tab
    const previewTabBtn = screen.getByRole('button', { name: /PREVIEW/i });
    fireEvent.click(previewTabBtn);

    expect(screen.getByText('Live Markdown Header')).toBeInTheDocument();

    // Switch back to WRITE tab
    const writeTabBtn = screen.getByRole('button', { name: /WRITE/i });
    fireEvent.click(writeTabBtn);

    expect(screen.getByPlaceholderText('Start typing your note here...')).toBeInTheDocument();
  });

  it('deletes a note when user confirms deletion prompt', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const topic = useStore.getState().topicNodes[0];
    const note = topic.notes?.[0];
    expect(note).toBeDefined();

    if (note) {
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setActiveNote(note, true);

      render(<NoteViewerModal />);

      const deleteBtn = screen.getByTitle('Delete this note');
      fireEvent.click(deleteBtn);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this note?');
      expect(useStore.getState().activeNote).toBeNull();
    }
    confirmSpy.mockRestore();
  });

  it('aborts note deletion when user cancels confirmation prompt', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const topic = useStore.getState().topicNodes[0];
    const note = topic.notes?.[0];

    if (note) {
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setActiveNote(note, true);

      render(<NoteViewerModal />);

      const deleteBtn = screen.getByTitle('Delete this note');
      fireEvent.click(deleteBtn);

      expect(confirmSpy).toHaveBeenCalled();
      expect(useStore.getState().activeNote?.id).toBe(note.id);
    }
    confirmSpy.mockRestore();
  });

  it('cancels edit mode on existing note by reverting to view mode', () => {
    const note = { id: 'NOTE-1', title: 'Existing Note', content: 'Body' };
    useStore.getState().setActiveNote(note, true);

    render(<NoteViewerModal />);

    const cancelBtn = screen.getByRole('button', { name: /CANCEL/i });
    fireEvent.click(cancelBtn);

    expect(useStore.getState().isNoteEditing).toBe(false);
    expect(useStore.getState().activeNote?.id).toBe('NOTE-1');
  });

  it('cancels newly created note by dismissing modal completely', () => {
    useStore.getState().setActiveNote({ id: '', title: '', content: '' }, true);

    render(<NoteViewerModal />);

    const cancelBtn = screen.getByRole('button', { name: /CANCEL/i });
    fireEvent.click(cancelBtn);

    expect(useStore.getState().activeNote).toBeNull();
  });

  it('renders empty note fallback state with prompt to write content', () => {
    useStore.getState().setActiveNote({ id: 'NOTE-EMPTY', title: 'Empty Note', content: '' }, true);
    render(<NoteViewerModal />);

    // Switch to PREVIEW tab to see empty placeholder
    fireEvent.click(screen.getByRole('button', { name: /PREVIEW/i }));
    expect(screen.getByText('This note file is currently empty.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Write Some Content'));
    expect(screen.getByPlaceholderText('Start typing your note here...')).toBeInTheDocument();
  });

  it('closes modal when top right close button is clicked in view mode', () => {
    useStore.getState().setActiveNote({ id: 'NOTE-1', title: 'Test Note', content: 'Body' }, false);
    render(<NoteViewerModal />);

    const closeBtn = screen.getByTitle('Close (ESC)');
    fireEvent.click(closeBtn);

    expect(useStore.getState().activeNote).toBeNull();
  });

  it('closes modal on Escape key press when not editing', () => {
    useStore.getState().setActiveNote({ id: 'NOTE-1', title: 'Test Note', content: 'Body' });
    render(<NoteViewerModal />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(useStore.getState().activeNote).toBeNull();
  });
});
