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

-- 3. Sources (Raw & Cleaned Markdown Knowledge Sources with full Provenance)
CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(64) PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author_or_org TEXT,
    raw_markdown TEXT NOT NULL,
    cleaned_markdown TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(url);
CREATE INDEX IF NOT EXISTS idx_sources_content_hash ON sources(content_hash);

-- 4. Notes (Markdown & LaTeX Study Materials attached to Topics)
CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    source_id VARCHAR(64) REFERENCES sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    filename TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_source_id ON notes(source_id);

-- 5. Study Todos (Actionable Study Goals & Tasks)
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

-- 6. Quizzes attached to Topics
CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    source_id VARCHAR(64) REFERENCES sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_topic_id ON quizzes(topic_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_source_id ON quizzes(source_id);

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
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    payload JSONB NOT NULL,
    audit_report JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ingest_review_queue_status ON ingest_review_queue(status);

-- 8. Quiz Attempts (Spaced Repetition & Topic Mastery tracking via SM-2)
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
    interval_days INTEGER NOT NULL DEFAULT 1,
    repetition_count INTEGER NOT NULL DEFAULT 1,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_due_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic_id ON quiz_attempts(topic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_next_due_at ON quiz_attempts(next_due_at);

-- 9. Interview Problems (Coding, System Design, ML System Design, OOD)
CREATE TABLE IF NOT EXISTS problems (
    id VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('CODING', 'SYSTEM_DESIGN', 'ML_SYSTEM_DESIGN', 'OBJECT_ORIENTED_DESIGN')),
    difficulty VARCHAR(16) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    domain VARCHAR(64) NOT NULL,
    summary TEXT NOT NULL,
    prompt TEXT NOT NULL,
    solution TEXT NOT NULL,
    hints JSONB NOT NULL DEFAULT '[]'::jsonb,
    starter_code JSONB NOT NULL DEFAULT '{}'::jsonb,
    test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
    rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
    follow_ups JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_companies TEXT[] NOT NULL DEFAULT '{}',
    time_limit_minutes INTEGER NOT NULL DEFAULT 45,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problems_type ON problems(type);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_domain ON problems(domain);

-- Versioned interview teaching artifacts are kept separate from canonical problem prompts and solutions.
CREATE TABLE IF NOT EXISTS problem_learning_paths (
    problem_id VARCHAR(64) NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    publication_status VARCHAR(16) NOT NULL CHECK (publication_status IN ('PILOT', 'PUBLISHED', 'RETIRED')),
    content JSONB NOT NULL,
    validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (problem_id, version)
);

ALTER TABLE problem_learning_paths ADD COLUMN IF NOT EXISTS validation_report JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_problem_learning_paths_status
  ON problem_learning_paths(problem_id, publication_status);

CREATE TABLE IF NOT EXISTS interview_learning_attempts (
    id VARCHAR(64) PRIMARY KEY,
    problem_id VARCHAR(64) NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    path_version INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    self_confidence SMALLINT CHECK (self_confidence BETWEEN 1 AND 5),
    review_due_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (problem_id, path_version) REFERENCES problem_learning_paths(problem_id, version)
);

CREATE INDEX IF NOT EXISTS idx_interview_learning_attempts_due
  ON interview_learning_attempts(review_due_at);

CREATE TABLE IF NOT EXISTS interview_learning_attempt_events (
    id VARCHAR(64) PRIMARY KEY,
    attempt_id VARCHAR(64) NOT NULL REFERENCES interview_learning_attempts(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL CHECK (event_type IN (
      'STARTED', 'INITIAL_ATTEMPT', 'DIAGNOSTIC_RESPONSE', 'STAGE_RESPONSE', 'STAGE_VERIFIED',
      'HINT_REQUESTED', 'SOLUTION_REVEALED', 'TRANSFER_RESPONSE',
      'CONFIDENCE_RECORDED', 'COMPLETED'
    )),
    stage_id VARCHAR(64),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_learning_events_attempt
  ON interview_learning_attempt_events(attempt_id, created_at);

-- 10. Problem Prerequisites (Mapping from Problem to Required Knowledge Graph Topic Nodes)
CREATE TABLE IF NOT EXISTS problem_prerequisites (
    problem_id VARCHAR(64) NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_problem_prerequisites_topic ON problem_prerequisites(topic_id);

-- 11. Problem Quizzes (Concept Checkpoints and Quizzes attached to Problems)
CREATE TABLE IF NOT EXISTS problem_quizzes (
    problem_id VARCHAR(64) NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_problem_quizzes_quiz ON problem_quizzes(quiz_id);

-- 12. Problem Submissions (Coding & System Design submissions and test suite execution telemetry)
CREATE TABLE IF NOT EXISTS problem_submissions (
    id VARCHAR(64) PRIMARY KEY,
    problem_id VARCHAR(64) NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(32) NOT NULL,
    code TEXT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'PENDING')),
    passed_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    runtime_ms NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    memory_kb INTEGER NOT NULL DEFAULT 0,
    failed_test_case JSONB,
    stdout TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problem_submissions_problem_id ON problem_submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_submissions_created_at ON problem_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problem_submissions_status ON problem_submissions(status);

-- 13. Problem Follow-Up Responses (Candidate written architecture notes, diagram state, and evaluations)
CREATE TABLE IF NOT EXISTS problem_follow_up_responses (
    id VARCHAR(64) PRIMARY KEY,
    problem_id VARCHAR(64) NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    follow_up_id VARCHAR(64) NOT NULL,
    response_text TEXT NOT NULL DEFAULT '',
    diagram_data JSONB,
    score NUMERIC(5,2),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (problem_id, follow_up_id)
);

CREATE INDEX IF NOT EXISTS idx_problem_follow_up_responses_problem_id ON problem_follow_up_responses(problem_id);

-- ==============================================================================
-- CODE REPOSITORIES & SOURCE CODE LEARNING ENGINE
-- ==============================================================================

-- 14. Repositories (Imported Open-Source or User-Authored Repos)
CREATE TABLE IF NOT EXISTS repositories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    owner VARCHAR(128) NOT NULL,
    full_name VARCHAR(256) UNIQUE NOT NULL, -- e.g. "redis/redis"
    origin_type VARCHAR(32) NOT NULL CHECK (origin_type IN ('GITHUB', 'GITLAB', 'CUSTOM', 'LOCAL')),
    clone_url TEXT NOT NULL,
    default_branch VARCHAR(64) NOT NULL DEFAULT 'main',
    active_commit_sha VARCHAR(64) NOT NULL, -- Pinned commit SHA to prevent line drift
    description TEXT,
    language VARCHAR(64),
    stars_count INTEGER NOT NULL DEFAULT 0,
    forks_count INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    tree_cached_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON repositories(full_name);
CREATE INDEX IF NOT EXISTS idx_repositories_language ON repositories(language);
CREATE INDEX IF NOT EXISTS idx_repositories_stars ON repositories(stars_count DESC);

-- 15. Cached Repository File Blobs (LRU Bounded Storage with Gzip Support)
CREATE TABLE IF NOT EXISTS repository_cached_blobs (
    id VARCHAR(64) PRIMARY KEY,
    repository_id VARCHAR(64) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha VARCHAR(64) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    content TEXT NOT NULL,
    encoding VARCHAR(16) NOT NULL DEFAULT 'utf-8',
    is_compressed BOOLEAN NOT NULL DEFAULT FALSE,
    etag VARCHAR(128),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (repository_id, commit_sha, file_path)
);

CREATE INDEX IF NOT EXISTS idx_cached_blobs_lookup ON repository_cached_blobs(repository_id, commit_sha, file_path);
CREATE INDEX IF NOT EXISTS idx_cached_blobs_eviction ON repository_cached_blobs(last_accessed_at ASC);

-- 16. Code Annotations (Line-anchored study notes and architecture explanations)
CREATE TABLE IF NOT EXISTS code_annotations (
    id VARCHAR(64) PRIMARY KEY,
    repository_id VARCHAR(64) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha VARCHAR(64) NOT NULL,
    file_path TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    anchor_code_snippet TEXT NOT NULL DEFAULT '',
    design_category VARCHAR(64) NOT NULL DEFAULT 'GENERAL_NOTE' CHECK (design_category IN (
        'ARCHITECTURE', 'ALGORITHM', 'CONCURRENCY', 'DESIGN_PATTERN', 
        'PERFORMANCE', 'SECURITY', 'SPOF_TRADEOFF', 'GENERAL_NOTE'
    )),
    ai_explanation JSONB,
    topic_id VARCHAR(64) REFERENCES topics(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_annotations_file ON code_annotations(repository_id, commit_sha, file_path);
CREATE INDEX IF NOT EXISTS idx_code_annotations_topic ON code_annotations(topic_id);
CREATE INDEX IF NOT EXISTS idx_code_annotations_category ON code_annotations(design_category);

-- 17. Interactive AI Learning Threads (Q&A conversation linked to annotations)
CREATE TABLE IF NOT EXISTS code_annotation_threads (
    id VARCHAR(64) PRIMARY KEY,
    annotation_id VARCHAR(64) NOT NULL REFERENCES code_annotations(id) ON DELETE CASCADE,
    sender VARCHAR(32) NOT NULL CHECK (sender IN ('USER', 'SOL_AI', 'SYSTEM')),
    message TEXT NOT NULL,
    suggested_quizzes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotation_threads_annotation_id ON code_annotation_threads(annotation_id);



