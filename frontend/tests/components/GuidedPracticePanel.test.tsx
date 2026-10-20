import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GuidedPracticePanel from '../../src/components/hud/GuidedPracticePanel';
import * as api from '../../src/api/client';

vi.mock('../../src/api/client', () => ({
  fetchInterviewLearningPath: vi.fn(),
  fetchInterviewLearningAttempts: vi.fn(),
  recordInterviewLearningEvent: vi.fn(),
  startInterviewLearningAttempt: vi.fn()
}));

const pilotPath = {
  problemId: 'PROB-TRAPPING-RAIN-WATER',
  version: 1,
  publicationStatus: 'PILOT' as const,
  interpretation: { goal: 'Compute trapped water.', constraints: ['O(n) time', 'O(1) space'], observations: [] },
  concepts: [{
    id: 'bound', name: 'Water bound', intuition: 'The shorter wall limits water.', relevance: 'Sets depth.',
    diagnosticQuestion: 'What bounds water?', diagnosticSuccessCriteria: 'The shorter wall.'
  }],
  reasoningStages: [{
    id: 'derive', title: 'Derive the bound', purpose: 'Find water depth.', learnerPrompt: 'How much water is above one bar?',
    hint: 'Compare both walls.', expectedOutcome: 'Use the shorter wall.', verificationCriteria: ['Use min of left and right maxima.']
  }],
  misconceptions: [], implementationPlan: [], edgeCases: [], alternatives: [],
  transferExercise: { prompt: 'Use variable bar widths.', changedConstraint: 'Multiply depth by width.', assessmentCriteria: ['Preserve the boundary argument.'] },
  assessmentRubric: [], resources: [], qualityReview: { status: 'PILOT_REVIEWED' as const, notes: [] }
};

describe('GuidedPracticePanel', () => {
  beforeEach(() => {
    vi.mocked(api.fetchInterviewLearningPath).mockResolvedValue(pilotPath);
    vi.mocked(api.startInterviewLearningAttempt).mockResolvedValue({
      id: 'ATTEMPT-1', problemId: pilotPath.problemId, pathVersion: 1, startedAt: new Date().toISOString()
    });
    vi.mocked(api.recordInterviewLearningEvent).mockResolvedValue({});
    vi.mocked(api.fetchInterviewLearningAttempts).mockResolvedValue([]);
  });

  it('keeps the solution behind attempt start and reveals hints one step at a time', async () => {
    const onAttemptStarted = vi.fn();
    const onRevealSolution = vi.fn();
    render(<GuidedPracticePanel problemId={pilotPath.problemId} isLight onAttemptStarted={onAttemptStarted} onRevealSolution={onRevealSolution} />);

    await screen.findByText('Compute trapped water.');
    fireEvent.click(screen.getByRole('button', { name: 'Start an attempt' }));
    await waitFor(() => expect(onAttemptStarted).toHaveBeenCalledOnce());

    fireEvent.change(screen.getByRole('textbox', { name: 'Response for Water bound' }), { target: { value: 'The lower wall.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save my response' }));
    await screen.findByText('Self-check: The shorter wall.');
    fireEvent.click(screen.getByRole('button', { name: 'Continue to reasoning' }));

    expect(screen.getByText('How much water is above one bar?')).toBeInTheDocument();
    expect(screen.queryByTestId('guided-hint')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show a hint for this step' }));
    await screen.findByTestId('guided-hint');
    expect(api.recordInterviewLearningEvent).toHaveBeenCalledWith(
      pilotPath.problemId, 'ATTEMPT-1', expect.objectContaining({ eventType: 'HINT_REQUESTED', stageId: 'derive' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reveal the canonical solution' }));
    await waitFor(() => expect(onRevealSolution).toHaveBeenCalledOnce());
  });
});
