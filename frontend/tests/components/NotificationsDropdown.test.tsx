import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import NotificationsDropdown from '../../src/components/hud/NotificationsDropdown';
import { useStore } from '../../src/store/useStore';

describe('NotificationsDropdown Component (FRO-11)', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  it('renders notification bell with pending badge count', () => {
    render(<NotificationsDropdown />);

    const bellBtn = screen.getByRole('button', { name: /Review Updates \/ Notifications/i });
    expect(bellBtn).toBeInTheDocument();

    const pendingCount = useStore.getState().graphUpdates.filter((u) => u.status === 'PENDING').length;
    expect(screen.getByText(String(pendingCount))).toBeInTheDocument();
  });

  it('opens dropdown panel on bell button click', () => {
    render(<NotificationsDropdown />);

    const bellBtn = screen.getByRole('button', { name: /Review Updates \/ Notifications/i });
    fireEvent.click(bellBtn);

    expect(screen.getByText('REVIEW QUEUE')).toBeInTheDocument();
    expect(screen.getByText('Backpropagation & Autograd Refinement')).toBeInTheDocument();
    expect(screen.getByText('Binary Search Trees Complexity Guarantees')).toBeInTheDocument();
  });

  it('filters updates by tab (PENDING, FEEDBACK, ALL)', () => {
    useStore.setState({
      isNotificationsOpen: true,
      graphUpdates: [
        {
          id: 'U-1',
          title: 'Pending Item',
          description: 'Desc 1',
          category: 'AI & ML',
          type: 'NOTE_UPDATE',
          status: 'PENDING',
          createdAt: '1m ago',
          targetId: 'T-1',
          targetName: 'Topic 1',
          oldContent: '',
          newContent: ''
        },
        {
          id: 'U-2',
          title: 'Feedback Item',
          description: 'Desc 2',
          category: 'CS',
          type: 'TOPIC_UPDATE',
          status: 'CHANGES_REQUESTED',
          createdAt: '2m ago',
          targetId: 'T-2',
          targetName: 'Topic 2',
          oldContent: '',
          newContent: ''
        }
      ]
    });

    render(<NotificationsDropdown />);

    // PENDING Tab active by default
    expect(screen.getByText('Pending Item')).toBeInTheDocument();
    expect(screen.queryByText('Feedback Item')).not.toBeInTheDocument();

    // Click FEEDBACK tab
    const feedbackTab = screen.getByText('FEEDBACK');
    fireEvent.click(feedbackTab);

    expect(screen.queryByText('Pending Item')).not.toBeInTheDocument();
    expect(screen.getByText('Feedback Item')).toBeInTheDocument();

    // Click ALL tab
    const allTab = screen.getByText('ALL');
    fireEvent.click(allTab);

    expect(screen.getByText('Pending Item')).toBeInTheDocument();
    expect(screen.getByText('Feedback Item')).toBeInTheDocument();
  });

  it('clicking Review Diff sets activeDiffUpdateId and closes dropdown', () => {
    useStore.setState({ isNotificationsOpen: true });
    render(<NotificationsDropdown />);

    const reviewDiffBtns = screen.getAllByText('Review Diff');
    fireEvent.click(reviewDiffBtns[0]);

    expect(useStore.getState().activeDiffUpdateId).toBe('UPDATE-001');
    expect(useStore.getState().isNotificationsOpen).toBe(false);
  });

  it('quick approve button approves update immediately', () => {
    useStore.setState({ isNotificationsOpen: true });
    render(<NotificationsDropdown />);

    const quickApproveBtns = screen.getAllByRole('button', { name: /Quick Approve & Merge/i });
    fireEvent.click(quickApproveBtns[0]);

    const updated = useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001');
    expect(updated?.status).toBe('APPROVED');
  });

  it('quick reject button rejects update immediately', () => {
    useStore.setState({ isNotificationsOpen: true });
    render(<NotificationsDropdown />);

    const quickRejectBtns = screen.getAllByRole('button', { name: /Quick Reject/i });
    fireEvent.click(quickRejectBtns[0]);

    const updated = useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001');
    expect(updated?.status).toBe('REJECTED');
  });

  it('renders empty state when no updates match filter', () => {
    useStore.setState({
      isNotificationsOpen: true,
      graphUpdates: []
    });

    render(<NotificationsDropdown />);

    expect(screen.getByText('All neural feeds synchronized')).toBeInTheDocument();
    expect(screen.getByText('0 updates in current view')).toBeInTheDocument();
  });
});
