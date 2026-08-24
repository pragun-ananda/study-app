import rawDomainData from './domainData.json';
import rawTodos from './todos.json';
import backpropContent from './notes/backpropagation.md?raw';
import bstContent from './notes/binary_search_trees.md?raw';
import raftContent from './notes/raft_consensus.md?raw';
import svdContent from './notes/svd_matrix_factorization.md?raw';
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
  'svd_matrix_factorization.md': svdContent
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

export const INITIAL_TODOS: StudyTodo[] = rawTodos as StudyTodo[];
