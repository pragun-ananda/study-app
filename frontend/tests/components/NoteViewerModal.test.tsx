import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
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

  it('renders note header, title, and formatted markdown content', async () => {
    const mockNote = {
      id: 'NOTE-001',
      title: 'Neural Networks Note',
      content: '# Heading 1\n\nInline math: $E=mc^2$\n\n```python\nprint("hello world")\n```'
    };

    useStore.getState().setActiveNote(mockNote);
    render(<NoteViewerModal />);

    expect(screen.getByText('Neural Networks Note')).toBeInTheDocument();
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
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

  it('allows switching to edit mode and saving changes to topic note', async () => {
    const targetTopic = useStore.getState().topicNodes[0];
    useStore.getState().setSelectedTopicId(targetTopic.id);
    useStore.getState().setActiveNote({ id: '', title: '', content: '' }, true);

    render(<NoteViewerModal />);

    const titleInput = screen.getByPlaceholderText('Note title...');
    fireEvent.change(titleInput, { target: { value: 'New Test Note' } });

    const saveButton = screen.getByText('SAVE NOTE');
    fireEvent.click(saveButton);

    const topic = useStore.getState().topicNodes.find((n) => n.id === targetTopic.id);
    const added = topic?.notes?.find((n) => n.title === 'New Test Note');
    expect(added).toBeDefined();
  });

  it('closes modal on Escape key press when not editing', () => {
    useStore.getState().setActiveNote({ id: 'NOTE-1', title: 'Test Note', content: 'Body' });
    render(<NoteViewerModal />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(useStore.getState().activeNote).toBeNull();
  });
});
