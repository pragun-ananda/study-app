import rawDomainData from './domainData.json';
import rawTodos from './todos.json';
import backpropContent from './notes/backpropagation.md?raw';
import bstContent from './notes/binary_search_trees.md?raw';
import raftContent from './notes/raft_consensus.md?raw';
import svdContent from './notes/svd_matrix_factorization.md?raw';
import threadSafetyContent from './notes/queue-thread-safety.md?raw';
import processBoundaryContent from './notes/queue-process-boundary.md?raw';
import deadLetterContent from './notes/queue-dead-letter.md?raw';
import { CURATED_PROBLEM_CONCEPT_NODES } from './problemConcepts';
import { TopicNode, NoteItem, StudyTodo } from '../../types/telemetry';

export interface RawTopic {
  name: string;
  summary: string;
  prereqNames?: string[];
  unlockNames?: string[];
  notes?: NoteItem[];
}

const noteContentMap: Record<string, string> = {
  'backpropagation.md': backpropContent,
  'binary_search_trees.md': bstContent,
  'raft_consensus.md': raftContent,
  'svd_matrix_factorization.md': svdContent,
  'queue-thread-safety.md': threadSafetyContent,
  'queue-process-boundary.md': processBoundaryContent,
  'queue-dead-letter.md': deadLetterContent
};

export const DOMAIN_DATA: { category: TopicNode['category']; topics: RawTopic[] }[] = rawDomainData.map((group) => ({
  category: group.category as TopicNode['category'],
  topics: group.topics.map((topic) => ({
    name: topic.name,
    summary: topic.summary,
    prereqNames: topic.prereqNames,
    unlockNames: topic.unlockNames,
    notes: topic.notes?.map((n) => ({
      id: n.id,
      title: n.title,
      filename: n.filename,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      content: (n.filename && noteContentMap[n.filename]) || ''
    }))
  }))
}));

export const INITIAL_PROBLEM_CONCEPT_NODES: TopicNode[] = CURATED_PROBLEM_CONCEPT_NODES.map((topic) => ({
  id: topic.id,
  name: topic.name,
  category: topic.category,
  mastery: 0,
  status: 'NEW',
  lastReviewed: 'Never',
  coordinates: topic.coordinates,
  prerequisites: [],
  unlocks: [],
  summary: topic.summary,
  notes: [{ ...topic.note, content: noteContentMap[topic.note.filename] }]
}));

export const INITIAL_TODOS: StudyTodo[] = rawTodos as StudyTodo[];

export * from './applications';
