import { QueueFailureArea, QueueProblemBreakdown } from '../types.js';
import { CanonicalProblemSource, fingerprintProblemSource } from '../utils/problemSource.js';

export interface ProblemBreakdownValidationReport {
  valid: boolean;
  pilotReady: boolean;
  sourceFingerprint: string;
  errors: string[];
  warnings: string[];
}

const REQUIRED_FAILURE_AREAS: QueueFailureArea[] = [
  'worker_crash',
  'silent_timeout',
  'slow_live_worker',
  'stale_worker_report',
  'duplicate_report',
  'retry_exhaustion',
  'retry_fairness',
  'concurrent_claims',
  'process_restart',
  'duplicate_side_effect'
];

const textIsPresent = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/**
 * Validate the breakdown against the canonical prompt and solution. This is a
 * structural and traceability check; it does not claim to prove the Python
 * implementation correct or to execute code from problem content.
 */
export function validateQueueProblemBreakdown(
  source: CanonicalProblemSource,
  value: unknown
): ProblemBreakdownValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sourceFingerprint = fingerprintProblemSource(source);

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, pilotReady: false, sourceFingerprint, errors: ['Breakdown must be an object.'], warnings };
  }

  const breakdown = value as Partial<QueueProblemBreakdown>;
  if (breakdown.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (breakdown.sourceFingerprint !== sourceFingerprint) errors.push('Breakdown source fingerprint does not match the canonical prompt and solution.');

  const framing = breakdown.framing;
  if (!textIsPresent(framing?.userGoal)) errors.push('framing.userGoal is required.');
  for (const key of ['actors', 'assumptions', 'outOfScope'] as const) {
    const values = framing?.[key];
    if (!Array.isArray(values) || values.length === 0 || values.some((item) => !textIsPresent(item))) {
      errors.push(`framing.${key} must contain non-empty statements.`);
    }
  }
  if (!Array.isArray(framing?.clarifications) || framing.clarifications.length === 0 || framing.clarifications.some((item) =>
    !textIsPresent(item?.question) || !textIsPresent(item?.decision) || !textIsPresent(item?.whyItMatters)
  )) errors.push('Every clarification needs a question, explicit decision, and rationale.');

  if (!Array.isArray(breakdown.contract) || breakdown.contract.length < 4 || breakdown.contract.some((item) =>
    !textIsPresent(item?.operation) || !textIsPresent(item?.behavior) || !textIsPresent(item?.complexity)
  )) errors.push('The queue contract needs at least four fully specified operations.');

  const states = Array.isArray(breakdown.states) ? breakdown.states : [];
  const stateIds = new Set(states.map((state) => state?.id));
  if (states.length < 4 || states.some((state) => !textIsPresent(state?.id) || !textIsPresent(state?.meaning) || typeof state?.terminal !== 'boolean')) {
    errors.push('The state model needs named states, meanings, and terminal markers.');
  }
  if (stateIds.size !== states.length) errors.push('State IDs must be unique.');
  const terminalStateIds = new Set(states.filter((state) => state?.terminal).map((state) => state.id));
  const transitions = Array.isArray(breakdown.transitions) ? breakdown.transitions : [];
  if (transitions.length < 4 || transitions.some((transition) =>
    !stateIds.has(transition?.from) || !stateIds.has(transition?.to) || !textIsPresent(transition?.event) ||
    !textIsPresent(transition?.guard) || !textIsPresent(transition?.effect)
  )) errors.push('Every state transition must reference known states and explain its event, guard, and effect.');
  if (transitions.some((transition) => terminalStateIds.has(transition.from))) errors.push('Terminal task states cannot have outgoing transitions.');

  const invariants = Array.isArray(breakdown.invariants) ? breakdown.invariants : [];
  const invariantIds = new Set(invariants.map((invariant) => invariant?.id));
  if (invariants.length < 4 || invariants.some((invariant) => !textIsPresent(invariant?.id) || !textIsPresent(invariant?.statement))) {
    errors.push('At least four explicit, named invariants are required.');
  }
  if (invariantIds.size !== invariants.length) errors.push('Invariant IDs must be unique.');
  const argumentsList = Array.isArray(breakdown.correctnessArguments) ? breakdown.correctnessArguments : [];
  if (argumentsList.length < 3 || argumentsList.some((argument) => !textIsPresent(argument?.claim) ||
    !textIsPresent(argument?.reasoning) || !Array.isArray(argument?.invariantIds) || argument.invariantIds.length === 0 ||
    argument.invariantIds.some((id) => !invariantIds.has(id)))) {
    errors.push('Correctness arguments must cite one or more declared invariants.');
  }

  const scenarios = Array.isArray(breakdown.failureScenarios) ? breakdown.failureScenarios : [];
  const scenarioAreas = new Set(scenarios.map((scenario) => scenario?.id));
  for (const area of REQUIRED_FAILURE_AREAS) {
    if (!scenarioAreas.has(area)) errors.push(`Failure analysis is missing '${area}'.`);
  }
  for (const scenario of scenarios) {
    if (!textIsPresent(scenario?.situation) || !textIsPresent(scenario?.queueBehavior) || !Array.isArray(scenario?.sourceTestNames)) {
      errors.push(`Failure scenario '${scenario?.id || '(unknown)'}' is incomplete.`);
      continue;
    }
    for (const testName of scenario.sourceTestNames) {
      const testDeclaration = new RegExp(`\\bdef\\s+${escapeRegExp(testName)}\\s*\\(`);
      if (!testDeclaration.test(source.solution)) errors.push(`Failure scenario '${scenario.id}' references missing source test '${testName}'.`);
    }
    if (scenario.sourceTestNames.length === 0) {
      if (!textIsPresent(scenario.additionalTestRecommendation)) {
        errors.push(`Failure scenario '${scenario.id}' needs a source test or a clearly recorded test recommendation.`);
      } else {
        warnings.push(`No test in the pasted solution directly covers '${scenario.id}'; recommendation recorded.`);
      }
    }
  }

  const complexity = Array.isArray(breakdown.complexity) ? breakdown.complexity : [];
  if (complexity.length < 4 || complexity.some((item) => !textIsPresent(item?.operation) || !textIsPresent(item?.time) ||
    !textIsPresent(item?.space) || !textIsPresent(item?.qualification))) errors.push('Complexity analysis must cover queue operations and qualify amortized work.');
  if (!textIsPresent(breakdown.deliverySemantics?.guarantee) || typeof breakdown.deliverySemantics?.duplicatesPossible !== 'boolean' ||
    !textIsPresent(breakdown.deliverySemantics?.exactlyOnceEffectRequires)) {
    errors.push('Delivery semantics must distinguish queue guarantees from exactly-once side effects.');
  }
  if (source.solution.includes('exactly_once') && breakdown.deliverySemantics?.duplicatesPossible !== true) {
    errors.push('The solution test name mentions exactly-once behavior; the breakdown must clarify that retries can duplicate processing effects.');
  }
  if (!Array.isArray(breakdown.tradeoffs) || breakdown.tradeoffs.length < 3 || breakdown.tradeoffs.some((item) =>
    !textIsPresent(item?.decision) || !textIsPresent(item?.benefit) || !textIsPresent(item?.cost)
  )) errors.push('At least three decisions must include benefits and costs.');
  if (!Array.isArray(breakdown.followUps) || breakdown.followUps.length < 3 || breakdown.followUps.some((item) =>
    !textIsPresent(item?.change) || !textIsPresent(item?.designConsequence)
  )) errors.push('At least three follow-ups must explain how a changed requirement affects the design.');

  if (!breakdown.sourceReview || !['PILOT_REVIEWED', 'NEEDS_REVIEW'].includes(breakdown.sourceReview.status) ||
    !Array.isArray(breakdown.sourceReview.notes) || breakdown.sourceReview.notes.length === 0 ||
    breakdown.sourceReview.notes.some((note) => !textIsPresent(note))) {
    errors.push('Source review status and evidence notes are required.');
  }
  if (breakdown.sourceReview?.status !== 'PILOT_REVIEWED') warnings.push('This breakdown still requires technical review before it can be used as a pilot.');

  const valid = errors.length === 0;
  const pilotReady = valid && breakdown.sourceReview?.status === 'PILOT_REVIEWED';
  return { valid, pilotReady, sourceFingerprint, errors, warnings };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
