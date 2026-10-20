export const CURATED_PROBLEM_CONCEPT_NODES = [
  {
    id: 'TOPIC-188',
    name: 'Thread Safety',
    category: 'SYSTEMS' as const,
    summary: 'Coordinating concurrent access to shared state so operations remain correct under interleaving.',
    coordinates: [-4, 17, 5] as [number, number, number],
    note: { id: 'NOTE-Q-THREAD-SAFETY', title: 'Thread Safety in Shared Queues', filename: 'queue-thread-safety.md' }
  },
  {
    id: 'TOPIC-189',
    name: 'In-Process vs Distributed Work Queues',
    category: 'SYSTEMS' as const,
    summary: 'How a queue’s failure model and coordination needs change when workers move beyond one process.',
    coordinates: [-8, 17, 7] as [number, number, number],
    note: { id: 'NOTE-Q-IN-PROCESS', title: 'In-Process and Distributed Queue Boundaries', filename: 'queue-process-boundary.md' }
  },
  {
    id: 'TOPIC-190',
    name: 'Dead Letter Queues',
    category: 'SYSTEMS' as const,
    summary: 'A terminal holding area for tasks that have exhausted their retry policy, preserving them for inspection or replay.',
    coordinates: [-4, 13, 3] as [number, number, number],
    note: { id: 'NOTE-Q-DEAD-LETTER', title: 'Dead Letter Queues and Retry Exhaustion', filename: 'queue-dead-letter.md' }
  }
];
