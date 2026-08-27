import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../src/store/useStore';

describe('Zustand Store - Graph Updates & Diff Review (FRO-11)', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  it('initializes with default mock updates in PENDING status', () => {
    const updates = useStore.getState().graphUpdates;
    expect(updates.length).toBeGreaterThanOrEqual(3);
    expect(updates.every((u) => u.status === 'PENDING')).toBe(true);
    expect(useStore.getState().activeDiffUpdateId).toBeNull();
    expect(useStore.getState().isNotificationsOpen).toBe(false);
  });

  it('sets activeDiffUpdateId and toggles notifications dropdown', () => {
    useStore.getState().setIsNotificationsOpen(true);
    expect(useStore.getState().isNotificationsOpen).toBe(true);

    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    expect(useStore.getState().activeDiffUpdateId).toBe('UPDATE-001');
  });

  it('approving a NOTE_UPDATE updates matching note content and sets status to APPROVED', () => {
    // 1. Setup a test topic with a note
    const topicId = 'TOPIC-TEST-1';
    const noteId = 'NOTE-TEST-1';
    useStore.setState({
      topicNodes: [
        {
          id: topicId,
          name: 'Test Topic',
          category: 'AI & ML',
          mastery: 50,
          status: 'LEARNING',
          lastReviewed: 'Yesterday',
          coordinates: [0, 0, 0],
          prerequisites: [],
          unlocks: [],
          summary: 'Initial summary',
          notes: [
            {
              id: noteId,
              title: 'Initial Note',
              content: 'Old note content'
            }
          ]
        }
      ],
      graphUpdates: [
        {
          id: 'UP-NOTE-1',
          title: 'Update Note Test',
          description: 'Testing note update approval',
          category: 'AI & ML',
          type: 'NOTE_UPDATE',
          status: 'PENDING',
          createdAt: '1m ago',
          targetId: noteId,
          targetName: 'Test Topic',
          oldContent: 'Old note content',
          newContent: 'New updated note content',
          payload: {
            topicId,
            noteId
          }
        }
      ]
    });

    useStore.getState().approveGraphUpdate('UP-NOTE-1');

    const updatedState = useStore.getState();
    const updatedTopic = updatedState.topicNodes.find((t) => t.id === topicId);
    const updatedNote = updatedTopic?.notes?.find((n) => n.id === noteId);

    expect(updatedNote?.content).toBe('New updated note content');
    expect(updatedNote?.updatedAt).toBe('Just now');
    expect(updatedState.graphUpdates[0].status).toBe('APPROVED');
    expect(updatedState.activeDiffUpdateId).toBeNull();
    expect(updatedState.selectedTopicId).toBe(topicId);
    expect(updatedState.isInspectorOpen).toBe(true);
  });

  it('approving a TOPIC_UPDATE updates topic summary/patch and sets status to APPROVED', () => {
    const topicId = 'TOPIC-TEST-2';
    useStore.setState({
      topicNodes: [
        {
          id: topicId,
          name: 'BST',
          category: 'CS',
          mastery: 60,
          status: 'LEARNING',
          lastReviewed: 'Today',
          coordinates: [10, 10, 10],
          prerequisites: [],
          unlocks: [],
          summary: 'Old BST summary'
        }
      ],
      graphUpdates: [
        {
          id: 'UP-TOPIC-1',
          title: 'Update Topic Test',
          description: 'Testing topic update',
          category: 'CS',
          type: 'TOPIC_UPDATE',
          status: 'PENDING',
          createdAt: '5m ago',
          targetId: topicId,
          targetName: 'BST',
          oldContent: 'Old BST summary',
          newContent: 'New BST balanced summary',
          payload: {
            topicId,
            patch: { summary: 'New BST balanced summary' }
          }
        }
      ]
    });

    useStore.getState().approveGraphUpdate('UP-TOPIC-1');

    const updatedState = useStore.getState();
    const updatedTopic = updatedState.topicNodes.find((t) => t.id === topicId);

    expect(updatedTopic?.summary).toBe('New BST balanced summary');
    expect(updatedState.graphUpdates[0].status).toBe('APPROVED');
  });

  it('approving an EDGE_UPDATE bidirectionally links prerequisites and unlocks', () => {
    const fromId = 'TOPIC-FROM';
    const toId = 'TOPIC-TO';
    useStore.setState({
      topicNodes: [
        {
          id: fromId,
          name: 'Linear Algebra',
          category: 'MATH',
          mastery: 90,
          status: 'MASTERED',
          lastReviewed: 'Today',
          coordinates: [0, 0, 0],
          prerequisites: [],
          unlocks: [],
          summary: 'Math'
        },
        {
          id: toId,
          name: 'SVD',
          category: 'MATH',
          mastery: 30,
          status: 'LEARNING',
          lastReviewed: 'Today',
          coordinates: [5, 5, 5],
          prerequisites: [],
          unlocks: [],
          summary: 'SVD'
        }
      ],
      graphUpdates: [
        {
          id: 'UP-EDGE-1',
          title: 'Update Edge Test',
          description: 'Testing edge prerequisite',
          category: 'MATH',
          type: 'EDGE_UPDATE',
          status: 'PENDING',
          createdAt: '10m ago',
          targetId: toId,
          targetName: 'SVD',
          oldContent: 'None',
          newContent: 'Linear Algebra -> SVD',
          payload: {
            edge: { fromId, toId }
          }
        }
      ]
    });

    useStore.getState().approveGraphUpdate('UP-EDGE-1');

    const updatedNodes = useStore.getState().topicNodes;
    const fromNode = updatedNodes.find((n) => n.id === fromId);
    const toNode = updatedNodes.find((n) => n.id === toId);

    expect(toNode?.prerequisites).toContain(fromId);
    expect(fromNode?.unlocks).toContain(toId);
    expect(useStore.getState().graphUpdates[0].status).toBe('APPROVED');
  });

  it('rejecting an update sets status to REJECTED without mutating topic nodes', () => {
    const initialSummary = 'Original unchanged summary';
    useStore.setState({
      topicNodes: [
        {
          id: 'TOPIC-001',
          name: 'Backprop',
          category: 'AI & ML',
          mastery: 40,
          status: 'LEARNING',
          lastReviewed: 'Today',
          coordinates: [0, 0, 0],
          prerequisites: [],
          unlocks: [],
          summary: initialSummary
        }
      ],
      graphUpdates: [
        {
          id: 'UP-REJECT-1',
          title: 'Reject Test',
          description: 'Testing reject',
          category: 'AI & ML',
          type: 'TOPIC_UPDATE',
          status: 'PENDING',
          createdAt: '1m ago',
          targetId: 'TOPIC-001',
          targetName: 'Backprop',
          oldContent: initialSummary,
          newContent: 'Rejected content proposal',
          payload: {
            topicId: 'TOPIC-001',
            patch: { summary: 'Rejected content proposal' }
          }
        }
      ]
    });

    useStore.getState().rejectGraphUpdate('UP-REJECT-1');

    const updatedState = useStore.getState();
    expect(updatedState.graphUpdates[0].status).toBe('REJECTED');
    expect(updatedState.topicNodes[0].summary).toBe(initialSummary);
  });

  it('requesting changes updates status to CHANGES_REQUESTED and preserves comments', () => {
    useStore.getState().requestChangesGraphUpdate('UPDATE-001', [
      {
        id: 'C-1',
        lineNumber: 5,
        selectedText: 'Formula',
        comment: 'Please check derivative sign.',
        createdAt: 'Just now'
      }
    ], 'Top level feedback note');

    const updated = useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001');
    expect(updated?.status).toBe('CHANGES_REQUESTED');
    expect(updated?.comments).toHaveLength(1);
    expect(updated?.comments?.[0].comment).toBe('Please check derivative sign.');
    expect(updated?.generalFeedback).toBe('Top level feedback note');
  });

  it('adds and deletes review comments on an update', () => {
    const updateId = 'UPDATE-002';
    useStore.getState().addCommentToUpdate(updateId, {
      lineNumber: 1,
      selectedText: 'BST',
      comment: 'Add AVL worst case note.'
    });

    let update = useStore.getState().graphUpdates.find((u) => u.id === updateId);
    expect(update?.comments).toHaveLength(1);
    const commentId = update?.comments?.[0].id!;

    useStore.getState().deleteCommentFromUpdate(updateId, commentId);
    update = useStore.getState().graphUpdates.find((u) => u.id === updateId);
    expect(update?.comments).toHaveLength(0);
  });

  it('resets graph updates back to initial mock updates', () => {
    useStore.getState().approveGraphUpdate('UPDATE-001');
    expect(useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001')?.status).toBe('APPROVED');

    useStore.getState().resetGraphUpdates();
    expect(useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001')?.status).toBe('PENDING');
  });
});
