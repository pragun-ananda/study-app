import { describe, it, expect } from 'vitest';
import { toTopicDTO, toNoteDTO, toTodoDTO } from '../../src/utils/mappers.js';
import { TopicRow, NoteRow, StudyTodoRow } from '../../src/types.js';

describe('Unit: DTO Mappers (src/utils/mappers.ts)', () => {
  describe('toTopicDTO', () => {
    it('converts raw topic row to frontend-compatible TopicDTO with coordinates and parsed mastery', () => {
      const row: TopicRow = {
        id: 'TOPIC-001',
        name: 'Neural Network Backpropagation',
        category: 'AI & ML',
        summary: 'Reverse-mode automatic differentiation.',
        mastery: '85.50',
        status: 'MASTERED',
        coord_x: '12.345',
        coord_y: '-8.678',
        coord_z: '4.2',
        last_reviewed: '2026-08-24T08:00:00.000Z'
      };

      const prerequisites = ['TOPIC-002'];
      const unlocks = ['TOPIC-003', 'TOPIC-004'];
      const notes = [
        {
          id: 'NOTE-001',
          title: 'Backpropagation Derivation Notes',
          content: '# Notes'
        }
      ];

      const dto = toTopicDTO(row, prerequisites, unlocks, notes);

      expect(dto.id).toBe('TOPIC-001');
      expect(dto.name).toBe('Neural Network Backpropagation');
      expect(dto.category).toBe('AI & ML');
      expect(dto.mastery).toBe(85.5);
      expect(dto.status).toBe('MASTERED');
      expect(dto.coordinates).toEqual([12.35, -8.68, 4.2]);
      expect(dto.lastReviewed).toBe('2026-08-24T08:00:00.000Z');
      expect(dto.prerequisites).toEqual(['TOPIC-002']);
      expect(dto.unlocks).toEqual(['TOPIC-003', 'TOPIC-004']);
      expect(dto.notes).toEqual(notes);
    });

    it('handles null / undefined last_reviewed and default coordinates safely', () => {
      const row: TopicRow = {
        id: 'TOPIC-002',
        name: 'Transformer Self-Attention',
        category: 'AI & ML',
        summary: '',
        mastery: 0,
        status: 'NEW',
        coord_x: 0,
        coord_y: 0,
        coord_z: 0,
        last_reviewed: null
      };

      const dto = toTopicDTO(row);
      expect(dto.lastReviewed).toBe('Never');
      expect(dto.coordinates).toEqual([0, 0, 0]);
      expect(dto.prerequisites).toEqual([]);
      expect(dto.unlocks).toEqual([]);
      expect(dto.notes).toEqual([]);
    });
  });

  describe('toNoteDTO', () => {
    it('converts note row to NoteDTO with ISO string timestamps', () => {
      const createdDate = new Date('2026-08-17T10:00:00Z');
      const updatedDate = new Date('2026-08-24T08:00:00Z');

      const row: NoteRow = {
        id: 'NOTE-001',
        topic_id: 'TOPIC-001',
        title: 'Backprop Derivation',
        filename: 'backpropagation.md',
        content: '# Math formula $$ E = mc^2 $$',
        created_at: createdDate,
        updated_at: updatedDate
      };

      const dto = toNoteDTO(row);
      expect(dto.id).toBe('NOTE-001');
      expect(dto.title).toBe('Backprop Derivation');
      expect(dto.filename).toBe('backpropagation.md');
      expect(dto.content).toContain('$$ E = mc^2 $$');
      expect(dto.createdAt).toBe('2026-08-17T10:00:00.000Z');
      expect(dto.updatedAt).toBe('2026-08-24T08:00:00.000Z');
    });

    it('handles missing filename as undefined', () => {
      const row: NoteRow = {
        id: 'NOTE-002',
        topic_id: 'TOPIC-001',
        title: 'Quick Note',
        filename: null,
        content: 'Simple text',
        created_at: '2026-08-24T10:00:00Z',
        updated_at: '2026-08-24T10:00:00Z'
      };

      const dto = toNoteDTO(row);
      expect(dto.filename).toBeUndefined();
    });
  });

  describe('toTodoDTO', () => {
    it('converts study todo row to frontend-compatible StudyTodoDTO', () => {
      const row: StudyTodoRow = {
        id: 'TODO-001',
        topic_id: 'TOPIC-001',
        title: 'Implement autograd engine',
        category: 'AI & ML',
        priority: 'HIGH',
        completed: false,
        due_date: 'Today',
        created_at: new Date('2026-08-24T00:00:00Z')
      };

      const dto = toTodoDTO(row);
      expect(dto.id).toBe('TODO-001');
      expect(dto.topicId).toBe('TOPIC-001');
      expect(dto.title).toBe('Implement autograd engine');
      expect(dto.category).toBe('AI & ML');
      expect(dto.priority).toBe('HIGH');
      expect(dto.completed).toBe(false);
      expect(dto.dueDate).toBe('Today');
      expect(dto.createdAt).toBe('2026-08-24T00:00:00.000Z');
    });

    it('handles null topicId as undefined', () => {
      const row: StudyTodoRow = {
        id: 'TODO-002',
        topic_id: null,
        title: 'General Review',
        category: 'CS',
        priority: 'LOW',
        completed: true,
        due_date: 'This Week',
        created_at: '2026-08-24T00:00:00Z'
      };

      const dto = toTodoDTO(row);
      expect(dto.topicId).toBeUndefined();
      expect(dto.completed).toBe(true);
    });
  });
});
