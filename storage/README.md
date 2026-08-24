# Storage Layer & Database Schema

This directory contains the PostgreSQL schema definitions, database constraints, and automated integrity test suites for the Knowledge Graph study application.

---

## 1. Schema Overview

The database implements 4 core domain entities aligned with the frontend knowledge model:

```
+-------------------+           +-----------------------+
|      TOPICS       |<--------->|  TOPIC_PREREQUISITES  |
|  (Knowledge Node) |  (1 : N)  | (Directed Graph Edge) |
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

### Core Tables & Constraints

1. **`topics`**:
   * Knowledge nodes in the 3D cosmos.
   * `id VARCHAR(64) PRIMARY KEY`, `name TEXT`, `category VARCHAR(64)`, `summary TEXT`.
   * `mastery NUMERIC(5,2)` constrained by `CHECK (mastery >= 0 AND mastery <= 100)`.
   * Spatial Euclidean coordinates (`coord_x`, `coord_y`, `coord_z DOUBLE PRECISION`).

2. **`topic_prerequisites`**:
   * Directed knowledge dependencies between concepts (`topic_id` requires `prerequisite_id`).
   * Composite Primary Key `(topic_id, prerequisite_id)`.
   * Foreign keys with `ON DELETE CASCADE`.
   * Cycle-tolerant design (enables mutual complementary relationships, e.g. GAN $\leftrightarrow$ VAE).
   * Index on `prerequisite_id` for reverse downstream unlock queries.

3. **`notes`**:
   * Markdown study notes and KaTeX mathematical formulas.
   * Foreign key to `topics(id)` with `ON DELETE CASCADE`.
   * Index on `topic_id`.

4. **`study_todos`**:
   * Actionable study tasks and spaced repetition goals.
   * Nullable foreign key `topic_id` with `ON DELETE SET NULL` (preserving tasks when a linked topic is deleted).
   * Index on `topic_id` and `completed`.

---

## 2. Running Schema Tests

The storage module includes automated schema verification tests that validate table structure, constraints, cascades, and cycle tolerance:

```bash
cd storage
npm install
npm test
```
