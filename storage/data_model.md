# Core Data Model Specification (`storage/data_model.md`)

This document defines the minimal core data model extracted directly from the `study-app` frontend (`frontend/src/types/telemetry.ts` and `frontend/src/store/useStore.ts`) and specifies how these entities map to persistent database storage in PostgreSQL.

Following the principle of simplicity and minimalism, this schema includes **only the 4 core entities currently used by the frontend**, avoiding premature abstractions or speculative tables.

---

## 1. Core Domain Entities

The frontend operates on **four persistent domain entities**:

```
+-------------------+           +-----------------------+
|      TOPICS       |<--------->|  TOPIC_PREREQUISITES  |
|  (Knowledge Node) |  (1 : N)  |   (Directed Graph)    |
+-------------------+           +-----------------------+
        |
        | (1 : N)
        v
+-------------------+           +-----------------------+
|       NOTES       |           |      STUDY_TODOS      |
| (Markdown + Math) |           | (Actionable Task Item)|
+-------------------+           +-----------------------+
        ^                                   |
        |               (0..1 : N)          |
        +-----------------------------------+
```

### 1.1. `Topic` (`topics`)
* **Frontend Representation**: `TopicNode`
* **Purpose**: Represents a discrete concept in the 3D knowledge cosmos.
* **Fields**:
  * `id`: Unique topic identifier (e.g. `TOPIC-001`).
  * `name`: Title of the concept (e.g. `Backpropagation & Autograd`).
  * `category`: Domain grouping (`AI & ML`, `CS`, `SYSTEMS`, `MATH`, `PHYSICS`, `CYBERSECURITY`, `ARCH`).
  * `summary`: Short explanation of the topic.
  * `mastery`: Numeric recall score ($0.00\% - 100.00\%$).
  * `status`: Review status (`NEW`, `LEARNING`, `DUE`, `MASTERED`).
  * `coord_x`, `coord_y`, `coord_z`: 3D coordinates for spatial rendering in Three.js/WebGL.
  * `last_reviewed`: Timestamp of the last review.

### 1.2. `TopicPrerequisite` (`topic_prerequisites`)
* **Frontend Representation**: `prerequisites: string[]` and `unlocks: string[]`
* **Purpose**: Represents directed prerequisite dependencies ($A \rightarrow B$) forming the knowledge graph.
* **Fields**:
  * `topic_id`: The downstream topic that requires prerequisite knowledge.
  * `prerequisite_id`: The upstream prerequisite topic.

### 1.3. `Note` (`notes`)
* **Frontend Representation**: `NoteItem`
* **Purpose**: Rich markdown documentation, formulas (KaTeX), and code snippets attached to a topic.
* **Fields**:
  * `id`: Unique note identifier (e.g. `NOTE-001`).
  * `topic_id`: Foreign key referencing the parent `Topic`.
  * `title`: Header title of the note.
  * `filename`: Optional source filename.
  * `content`: Markdown text payload.
  * `created_at`, `updated_at`: Revision timestamps.

### 1.4. `StudyTodo` (`study_todos`)
* **Frontend Representation**: `StudyTodo`
* **Purpose**: Actionable study tasks and spaced repetition items.
* **Fields**:
  * `id`: Unique task identifier (e.g. `TODO-001`).
  * `topic_id`: Optional foreign key linking the task to a specific knowledge node.
  * `title`: Task description.
  * `category`: Domain category.
  * `priority`: Priority tier (`HIGH`, `MEDIUM`, `LOW`).
  * `completed`: Boolean completion flag.
  * `due_date`: Due date string or timestamp.

---

## 2. Minimal PostgreSQL Schema Specification

```sql
-- 1. Topics Table (Knowledge Nodes)
CREATE TABLE topics (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN ('AI & ML', 'CS', 'SYSTEMS', 'MATH', 'PHYSICS', 'CYBERSECURITY', 'ARCH')),
    summary TEXT NOT NULL DEFAULT '',
    mastery NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (mastery >= 0.00 AND mastery <= 100.00),
    status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'LEARNING', 'DUE', 'MASTERED')),
    coord_x REAL NOT NULL DEFAULT 0.0,
    coord_y REAL NOT NULL DEFAULT 0.0,
    coord_z REAL NOT NULL DEFAULT 0.0,
    last_reviewed TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_topics_category ON topics(category);
CREATE INDEX idx_topics_status ON topics(status);

-- 2. Topic Prerequisites Table (Directed Graph Edges)
CREATE TABLE topic_prerequisites (
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    prerequisite_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (topic_id, prerequisite_id),
    CHECK (topic_id <> prerequisite_id)
);

CREATE INDEX idx_topic_prereq_prereq_id ON topic_prerequisites(prerequisite_id);

-- 3. Notes Table (Markdown Content)
CREATE TABLE notes (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255),
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_topic_id ON notes(topic_id);

-- 4. Study Todos Table (Actionable Tasks)
CREATE TABLE study_todos (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) REFERENCES topics(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64),
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    due_date VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_todos_topic_id ON study_todos(topic_id);
```

---

## 3. Entity Relationships & Design Justifications

### 3.1. Directed Knowledge Graph Structure & Cycle Tolerance
* **Graph Nature**: The frontend model represents a **Directed Knowledge Graph** of conceptual connections. In the current seed dataset, certain tightly coupled concepts have mutual / bidirectional associations (e.g. `GANs` and `VAEs` unlock each other as alternative generative models).
* **Schema Alignment**: The `topic_prerequisites` join table with `CHECK (topic_id <> prerequisite_id)` prevents direct self-loops ($A \rightarrow A$) while naturally accommodating valid directed and mutual concept edges without rejecting existing dataset records.
* **Cycle Resilience in Traversals**: All traversal logic—both in the frontend (BFS queue with `visited` set in `SceneCanvas.tsx` and `TelemetryHUD.tsx`) and recursive SQL queries (using `UNION` deduplication or `CYCLE` guards)—is designed to be cycle-resilient so mutual connections never cause infinite loops.

### 3.2. Prerequisite Graph via Join Table
* **Why**: The frontend exposes both `prerequisites` (ancestors required before topic $X$) and `unlocks` (descendants unlocked by topic $X$). A single join table `topic_prerequisites` acts as the single source of truth for both directions without duplication.
* **Integrity**: `ON DELETE CASCADE` cleans up all edge relationships if a node is removed.

### 3.3. Separation of Notes from Topics
* **Why**: The 3D canvas requires only lightweight node metadata (`id`, `name`, `category`, `mastery`, coordinates) to render hundreds of nodes at 60 FPS. Markdown notes can be large (containing code and mathematical formulas) and are fetched on demand when opened in the inspector modal.

### 3.4. Loose Coupling for Tasks (`ON DELETE SET NULL`)
* **Why**: Users can create general to-do tasks not attached to any topic (`topic_id = NULL`). If a topic is removed, the user's task history is preserved rather than accidentally deleted.

### 3.5. Lightweight 3D Coordinates (`REAL` / `FLOAT4`)
* **Why**: Storing coordinates as 4-byte `REAL` values matches WebGL floating-point vertex buffers, avoids conversion overhead, and uses minimal storage.

---

## 4. Future Extensibility Principle

In accordance with our minimal architecture policy:
* **No speculative tables** (such as vector embeddings, crawl provenance, or separate review logs) are introduced in this phase.
* New tables or schema alterations will be designed and added **only when new core entities or functional requirements are actively introduced** in the codebase.
