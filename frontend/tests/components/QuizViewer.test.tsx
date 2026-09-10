import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText(/If a Bloom filter says an element is absent/i)).toBeInTheDocument();
  });

  it('renders MATCHING and ORDERING questions', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    // Matching
    expect(screen.getByText('Memtable')).toBeInTheDocument();
    expect(screen.getByText('In-memory sorted buffer receiving incoming writes')).toBeInTheDocument();

    // Ordering
    expect(screen.getByText('Append write to Write-Ahead Log (WAL)')).toBeInTheDocument();
    expect(screen.getByText('Flush full Memtable to disk as immutable SSTable')).toBeInTheDocument();
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

  it('toggles between AUDIT MODE and PRACTICE MODE', () => {
    render(<QuizViewer questions={sampleQuestions} />);

    const modeBtn = screen.getByText('AUDIT MODE');
    fireEvent.click(modeBtn);

    expect(screen.getByText('PRACTICE MODE')).toBeInTheDocument();
  });
});
