-- ==============================================================================
-- KNOWLEDGE GRAPH STORAGE SCHEMA
-- Core Domain Tables: topics, topic_prerequisites, notes, study_todos
-- ==============================================================================

-- 1. Topics (Knowledge Nodes in the 3D Cosmos)
CREATE TABLE IF NOT EXISTS topics (
    id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    summary TEXT NOT NULL,
    mastery NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (mastery >= 0 AND mastery <= 100),
    status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN ('DUE', 'LEARNING', 'MASTERED', 'NEW')),
    coord_x DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    coord_y DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    coord_z DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_reviewed TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_topics_category ON topics(category);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);

-- 2. Topic Prerequisites (Directed Knowledge Graph Edges)
-- Represents downstream topic needing upstream prerequisite.
-- Cycle-tolerant design: supports complementary mutual relationships (e.g. GAN <-> VAE)
-- but prevents self-loops (topic_id <> prerequisite_id).
CREATE TABLE IF NOT EXISTS topic_prerequisites (
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    prerequisite_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (topic_id, prerequisite_id),
    CONSTRAINT chk_no_self_prerequisite CHECK (topic_id <> prerequisite_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_prerequisites_prereq ON topic_prerequisites(prerequisite_id);

-- 3. Notes (Markdown & LaTeX Study Materials attached to Topics)
CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    filename TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);

-- 4. Study Todos (Actionable Study Goals & Tasks)
-- Loose coupling: topic_id is nullable; deleting a topic preserves tasks (SET NULL).
CREATE TABLE IF NOT EXISTS study_todos (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) REFERENCES topics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'HIGH' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    due_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_todos_topic_id ON study_todos(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_todos_completed ON study_todos(completed);

-- 5. Quizzes attached to Topics
CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_topic_id ON quizzes(topic_id);

-- 6. Quiz Questions (Challenging MCQs, True/False, Matching, Sequence Ordering, and Flashcards)
CREATE TABLE IF NOT EXISTS quiz_questions (
    id VARCHAR(64) PRIMARY KEY,
    quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    note_id VARCHAR(64) REFERENCES notes(id) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'MCQ' CHECK (type IN ('MCQ', 'TRUE_FALSE', 'MATCHING', 'ORDERING', 'FLASHCARD')),
    prompt TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    difficulty VARCHAR(16) NOT NULL DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_note_id ON quiz_questions(note_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_type ON quiz_questions(type);

-- 7. Ingestion Review Queue (Audit staging and human review sign-off)
CREATE TABLE IF NOT EXISTS ingest_review_queue (
    id VARCHAR(64) PRIMARY KEY,
    source_url TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    payload JSONB NOT NULL,
    audit_report JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ingest_review_queue_status ON ingest_review_queue(status);

