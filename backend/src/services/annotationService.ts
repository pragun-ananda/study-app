import { query } from '../db.js';
import { generateEntityId } from '../utils/id.js';
import {
  CodeAnnotationRow,
  CodeAnnotationDTO,
  CreateCodeAnnotationInput,
  UpdateCodeAnnotationInput,
  CodeAnnotationThreadRow,
  CodeAnnotationThreadDTO
} from '../types.js';

export function toCodeAnnotationDTO(row: CodeAnnotationRow): CodeAnnotationDTO {
  return {
    id: row.id,
    repositoryId: row.repository_id,
    commitSha: row.commit_sha,
    filePath: row.file_path,
    startLine: Number(row.start_line),
    endLine: Number(row.end_line),
    title: row.title,
    content: row.content,
    anchorCodeSnippet: row.anchor_code_snippet,
    designCategory: row.design_category,
    aiExplanation: row.ai_explanation || null,
    topicId: row.topic_id || null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export function toCodeAnnotationThreadDTO(row: CodeAnnotationThreadRow): CodeAnnotationThreadDTO {
  return {
    id: row.id,
    annotationId: row.annotation_id,
    sender: row.sender,
    message: row.message,
    suggestedQuizzes: row.suggested_quizzes || null,
    createdAt: new Date(row.created_at).toISOString()
  };
}

export class AnnotationService {
  public async createAnnotation(input: CreateCodeAnnotationInput): Promise<CodeAnnotationDTO> {
    const id = generateEntityId('ANN');
    const commitSha = input.commitSha || 'latest';
    const category = input.designCategory || 'GENERAL_NOTE';
    const topicId = input.topicId || null;

    const res = await query<CodeAnnotationRow>(
      `INSERT INTO code_annotations (
         id, repository_id, commit_sha, file_path, start_line, end_line,
         title, content, anchor_code_snippet, design_category, topic_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [
        id,
        input.repositoryId,
        commitSha,
        input.filePath,
        input.startLine,
        input.endLine,
        input.title,
        input.content,
        input.anchorCodeSnippet,
        category,
        topicId
      ]
    );

    return toCodeAnnotationDTO(res.rows[0]);
  }

  public async getAnnotationsByFile(
    repositoryId: string,
    filePath: string,
    commitSha?: string
  ): Promise<CodeAnnotationDTO[]> {
    let sql = `SELECT * FROM code_annotations 
               WHERE repository_id = $1 AND file_path = $2`;
    const params: any[] = [repositoryId, filePath];

    if (commitSha) {
      sql += ` AND commit_sha = $3`;
      params.push(commitSha);
    }

    sql += ` ORDER BY start_line ASC, created_at ASC`;

    const res = await query<CodeAnnotationRow>(sql, params);
    return res.rows.map(toCodeAnnotationDTO);
  }

  public async getAnnotationsByRepo(repositoryId: string): Promise<CodeAnnotationDTO[]> {
    const res = await query<CodeAnnotationRow>(
      `SELECT * FROM code_annotations 
       WHERE repository_id = $1 
       ORDER BY file_path ASC, start_line ASC`,
      [repositoryId]
    );
    return res.rows.map(toCodeAnnotationDTO);
  }

  public async getAnnotationById(id: string): Promise<CodeAnnotationDTO | null> {
    const res = await query<CodeAnnotationRow>(
      `SELECT * FROM code_annotations WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return toCodeAnnotationDTO(res.rows[0]);
  }

  public async updateAnnotation(id: string, input: UpdateCodeAnnotationInput): Promise<CodeAnnotationDTO> {
    const fields: string[] = ['updated_at = NOW()'];
    const params: any[] = [id];
    let idx = 2;

    if (input.title !== undefined) {
      fields.push(`title = $${idx++}`);
      params.push(input.title);
    }
    if (input.content !== undefined) {
      fields.push(`content = $${idx++}`);
      params.push(input.content);
    }
    if (input.designCategory !== undefined) {
      fields.push(`design_category = $${idx++}`);
      params.push(input.designCategory);
    }
    if (input.topicId !== undefined) {
      fields.push(`topic_id = $${idx++}`);
      params.push(input.topicId);
    }

    const res = await query<CodeAnnotationRow>(
      `UPDATE code_annotations 
       SET ${fields.join(', ')} 
       WHERE id = $1 
       RETURNING *`,
      params
    );

    if (res.rows.length === 0) {
      throw new Error(`Code annotation not found: "${id}"`);
    }

    return toCodeAnnotationDTO(res.rows[0]);
  }

  public async setAnnotationAiExplanation(id: string, aiExplanation: any): Promise<CodeAnnotationDTO> {
    const res = await query<CodeAnnotationRow>(
      `UPDATE code_annotations 
       SET ai_explanation = $2, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id, JSON.stringify(aiExplanation)]
    );
    if (res.rows.length === 0) {
      throw new Error(`Code annotation not found: "${id}"`);
    }
    return toCodeAnnotationDTO(res.rows[0]);
  }

  public async deleteAnnotation(id: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM code_annotations WHERE id = $1`,
      [id]
    );
    return (res.rowCount || 0) > 0;
  }

  public async getAnnotationThreads(annotationId: string): Promise<CodeAnnotationThreadDTO[]> {
    const res = await query<CodeAnnotationThreadRow>(
      `SELECT * FROM code_annotation_threads 
       WHERE annotation_id = $1 
       ORDER BY created_at ASC`,
      [annotationId]
    );
    return res.rows.map(toCodeAnnotationThreadDTO);
  }

  public async addThreadMessage(
    annotationId: string,
    sender: 'USER' | 'SOL_AI' | 'SYSTEM',
    message: string,
    suggestedQuizzes: any = null
  ): Promise<CodeAnnotationThreadDTO> {
    const id = generateEntityId('TH');
    const res = await query<CodeAnnotationThreadRow>(
      `INSERT INTO code_annotation_threads (
         id, annotation_id, sender, message, suggested_quizzes, created_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [id, annotationId, sender, message, suggestedQuizzes ? JSON.stringify(suggestedQuizzes) : null]
    );

    return toCodeAnnotationThreadDTO(res.rows[0]);
  }
}

export const annotationService = new AnnotationService();
