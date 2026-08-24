import { TopicRow, NoteRow, StudyTodoRow, TopicDTO, NoteDTO, StudyTodoDTO } from '../types.js';

export function toTopicDTO(
  row: TopicRow,
  prerequisites: string[] = [],
  unlocks: string[] = [],
  notes: NoteDTO[] = []
): TopicDTO {
  const coordX = Number(Number(row.coord_x ?? 0).toFixed(2));
  const coordY = Number(Number(row.coord_y ?? 0).toFixed(2));
  const coordZ = Number(Number(row.coord_z ?? 0).toFixed(2));

  let lastReviewed = 'Never';
  if (row.last_reviewed) {
    const d = new Date(row.last_reviewed);
    if (!isNaN(d.getTime())) {
      lastReviewed = d.toISOString();
    }
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    summary: row.summary || '',
    mastery: Number(Number(row.mastery ?? 0).toFixed(2)),
    status: row.status,
    coordinates: [coordX, coordY, coordZ],
    lastReviewed,
    prerequisites,
    unlocks,
    notes
  };
}

export function toNoteDTO(row: NoteRow): NoteDTO {
  const dto: NoteDTO = {
    id: row.id,
    title: row.title,
    filename: row.filename || undefined,
    content: row.content || ''
  };

  if (row.created_at) {
    dto.createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  }
  if (row.updated_at) {
    dto.updatedAt = row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at);
  }

  return dto;
}

export function toTodoDTO(row: StudyTodoRow): StudyTodoDTO {
  const dto: StudyTodoDTO = {
    id: row.id,
    topicId: row.topic_id || undefined,
    title: row.title,
    category: row.category,
    priority: row.priority,
    completed: Boolean(row.completed),
    dueDate: row.due_date || 'Today'
  };

  if (row.created_at) {
    dto.createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  }

  return dto;
}
