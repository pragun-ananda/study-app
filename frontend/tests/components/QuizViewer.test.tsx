import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QuizViewer, { QuizQuestionData } from '../../src/components/hud/QuizViewer';

describe('QuizViewer Component', () => {
  const sampleQuestions: QuizQuestionData[] = [
    {
      id: 'Q1',
      type: 'MCQ',
      stem: 'Why do LSM trees achieve higher write throughput than B-trees?',
      options: {
        A: 'They perform sequential writes to memory and disk append-only logs',
        B: 'They eliminate the need for secondary storage',
        C: 'They sort all data directly inside SSD flash cells',
        D: 'They do not maintain write-ahead logs'
      },
      correctAnswer: 'A',
      distractorExplanations: {
        B: 'LSM trees still persist SSTables to disk.',
        C: 'Data sorting happens in RAM in the Memtable.',
        D: 'LSM trees require a WAL for crash recovery.'
      },
      difficulty: 'MEDIUM',
      sourceAssertion: 'Write Path Architecture'
    },
    {
      id: 'Q2',
      type: 'TRUE_FALSE',
      statement: 'Bloom filters can produce false positives but never false negatives.',
      correctAnswer: true,
      explanation: 'If a Bloom filter says an element is absent, it is guaranteed not to be in the set.',
      difficulty: 'EASY',
      sourceAssertion: 'Bloom Filters'
    },
    {
      id: 'Q3',
      type: 'MATCHING',
      prompt: 'Match each LSM component with its primary role:',
      pairs: [
        { term: 'Memtable', definition: 'In-memory sorted buffer receiving incoming writes' },
        { term: 'SSTable', definition: 'Immutable on-disk sorted string table' }
      ],
      difficulty: 'EASY'
    },
    {
      id: 'Q4',
      type: 'ORDERING',
      prompt: 'Order the chronological stages of an LSM write operation:',
      sequence: [
        'Append write to Write-Ahead Log (WAL)',
        'Insert key-value into in-memory Memtable',
        'Acknowledge write success to client',
        'Flush full Memtable to disk as immutable SSTable'
      ],
      difficulty: 'HARD'
    },
    {
      id: 'Q5',
      type: 'FLASHCARD',
      term: 'Write Amplification',
      definition: 'The ratio of bytes written to underlying storage relative to logical bytes received.',
      memorizationReason: 'Crucial for measuring disk degradation and compaction overhead.',
      difficulty: 'MEDIUM'
    }
  ];

  it('renders fallback notice when no questions are available', () => {
    render(<QuizViewer questions={[]} />);
    expect(screen.getByText(/No quiz questions available/i)).toBeInTheDocument();
  });

  it('parses raw JSON questions string automatically', () => {
    const jsonString = JSON.stringify(sampleQuestions);
    render(<QuizViewer questions={jsonString} topicTitle="LSM Trees" />);

    expect(screen.getByText(/LSM Trees Quiz Bank/i)).toBeInTheDocument();
    expect(screen.getByText(/5 QUESTIONS/i)).toBeInTheDocument();
    expect(screen.getByText('Why do LSM trees achieve higher write throughput than B-trees?')).toBeInTheDocument();
  });

  it('renders MCQ with options and expandable distractor explanations', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    expect(screen.getByText('Why do LSM trees achieve higher write throughput than B-trees?')).toBeInTheDocument();
    expect(screen.getByText(/They perform sequential writes to memory/i)).toBeInTheDocument();

    // Distractor expansion
    const toggleDistractorBtn = screen.getByText(/View Distractor Rationales/i);
    fireEvent.click(toggleDistractorBtn);

    expect(screen.getByText(/LSM trees still persist SSTables to disk/i)).toBeInTheDocument();
    expect(screen.getByText(/Data sorting happens in RAM in the Memtable/i)).toBeInTheDocument();
  });

  it('renders TRUE_FALSE questions with answer validation and explanation', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    expect(screen.getByText(/"Bloom filters can produce false positives but never false negatives."/i)).toBeInTheDocument();
    
    // In practice mode, explanation is hidden until answered
    expect(screen.queryByText(/If a Bloom filter says an element is absent/i)).not.toBeInTheDocument();

    // Click TRUE to validate
    const trueBtn = screen.getByRole('button', { name: /^TRUE$/i });
    fireEvent.click(trueBtn);

    // Answer is evaluated and explanation appears
    expect(screen.getByText(/If a Bloom filter says an element is absent/i)).toBeInTheDocument();
  });

  it('interacts with MATCHING questions: selects definition, checks matches, and resets', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    // Matching terms are visible
    expect(screen.getByText('Memtable')).toBeInTheDocument();
    expect(screen.getByText('SSTable')).toBeInTheDocument();

    const memtableSelect = screen.getByLabelText(/Match definition for Memtable/i);
    expect(memtableSelect).toBeInTheDocument();

    // Select the correct definition for Memtable
    fireEvent.change(memtableSelect, {
      target: { value: 'In-memory sorted buffer receiving incoming writes' }
    });

    // Check Matches button is enabled and clickable
    const checkMatchesBtn = screen.getByRole('button', { name: /Check Matches/i });
    fireEvent.click(checkMatchesBtn);

    // Evaluated: Correct badge shown for Memtable
    expect(screen.getByText('CORRECT')).toBeInTheDocument();

    // Reset matches
    const resetBtn = screen.getByRole('button', { name: /Reset Matches/i });
    fireEvent.click(resetBtn);
    expect(screen.getByRole('button', { name: /Check Matches/i })).toBeInTheDocument();
  });

  it('opens native readable dropdown menu for matching questions and selects choice', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    // Available Definitions Pool is present
    expect(screen.getByText(/Available Definitions Pool/i)).toBeInTheDocument();

    // Click custom dropdown trigger button for Memtable
    const triggerBtn = screen.getByRole('button', { name: /Select definition for Memtable/i });
    expect(triggerBtn).toBeInTheDocument();
    fireEvent.click(triggerBtn);

    // Dropdown listbox opens
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(screen.getByText(/SELECT DEFINITION/i)).toBeInTheDocument();

    // Options are rendered as readable elements inside the listbox
    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBe(2);

    // Click the option for Memtable
    const correctOpt = options.find((opt) => opt.textContent?.includes('In-memory sorted buffer'));
    expect(correctOpt).toBeDefined();
    fireEvent.click(correctOpt!);

    // Listbox closes
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Selected choice preview is visible on card
    expect(screen.getAllByText(/In-memory sorted buffer receiving incoming writes/i).length).toBeGreaterThanOrEqual(1);
  });

  it('interacts with ORDERING questions: reorders steps, checks order, and resets', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    // Steps exist
    expect(screen.getByText('Append write to Write-Ahead Log (WAL)')).toBeInTheDocument();
    expect(screen.getByText('Flush full Memtable to disk as immutable SSTable')).toBeInTheDocument();

    // Move step button exists and is clickable
    const moveUpBtns = screen.getAllByTitle('Move Step Up');
    expect(moveUpBtns.length).toBeGreaterThan(0);
    // Click move up on second step
    fireEvent.click(moveUpBtns[1]);

    // Check Order
    const checkOrderBtn = screen.getByRole('button', { name: /Check Order/i });
    fireEvent.click(checkOrderBtn);

    // Should show results and Reset Order button
    const resetOrderBtn = screen.getByRole('button', { name: /Reset Order/i });
    expect(resetOrderBtn).toBeInTheDocument();
    fireEvent.click(resetOrderBtn);

    // Back to interactive check order
    expect(screen.getByRole('button', { name: /Check Order/i })).toBeInTheDocument();
  });

  it('renders FLASHCARD questions and flips card on click', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    expect(screen.getByText('Write Amplification')).toBeInTheDocument();
    expect(screen.getByText(/CLICK CARD TO FLIP/i)).toBeInTheDocument();

    // Click card to flip
    const card = screen.getByText('Write Amplification').closest('div');
    fireEvent.click(card!);

    expect(screen.getByText(/REVEALED DEFINITION/i)).toBeInTheDocument();
    expect(screen.getByText(/The ratio of bytes written to underlying storage/i)).toBeInTheDocument();
    expect(screen.getByText(/Crucial for measuring disk degradation/i)).toBeInTheDocument();
  });

  it('filters questions by clicking question type tab', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    // Click FLASHCARD filter tab
    const flashcardTab = screen.getByRole('button', { name: /^FLASHCARD/i });
    fireEvent.click(flashcardTab);

    expect(screen.getByText('Write Amplification')).toBeInTheDocument();
    expect(screen.queryByText('Why do LSM trees achieve higher write throughput than B-trees?')).not.toBeInTheDocument();
  });

  it('toggles between PRACTICE MODE and AUDIT MODE', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    // Defaults to PRACTICE MODE
    const modeBtn = screen.getByText('PRACTICE MODE');
    fireEvent.click(modeBtn);

    expect(screen.getByText('AUDIT MODE')).toBeInTheDocument();
    // In AUDIT MODE, all answers and explanations are immediately visible
    expect(screen.getByText(/If a Bloom filter says an element is absent/i)).toBeInTheDocument();
  });

  it('supports defaultAuditMode={true} prop for audit surfaces', () => {
    render(<QuizViewer questions={sampleQuestions} defaultAuditMode={true} />);

    expect(screen.getByText('AUDIT MODE')).toBeInTheDocument();
    expect(screen.getByText(/If a Bloom filter says an element is absent/i)).toBeInTheDocument();
  });

  it('provides a global RESET button when user has answered questions', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    expect(screen.queryByRole('button', { name: /RESET/i })).not.toBeInTheDocument();

    // Answer a question
    const trueBtn = screen.getByRole('button', { name: /^TRUE$/i });
    fireEvent.click(trueBtn);

    // Global reset button appears
    const resetAllBtn = screen.getByRole('button', { name: /RESET/i });
    expect(resetAllBtn).toBeInTheDocument();

    fireEvent.click(resetAllBtn);
    expect(screen.queryByRole('button', { name: /RESET/i })).not.toBeInTheDocument();
  });
});
