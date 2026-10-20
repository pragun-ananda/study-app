import { InterviewLearningPath } from '../types.js';
import { FAULT_TOLERANT_WORK_QUEUE_PROBLEM } from './faultTolerantWorkQueueProblem.js';
import { fingerprintProblemSource } from '../utils/problemSource.js';

const sourceFingerprint = fingerprintProblemSource({
  id: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id!,
  title: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.title,
  prompt: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.prompt,
  solution: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.solution
});

/** Curated breakdown for the single queue question; it is source-bound and not a generated replacement for the solution. */
export const FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH: InterviewLearningPath = {
  problemId: 'PROB-FAULT-TOLERANT-WORK-QUEUE',
  version: 3,
  publicationStatus: 'PILOT',
  initialAttemptPrompt: 'In your own words, describe the task states and how the queue recovers work after a worker stops.',
  interpretation: {
    goal: 'Implement a thread-safe in-process queue that never silently drops a submitted task when a worker fails: it must eventually complete or deliberately dead-letter each task, assuming workers continue claiming work.',
    constraints: [
      'The pasted prompt does not specify a persistence requirement; the canonical core solution keeps state in memory and treats restart durability as a follow-up.',
      'A worker can report failure explicitly or become silent after a crash or hang.',
      'A slow worker can be falsely presumed dead, so duplicate processing is possible.',
      'Retries are bounded by max_attempts; exhausted tasks enter a dead-letter collection.',
      'Pending tasks are claimed FIFO; retries join the back of the queue.',
      'Queue methods are synchronized, but task execution happens outside the queue lock.'
    ],
    observations: [
      'Removing a task from pending work cannot mean removing the queue’s durable-in-memory responsibility for it.',
      'A lease records temporary ownership and deadline; a fresh token distinguishes the current owner from stale workers.',
      'A controllable clock makes timeout and heartbeat behavior testable without sleeping.',
      'Expiry heap entries can become stale after heartbeat, completion, or retry and must be checked against current task state.',
      'The guarantee is at-least-once processing, not exactly-once external effects.'
    ]
  },
  concepts: [
    {
      id: 'queue-task-state-machine',
      name: 'Task state machines and conservation',
      intuition: 'Represent each task as pending, leased, done, or dead, and require every operation to move it through an explicit legal transition.',
      relevance: 'The no-loss guarantee is an invariant over states: claiming changes ownership but does not erase the task record.',
      diagnosticQuestion: 'After claim() returns a task to a worker, where is the queue’s record of that task and what states can it still reach?',
      diagnosticSuccessCriteria: 'The task stays recorded while LEASED and can become DONE, PENDING, or DEAD.',
      topicId: 'TOPIC-088',
      terms: ['task state', 'task states', 'state transition']
    },
    {
      id: 'queue-leases-and-fencing-tokens',
      name: 'Leases, timeouts, and fencing tokens',
      intuition: 'A lease grants temporary ownership; its deadline detects silence, while its unique token prevents a stale holder from reporting for a newer lease.',
      relevance: 'Timeout alone can redeliver work while a slow worker is still running; tokens make queue state safe after that redelivery.',
      diagnosticQuestion: 'Worker A times out, worker B receives the retry, then A reports success. What must the queue compare before accepting A’s report?',
      diagnosticSuccessCriteria: 'Only the current lease token can change the task.',
      topicId: 'TOPIC-096',
      terms: ['lease', 'lease token']
    },
    {
      id: 'queue-retry-and-dead-letter-policy',
      name: 'Bounded retries and dead-lettering',
      intuition: 'A retry policy needs an explicit attempt count and terminal destination so a permanently failing task cannot cycle forever.',
      relevance: 'The prompt permits deliberate set-aside for tasks that cannot be completed; the dead-letter list is that explicit outcome.',
      diagnosticQuestion: 'If max_attempts counts deliveries, at what attempt should a task move to DEAD and what evidence should remain inspectable?',
      diagnosticSuccessCriteria: 'Move to DEAD at max_attempts and keep the last error.',
      topicId: 'TOPIC-190',
      terms: ['dead-letter', 'dead letter', 'dead-letter queue', 'dead letter queue']
    },
    {
      id: 'queue-expiry-heap-complexity',
      name: 'Expiry heaps and amortized complexity',
      intuition: 'A min-heap orders lease deadlines so the queue can process expired leases without scanning every task.',
      relevance: 'The queue must recover silent workers while keeping claim cost proportional to expired heap entries rather than total task count.',
      diagnosticQuestion: 'Why can a heartbeat leave an old deadline entry in the heap, and how does claim know that entry is stale?',
      diagnosticSuccessCriteria: 'Skip an expiry entry when its token or deadline is no longer current.'
    },
    {
      id: 'queue-process-boundary',
      name: 'In-process vs distributed queues',
      intuition: 'An in-process queue shares memory with its workers; a distributed queue must coordinate and recover state across machines.',
      relevance: 'This problem assumes one process, while restart recovery and remote workers are follow-up concerns.',
      diagnosticQuestion: 'Which failure does an in-process queue not survive by itself?',
      diagnosticSuccessCriteria: 'A process restart loses its in-memory task records.',
      topicId: 'TOPIC-189',
      terms: ['in-process', 'in process']
    },
    {
      id: 'queue-thread-safety',
      name: 'Thread safety',
      intuition: 'Concurrent queue operations must make each state transition atomic.',
      relevance: 'Claiming, changing lease ownership, and completing tasks must not race across workers.',
      diagnosticQuestion: 'Which state changes must happen together when a worker claims a task?',
      diagnosticSuccessCriteria: 'Removing pending work, assigning the lease, and recording its deadline are synchronized.',
      topicId: 'TOPIC-188',
      terms: ['thread-safe', 'thread safety', 'thread safe']
    }
  ],
  reasoningStages: [
    {
      id: 'queue-clarify-contract',
      title: 'Fix the failure and delivery contract',
      purpose: 'Separate the stated core problem from unstated requirements and follow-up scope.',
      learnerPrompt: 'State whether this queue survives process restart, what happens to a slow worker, whether duplicate processing is allowed, and what happens after repeated failures.',
      hint: 'Use the reported constraints: in-process state, silence or explicit errors, and an explicit terminal “cannot complete” outcome.',
      expectedOutcome: 'In-memory core, lease timeout plus heartbeat, at-least-once delivery, bounded attempts, and dead-lettering; restart durability is a follow-up.',
      verificationCriteria: ['Distinguishes worker failure from queue-process failure.', 'Does not promise exactly-once side effects.', 'Makes retry and ordering policy explicit.']
    },
    {
      id: 'queue-model-states',
      title: 'Model states and prove task conservation',
      purpose: 'Make it impossible for claim to erase the queue’s responsibility for a task.',
      learnerPrompt: 'List the task states and legal transitions. State the invariant that covers every submitted task.',
      hint: 'A task leaves the pending deque when claimed, but what record remains until it is done or dead-lettered?',
      expectedOutcome: 'PENDING → LEASED → DONE, or LEASED → PENDING on retry, or LEASED → DEAD at the limit; each task remains represented in exactly one current state.',
      verificationCriteria: ['DONE and DEAD are terminal.', 'A claim never deletes the task record.', 'Retry and timeout use the same bounded retry decision.']
    },
    {
      id: 'queue-lease-ownership',
      title: 'Make ownership expire safely',
      purpose: 'Detect silent workers while rejecting stale success/failure reports.',
      learnerPrompt: 'Specify the lease record, the timeout mechanism, the heartbeat operation, and the ownership check used by complete() and fail().',
      hint: 'Combine a deadline with a fresh per-claim token; test time through an injected clock rather than real sleeps.',
      expectedOutcome: 'A leased task stores deadline and token; expiry is reclaimed on claim, heartbeat advances the deadline, and reports require the current task/token pair.',
      verificationCriteria: ['A stale worker cannot alter the current lease.', 'A live slow worker can renew before reclamation.', 'The lazy-reclaim policy for late reports before another claim is stated.']
    },
    {
      id: 'queue-efficient-reclaim',
      title: 'Recover abandoned leases without scanning all tasks',
      purpose: 'Choose data structures and explain their cost, including stale expiry entries.',
      learnerPrompt: 'Describe the pending structure, expiry structure, and synchronization boundary. Give both worst-batch and amortized claim cost.',
      hint: 'Use FIFO for pending task IDs and a min-heap of deadline/token/task tuples; the lock protects transitions, not task execution.',
      expectedOutcome: 'A deque preserves FIFO, a min-heap processes due leases, and heap entries are validated against current task state. One claim may process many expiries; work is amortized across inserted/popped entries.',
      verificationCriteria: ['Mentions lazy reclaim may process k expired entries in one claim.', 'Does not overstate every claim as worst-case O(log n).', 'Worker processing runs outside the queue lock.']
    },
    {
      id: 'queue-test-failure-matrix',
      title: 'Turn failure guarantees into deterministic tests',
      purpose: 'Check transitions and failure behavior rather than only the happy path.',
      learnerPrompt: 'Map each guarantee to a test: crash redelivery, heartbeat, stale report, retry exhaustion, retry order, and concurrent claims. Name any important gaps.',
      hint: 'Advance a fake monotonic clock and assert task state, current token, attempt count, and whether the old lease report is accepted.',
      expectedOutcome: 'The supplied tests cover the main lease/retry paths and happy-path concurrency; add dedicated duplicate-report and contention/failure tests before treating the implementation as production-ready.',
      verificationCriteria: ['Each assertion checks externally visible queue behavior.', 'The “exactly once” threaded test is scoped to a no-failure run.', 'Tests that are absent from the pasted suite are called out rather than assumed.']
    }
  ],
  misconceptions: [
    'Removing a claimed task from pending is not the same as deleting the queue’s task record.',
    'A timeout does not prove a worker is dead; at-least-once processing permits duplicate work.',
    'Task ID alone is insufficient to accept completion after a retry; the lease token must match.',
    'A heap makes expiry lookup efficient but a burst of k expired entries can make one claim process k entries.',
    'Queue-level stale-report rejection does not undo an external side effect already performed by the stale worker.',
    'The supplied concurrent test covers successful work without worker failures; its name does not establish exactly-once effects under retries.'
  ],
  implementationPlan: [
    { id: 'queue-contract', task: 'Validate lease duration and retry limit, define task/lease records, and inject a monotonic clock.', verification: 'Invalid configuration is rejected and fake time can advance without sleeping.' },
    { id: 'queue-state', task: 'Implement submit and FIFO claim while keeping every task in the task table and incrementing attempts under a lock.', verification: 'A claimed task remains LEASED and its payload/task ID are stable.' },
    { id: 'queue-expiry', task: 'Push deadline/token/task tuples into a min-heap and reclaim current expired leases before handing out work.', verification: 'Expired tasks retry or dead-letter; stale heap entries do not change current state.' },
    { id: 'queue-reports', task: 'Implement complete, fail, and heartbeat with current-token ownership checks.', verification: 'Old, duplicate, or unknown lease reports do not mutate current ownership.' },
    { id: 'queue-failure-tests', task: 'Exercise crash, slow worker, stale report, retry limit, ordering, and concurrent success with a fake clock where relevant.', verification: 'Each guarantee is tied to an explicit state/result assertion and missing coverage is recorded.' }
  ],
  edgeCases: [],
  alternatives: [
    { name: 'Prefix scan of all leased tasks', time: 'O(number of tasks) per claim', space: 'O(number of tasks)', tradeoff: 'Simple but scales poorly as completed and pending task counts grow.' },
    { name: 'Background reaper thread', time: 'O(log n) per due lease', space: 'O(number of lease entries)', tradeoff: 'Can recover and alert without waiting for a new claim, but adds thread lifecycle and shutdown complexity.' },
    { name: 'Database-backed queue', time: 'Depends on indexes and transaction contention', space: 'Durable storage', tradeoff: 'Survives process restart and supports multiple processes, but requires atomic claim transactions and persistent-time semantics.' },
    { name: 'Retry at front of pending queue', time: 'O(1) enqueue', space: 'O(1) per retry', tradeoff: 'Preserves retry priority but can let one failing task monopolize workers; the source chooses the back for fairness.' }
  ],
  transferExercise: {
    prompt: 'A task sends a customer email, and the queue process must also survive restart. Extend the design so retries do not silently lose work and minimize duplicate emails.',
    changedConstraint: 'The task effect is external and non-transactional, while queue state must persist across process crashes.',
    assessmentCriteria: [
      'Persists task state and lease claims atomically (for example, a database queue transaction or append-only log) and uses wall-clock deadlines after restart.',
      'Uses an outbox or idempotency key keyed by task ID, and explains the provider’s idempotency limits.',
      'Distinguishes durable at-least-once delivery from exactly-once side effects.'
    ]
  },
  assessmentRubric: [
    { criterion: 'Contract and scope', evidence: 'Explicitly distinguishes worker failure, process restart, duplicate delivery, retry limit, ordering, and concurrency assumptions.' },
    { criterion: 'State and correctness', evidence: 'Defines legal states/transitions and argues task conservation, stale-token rejection, and bounded termination.' },
    { criterion: 'Implementation and complexity', evidence: 'Connects deque, heap, lock, and injected clock to operation behavior and qualified amortized costs.' },
    { criterion: 'Failure testing', evidence: 'Maps failure scenarios to deterministic tests and identifies uncovered assertions.' },
    { criterion: 'Transfer', evidence: 'Adapts the design to durability and external side effects without claiming exactly-once effects by queue logic alone.' }
  ],
  resources: [],
  qualityReview: {
    status: 'PILOT_REVIEWED',
    notes: [
      'This path is tied to the exact canonical prompt and solution by a SHA-256 source fingerprint.',
      'State transitions, invariants, named Python tests, complexity claims, and follow-ups were statically checked against the pasted source.',
      'No Python code from the pasted solution was executed; the existing browser code runner is not an appropriate isolation boundary.',
      'The source test named exactly_once covers a successful no-failure batch only; at-least-once retries can repeat external effects.',
      'Duplicate completion and constructor-boundary tests are recommended additions; restart and external side effects are follow-up scope.'
    ]
  },
  problemBreakdown: {
    schemaVersion: 1,
    sourceFingerprint,
    framing: {
      userGoal: 'Every accepted task must remain accounted for until a worker completes it or the queue visibly dead-letters it.',
      actors: ['Producer submits payloads.', 'Queue assigns leases and tracks task state.', 'Worker claims and processes a task outside the queue lock.'],
      assumptions: [
        'Workers are threads in one process and invoke queue methods directly.',
        'Worker failure is an explicit fail call or silence; the queue process itself is not required to survive restart in the core problem.',
        'A new claim triggers lazy expiry reclamation; there is no background reaper in the canonical design.',
        'Handlers tolerate at-least-once execution or make side effects idempotent.'
      ],
      outOfScope: [
        'Durable storage and recovery after the queue process restarts.',
        'Exactly-once external effects without cooperation from the handler or destination.',
        'Cross-process/network coordination and replicated queue availability.'
      ],
      clarifications: [
        { question: 'How is a failed worker detected?', decision: 'Accept explicit fail and use expiring leases for silence; allow heartbeat renewal.', whyItMatters: 'Explicit errors recover immediately while deadlines recover crashes and hangs.' },
        { question: 'Are duplicate deliveries allowed?', decision: 'Yes, at-least-once processing is acceptable.', whyItMatters: 'A slow worker can outlive its lease; tokens protect queue ownership but cannot undo an already-run side effect.' },
        { question: 'What happens after repeated failure?', decision: 'Bound deliveries with max_attempts and move exhausted tasks to DEAD.', whyItMatters: 'Unbounded retries can consume workers forever and never satisfy deliberate set-aside.' },
        { question: 'Must operations be thread-safe?', decision: 'Yes, within the process; protect state transitions with a lock.', whyItMatters: 'Concurrent claimers must not receive the same current lease.' },
        { question: 'What is the ordering policy?', decision: 'Claim pending tasks FIFO; retry at the tail.', whyItMatters: 'Tail retry prevents one broken task from blocking all later work.' },
        { question: 'Must queue state survive restart?', decision: 'Not in the core; cover durable recovery as a follow-up.', whyItMatters: 'Persistence changes claim atomicity, clock semantics, and recovery guarantees.' }
      ]
    },
    contract: [
      { operation: 'submit(payload)', behavior: 'Create a PENDING task, append its ID to FIFO pending work, and return a stable task ID.', complexity: 'O(1).' },
      { operation: 'claim()', behavior: 'Reclaim due leases, then lease the oldest pending task or return None; increment attempt and issue a fresh token.', complexity: 'Amortized O(log h) per heap entry processed; one call may process k expired entries.' },
      { operation: 'complete(lease)', behavior: 'Accept only the current lease token, transition to DONE, and return false for stale/duplicate reports.', complexity: 'O(1) state mutation.' },
      { operation: 'fail(lease, error)', behavior: 'Accept only the current token, retain the error, and retry at tail or transition to DEAD at max_attempts.', complexity: 'O(1) state mutation.' },
      { operation: 'heartbeat(lease)', behavior: 'Accept only the current token, extend its deadline, and add a new heap entry.', complexity: 'O(log h).' }
    ],
    states: [
      { id: 'PENDING', meaning: 'Queued for a worker and ordered in the pending deque.', terminal: false },
      { id: 'LEASED', meaning: 'Still recorded in the task table and temporarily owned by a worker until its current deadline.', terminal: false },
      { id: 'DONE', meaning: 'Completed by the current lease holder.', terminal: true },
      { id: 'DEAD', meaning: 'Retry limit exhausted; task and last error remain inspectable.', terminal: true }
    ],
    transitions: [
      { from: 'PENDING', to: 'LEASED', event: 'claim', guard: 'A pending task exists after due leases are reclaimed.', effect: 'Remove from pending, increment attempt, assign fresh token and deadline.' },
      { from: 'LEASED', to: 'DONE', event: 'complete', guard: 'Task is leased and supplied token matches the current token.', effect: 'Clear current lease; stale expiry entries later become no-ops.' },
      { from: 'LEASED', to: 'PENDING', event: 'fail or lease expiry', guard: 'Current token owns the lease and attempts are below max_attempts.', effect: 'Clear lease and append task ID to pending tail.' },
      { from: 'LEASED', to: 'DEAD', event: 'fail or lease expiry', guard: 'Current token owns the lease and attempts reached max_attempts.', effect: 'Clear lease and append task ID to dead-letter list.' },
      { from: 'LEASED', to: 'LEASED', event: 'heartbeat', guard: 'Supplied token is current.', effect: 'Extend deadline; previous heap entry is ignored when it no longer matches.' }
    ],
    invariants: [
      { id: 'task-conservation', statement: 'Every accepted task remains in exactly one current state record until DONE or DEAD; claim alone never deletes it.' },
      { id: 'single-current-lease', statement: 'A task has at most one current token, and only that token can complete, fail, or renew its current lease.' },
      { id: 'bounded-attempts', statement: 'Each claim increments attempts once and attempts never exceed max_attempts before the task becomes DEAD.' },
      { id: 'current-expiry-only', statement: 'An expiry heap entry changes a task only when state, token, and deadline still match the current lease.' },
      { id: 'serialized-transitions', statement: 'Queue state changes occur under one lock; task processing itself occurs outside that lock.' }
    ],
    correctnessArguments: [
      { claim: 'A worker crash does not lose a task.', invariantIds: ['task-conservation', 'bounded-attempts'], reasoning: 'The task remains LEASED with a deadline; the next claim reclaims it to PENDING or DEAD.' },
      { claim: 'A presumed-dead worker cannot overwrite the newer holder’s queue state.', invariantIds: ['single-current-lease', 'current-expiry-only'], reasoning: 'Redelivery replaces the token, so old complete/fail/heartbeat calls fail the current-token check.' },
      { claim: 'Concurrent claims cannot assign one pending task to two current holders.', invariantIds: ['single-current-lease', 'serialized-transitions'], reasoning: 'Deque removal, state update, attempt increment, and token assignment are one lock-protected transition.' },
      { claim: 'A permanently failing task does not retry forever.', invariantIds: ['task-conservation', 'bounded-attempts'], reasoning: 'On failure or expiry at max_attempts, the task moves to a retained DEAD record.' }
    ],
    failureScenarios: [
      { id: 'worker_crash', scope: 'CORE', situation: 'Worker exits after claim and never reports.', queueBehavior: 'After deadline, next claim requeues or dead-letters the task.', sourceTestNames: ['test_crashed_worker_task_is_redelivered_and_late_report_rejected'] },
      { id: 'silent_timeout', scope: 'CORE', situation: 'Worker hangs or becomes silent.', queueBehavior: 'Monotonic deadline expiry makes the lease eligible for reclaim on a later claim.', sourceTestNames: ['test_crashed_worker_task_is_redelivered_and_late_report_rejected'] },
      { id: 'slow_live_worker', scope: 'CORE', situation: 'Worker is slow but still making progress.', queueBehavior: 'Current lease holder heartbeats before expiry to move its deadline.', sourceTestNames: ['test_heartbeat_keeps_a_slow_task'] },
      { id: 'stale_worker_report', scope: 'CORE', situation: 'Old worker reports after task has been redelivered.', queueBehavior: 'Its old token does not match the new holder, so the report returns false without mutation.', sourceTestNames: ['test_crashed_worker_task_is_redelivered_and_late_report_rejected'] },
      { id: 'duplicate_report', scope: 'CORE', situation: 'Current worker calls complete twice or reports after DONE.', queueBehavior: 'The second report is rejected because the task is no longer LEASED.', sourceTestNames: [], additionalTestRecommendation: 'Add a test that a duplicate completion is rejected.' },
      { id: 'retry_exhaustion', scope: 'CORE', situation: 'Every delivery fails or expires.', queueBehavior: 'On max_attempts, move the task to DEAD and retain the last error.', sourceTestNames: ['test_task_that_always_fails_goes_to_dead_letter'] },
      { id: 'retry_fairness', scope: 'CORE', situation: 'A task fails while older pending work exists.', queueBehavior: 'Requeue at the tail so other pending tasks can run first.', sourceTestNames: ['test_failed_task_goes_behind_other_work'] },
      { id: 'concurrent_claims', scope: 'CORE', situation: 'Several worker threads claim available tasks concurrently.', queueBehavior: 'Lock serializes claims; the supplied test covers concurrent successful completion, not failures during contention.', sourceTestNames: ['test_threads_finish_every_task_exactly_once_without_failures'], additionalTestRecommendation: 'Add a contention test with expiries and explicit failures interleaved.' },
      { id: 'process_restart', scope: 'FOLLOW_UP', situation: 'The queue process crashes while tasks are pending or leased.', queueBehavior: 'The core in-memory design cannot recover; follow-up requires durable transitions and wall-clock deadlines.', sourceTestNames: [], additionalTestRecommendation: 'Out of core scope; add persistence/restart tests when the requirement is enabled.' },
      { id: 'duplicate_side_effect', scope: 'FOLLOW_UP', situation: 'A stale worker completes an external side effect after a retry has started.', queueBehavior: 'Lease tokens reject stale queue reports but cannot reverse external effects; handlers need idempotency/outbox or fencing support.', sourceTestNames: [], additionalTestRecommendation: 'Out of core scope; validate idempotency with a downstream-effect simulation in the durable/distributed follow-up.' }
    ],
    complexity: [
      { operation: 'submit', time: 'O(1)', space: 'O(1) new task state', qualification: 'Assumes expected O(1) dictionary insertion.' },
      { operation: 'claim', time: 'O(k log h) worst case for k due heap entries; amortized O(log h) per inserted/popped entry', space: 'O(1) beyond reclaimed entries', qualification: 'h is heap size; one claim can process a burst of expired entries.' },
      { operation: 'complete / fail', time: 'O(1)', space: 'O(1)', qualification: 'Does not eagerly remove stale heap entries; they are skipped when popped.' },
      { operation: 'heartbeat', time: 'O(log h)', space: 'O(1) heap entry per heartbeat', qualification: 'Old entries remain until their deadlines reach heap top and are discarded.' },
      { operation: 'overall', time: 'O(log h) per lease event amortized', space: 'O(total retained tasks + pending IDs + lease/heartbeat heap entries)', qualification: 'Completed task records are retained indefinitely in the sample; production cleanup/archival is a separate policy.' }
    ],
    tradeoffs: [
      { decision: 'Lease timeout plus heartbeat', benefit: 'Recovers silent crashes and accommodates slow healthy workers.', cost: 'False expiry can cause duplicate execution; heartbeat frequency and lease duration need tuning.' },
      { decision: 'Lazy expiry reclamation on claim', benefit: 'No reaper thread or shutdown lifecycle is required.', cost: 'Recovery waits until a worker calls claim; bursts of expiries make a single claim do more work.' },
      { decision: 'Retry at the pending tail', benefit: 'A poison task does not block later work.', cost: 'A retried task can lose strict original submission order.' },
      { decision: 'In-memory queue state', benefit: 'Simple core implementation and monotonic-clock deadlines.', cost: 'Queue-process restart loses all records; durable storage is explicitly outside core scope.' }
    ],
    deliverySemantics: {
      guarantee: 'At-least-once task processing while the queue process and workers continue operating; exhausted work is retained as DEAD.',
      duplicatesPossible: true,
      exactlyOnceEffectRequires: 'Idempotent handlers, a transactional outbox, or a downstream store that enforces task-scoped fencing/idempotency keys.'
    },
    followUps: [
      { change: 'Survive queue-process restart.', designConsequence: 'Persist transitions/claims atomically, recover unfinished leases, and use wall-clock deadlines across process restarts.' },
      { change: 'Prevent duplicate email or payment effects.', designConsequence: 'Use transactional outbox/idempotency at the destination; a lease token alone cannot undo a stale worker’s side effect.' },
      { change: 'Support workers on remote machines.', designConsequence: 'Move operations to RPC, expect network partitions and false expiry, add fencing and replicated durable queue state.' },
      { change: 'Support long-running tasks or avoid polling.', designConsequence: 'Use heartbeats/per-task leases or a condition that wakes at the earliest expiry.' }
    ],
    sourceReview: {
      status: 'PILOT_REVIEWED',
      notes: [
        'Compared the problem framing, assumptions, transitions, token checks, retry rule, heap behavior, and operation costs against the supplied canonical explanation and code.',
        'The source test named exactly_once_without_failures checks only a no-failure run; the breakdown explicitly limits that claim.',
        'Duplicate completion is described in source prose but lacks a dedicated test; the pipeline preserves that as a visible coverage warning.',
        'No code from the pasted Python solution was executed during content review.'
      ]
    }
  }
};
