# Interview learning system: repository audit

Audit date: 2026-10-20
Branch: `codex/prototype-design`
Audited baseline: `a0a8fda` (freshly merged `origin/main`)

## Current state (confirmed)

### Existing pieces

- **Problem bank:** `backend/src/types.ts`, `backend/src/services/problemService.ts`, `backend/src/routes/problems.ts`, and `storage/schema.sql` define interview problems, prerequisites, attached quizzes, submissions, and system-design follow-up responses. The current seed contains five problems in `backend/src/data/seedProblems.ts`.
- **Practice UI:** `frontend/src/components/hud/ProblemViewerModal.tsx` already presents prompts, progressive hint disclosure, canonical solutions, coding editor/test controls, submission history, quizzes, and system-design follow-ups. The modal is a useful host for a guided-learning pilot.
- **Topic graph:** `topics` and `topic_prerequisites` provide reusable concepts and a prerequisite graph. Problem prerequisites currently link a question to topic IDs.
- **Generation/review:** `topicExtractor.ts`, `quizGenerator.ts`, `walkthroughGenerator.ts`, and the ingestion/review-queue services support general study-content extraction, quiz generation, and human review. These are not an interview learning-path pipeline.
- **Review scheduling:** `spacedRepetition.ts` persists quiz attempts and updates topic mastery using SM-2-like scheduling. It does not represent problem attempts, hint dependence, stage performance, or transfer performance.
- **Assessment and execution:** system-design answers can be sent to an LLM grader, with a deterministic fallback; coding execution is implemented in the browser in `frontend/src/utils/codeRunner.ts`.

### Seed content inspection

- The seeded bank has **5** questions: two system-design, two coding, and one ML system-design question. This is a good reason to validate a small pilot before scaling content generation.
- `PROB-TRAPPING-RAIN-WATER` contains a coherent two-pointer Python solution, a matching invariant, and two correct examples (outputs 6 and 9). Its starter code covers eight languages, but the current executor does not actually compile Java/C++/Go/Rust/Protobuf; several paths use syntax checks or heuristics instead.
- That same question is linked to `TOPIC-034` (Binary Search & Binary Search Trees) and `TOPIC-040` (Segment Trees & Lazy Propagation). Those are not the required concepts for the seeded two-pointer solution, so its current prerequisite associations are misleading.
- The LRU seed title and summary claim both LRU and LFU, while the prompt and canonical implementation only specify LRU. Treat the title/summary as inconsistent with the actual question.
- The rate-limiter sample labels the solution as supporting token bucket and sliding-window approaches, while its Lua sample is a fixed counter with expiry, its narrative recommends sliding-window counter, and its scale estimate assumes 50M keys × 64 bytes = 3.2GB (the arithmetic is 3.2GB, but excludes Redis overhead and replication). This is not yet validated curriculum content.
- Seeded example test cases are sparse (two per problem) and several system-design “test cases” are executable-looking fixtures rather than meaningful validation of architectural reasoning.

### Persistence and API behavior

- The canonical prompt and solution are fields on `problems`; generated learning material has no separate model/table or version metadata.
- `problem_submissions` records code and result fields, but `POST /api/problems/:id/submit` only persists client-supplied status/count/runtime fields. The route does not execute code or independently verify these results.
- `problem_follow_up_responses` persists system-design response text and score/feedback, but does not bind an assessment to a rubric/content version or preserve criterion evidence.
- Quiz attempts have durable history and schedule fields. No interview learning-path or stage-attempt persistence exists.
- The schema is centralized in `storage/schema.sql`; backend integration tests load it into `pg-mem` through `backend/tests/helpers.ts`. This is the established place to add compatible tables for a prototype.

### Baseline checks

- Backend targeted baseline passed: `tests/integration/problems.test.ts`, `tests/unit/systemDesignGrader.test.ts`, `tests/unit/spaced_repetition.test.ts`, and `tests/unit/walkthrough_generator.test.ts` — **4 files, 44 tests passed**.
- Frontend `tests/components/ProblemViewerModal.test.tsx` could not collect because the installed `frontend/node_modules` cannot resolve `@monaco-editor/react`, although it is declared in `frontend/package.json`. No frontend tests ran.
- No source files were changed before the audit. The pre-sync source-backlog work is still preserved in `stash@{0}` and was not applied to this prototype branch.

## Gaps and risks

1. There is no typed, validated, versioned learning-path artifact separate from the canonical question.
2. The UI can reveal hints and solutions, but does not teach prerequisites in context, guide through independently checkable reasoning stages, or offer a scored transfer task.
3. Existing quiz completion/mastery does not establish independent interview competence.
4. The deterministic system-design fallback awards points based on response length, keyword presence, generic terms, and diagram element count; it emits generic findings unrelated to the prompt. Its score must not be presented as evidence of competence.
5. The browser executor uses `new Function`/`eval` for JavaScript and `exec` in Pyodide for Python. It is not an appropriate security boundary for untrusted code. The backend submission API also trusts client-supplied test outcomes. The pilot should not claim server-verified code execution.
6. Generated content is not currently linked to source provenance, validation state, or content versions for interview questions.

## Reuse and implementation plan

### Pilot vertical slice: Trapping Rain Water

1. Add a discriminated, typed learning-path schema with explicit version and review state. Keep canonical prompt/solution on `problems`; persist path versions separately.
2. Create one manually authored path for `PROB-TRAPPING-RAIN-WATER`: problem interpretation, targeted concepts, staged reasoning, non-revealing hints, solution steps with verification criteria, edge cases, alternatives, a meaningful transfer task, and an explicit assessment rubric. Correct its prerequisite mapping rather than reusing unrelated BST/segment-tree nodes.
3. Add runtime validation and API retrieval for that path. Make draft/invalid content unavailable to the learner flow.
4. Add durable attempt events for start, stage response/completion, hint use, solution reveal, code submission reference, transfer response, confidence, and review scheduling. Preserve existing submissions and quiz attempts.
5. Add a focused guided-practice view inside the existing problem workspace. Keep the canonical solution behind an explicit reveal action; guide one stage at a time and distinguish locally simulated execution from verified evaluation.
6. Add schema/API/unit/UI coverage, including invalid path data and hint order. Only after this slice is reviewed should it expand to the remaining four seeded questions, then the wider corpus.

### Later increments

- Replace confidence-producing deterministic system-design grading with rubric-linked, evidence-backed feedback whose evaluation method and uncertainty are explicit; retain deterministic checks only as diagnostics.
- Audit and repair canonical problem content (starting with the LRU/LFU mismatch and rate-limiter contradictions) before using it as generated curriculum source.
- Add content provenance/validation and concept-specific resources with verified URLs.
- Revisit execution architecture before enabling shared or server-side submissions; use a properly isolated runner with resource, filesystem, and network restrictions.
- Build learning-oriented Today/Readiness views after attempts and review outcomes provide credible signals.

## Decisions for the prototype

- Use the existing problem bank, topic graph, Postgres schema, API, and problem modal.
- Use a separate versioned learning-path table so generated teaching material cannot overwrite the canonical source question or solution.
- Treat schema-valid content and pedagogically reviewed content as separate states. A path is not eligible for normal study until explicitly reviewed.
- Do not reuse the current deterministic system-design score as a readiness metric.
- Use one pilot question and one transfer exercise; do not generate paths for all 500 questions yet.
