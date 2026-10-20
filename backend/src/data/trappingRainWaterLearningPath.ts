import { InterviewLearningPath } from '../types.js';

/** Curated one-question pilot. This artifact never replaces the canonical problem solution. */
export const TRAPPING_RAIN_WATER_LEARNING_PATH: InterviewLearningPath = {
  problemId: 'PROB-TRAPPING-RAIN-WATER',
  version: 1,
  publicationStatus: 'PILOT',
  interpretation: {
    goal: 'Return the total number of unit-width water cells that remain above the bars after rain.',
    constraints: [
      'Heights are non-negative integers and the input has between 1 and 20,000 bars.',
      'Target O(n) time and O(1) auxiliary space.',
      'Water at an index cannot rise above the shorter of its tallest boundary to the left and right.'
    ],
    observations: [
      'The answer is the sum of independent contributions from each index.',
      'An index contributes no water when either side has no taller boundary.',
      'The input is small enough for a linear scan; storing left and right maxima arrays would use O(n) extra space.'
    ]
  },
  concepts: [
    {
      id: 'water-level-bound',
      name: 'Per-index water bound',
      intuition: 'A column holds water only up to its shorter enclosing wall; its trapped depth is the boundary level minus its own height, clamped at zero.',
      relevance: 'This turns a picture of basins into a precise quantity that can be summed.',
      diagnosticQuestion: 'For heights [3, 0, 2], how much water sits above the middle bar, and which two boundaries limit it?',
      diagnosticSuccessCriteria: 'Identifies the right wall of height 2 as the limiting wall and computes 2 units.'
    },
    {
      id: 'two-pointer-invariant',
      name: 'Two pointers with running maxima',
      intuition: 'Maintain the tallest wall seen from each end. When one side’s running maximum is smaller, that side determines the current water level.',
      relevance: 'It lets us settle one index at a time without storing a maximum for every index.',
      diagnosticQuestion: 'If leftMax is 2 and rightMax is 5, which side can be finalized now, and why?',
      diagnosticSuccessCriteria: 'Chooses the left side because the known right boundary is already at least as tall as leftMax.'
    }
  ],
  reasoningStages: [
    {
      id: 'derive-depth',
      title: 'Derive the amount above one bar',
      purpose: 'Translate the basin picture into a per-index expression.',
      learnerPrompt: 'For a bar at index i, name the tallest boundary on each side and express the water depth above the bar.',
      hint: 'Draw only one bar and its nearest tallest wall on each side. Which wall controls the water surface?',
      expectedOutcome: 'depth[i] = max(0, min(leftMax[i], rightMax[i]) - height[i]).',
      verificationCriteria: ['The shorter maximum is the water level.', 'Negative depth is clamped to zero.']
    },
    {
      id: 'choose-safe-side',
      title: 'Decide which pointer is safe to move',
      purpose: 'Use the known bound on one side to avoid precomputing both maximum arrays.',
      learnerPrompt: 'When leftMax <= rightMax, explain why the current left position can be finalized without knowing the exact maximum to its right.',
      hint: 'Compare the worst possible right boundary with the left maximum you have already observed.',
      expectedOutcome: 'The right boundary is at least leftMax, so the shorter boundary for this position is determined by leftMax.',
      verificationCriteria: ['The argument compares running maxima rather than adjacent bars.', 'It explains why unvisited positions cannot lower the known right bound.']
    },
    {
      id: 'write-invariant',
      title: 'State the loop invariant',
      purpose: 'Make the pointer movement and accumulation auditable.',
      learnerPrompt: 'State what leftMax, rightMax, and water mean before each loop iteration.',
      hint: 'Describe the prefix and suffix each maximum covers, then describe which indices have already been charged to water.',
      expectedOutcome: 'Each running maximum covers all bars seen from its end, and water equals the exact contribution of every processed index.',
      verificationCriteria: ['Both maxima include the current pointer positions.', 'Each pointer moves inward and every index is processed at most once.']
    },
    {
      id: 'implement-and-check',
      title: 'Implement and test the scan',
      purpose: 'Turn the invariant into a linear, constant-space implementation.',
      learnerPrompt: 'Write the scan using two pointers, two running maxima, and one water accumulator. Check the supplied examples and edge cases.',
      hint: 'Initialize maxima from the endpoints, then process the side with the smaller running maximum.',
      expectedOutcome: 'A single pass that adds runningMax - currentHeight for the finalized side and returns the accumulated volume.',
      verificationCriteria: ['Each added contribution is non-negative.', 'The example outputs are 6 and 9.', 'Time is O(n) and auxiliary space is O(1).']
    }
  ],
  misconceptions: [
    'Comparing only adjacent heights is not enough; water depends on the tallest boundary found across each side.',
    'The smaller of the two running maxima determines the water level, not the larger one.',
    'A two-pointer scan does not mean both pointers move on every iteration; only the side with the smaller known maximum is finalized.'
  ],
  implementationPlan: [
    { id: 'init', task: 'Initialize left and right at the endpoints, running maxima from endpoint heights, and water to zero.', verification: 'Both maxima are valid for their seen ranges before the loop begins.' },
    { id: 'scan', task: 'While left is left of right, advance the side with the smaller running maximum, update that maximum, and accumulate its water depth.', verification: 'The chosen side is bounded by a known maximum on the opposite side.' },
    { id: 'return', task: 'Return the accumulated water after the pointers meet.', verification: 'Every interior index was processed once and endpoints contribute zero.' }
  ],
  edgeCases: [
    { input: [2, 0, 2], expected: 2, why: 'A single basin is bounded equally from both sides.' },
    { input: [3, 2, 1], expected: 0, why: 'A monotone slope has no enclosing right wall for interior bars.' },
    { input: [4, 2, 0, 3, 2, 5], expected: 9, why: 'Checks uneven basins and changing limiting sides.' }
  ],
  alternatives: [
    { name: 'Prefix and suffix maximum arrays', time: 'O(n)', space: 'O(n)', tradeoff: 'Directly applies the per-index formula and is easy to reason about, but uses linear auxiliary memory.' },
    { name: 'Monotonic stack', time: 'O(n)', space: 'O(n)', tradeoff: 'Computes basin volume when a right wall closes a basin; useful for related histogram problems but has more stack bookkeeping.' }
  ],
  transferExercise: {
    prompt: 'Each bar now has a positive width width[i], and the bars form a piecewise-constant terrain. Compute trapped water volume.',
    changedConstraint: 'The water volume above a bar is its trapped depth multiplied by that bar’s width.',
    assessmentCriteria: [
      'Derives volume[i] = max(0, min(leftMax[i], rightMax[i]) - height[i]) * width[i].',
      'Explains why the same smaller-running-maximum pointer rule remains valid.',
      'Gives O(n) time and O(1) extra space and handles non-uniform widths.'
    ]
  },
  assessmentRubric: [
    { criterion: 'Model', evidence: 'Correctly derives the per-index water bound and handles zero depth.' },
    { criterion: 'Reasoning', evidence: 'Justifies which pointer is safe to finalize using the running-maximum invariant.' },
    { criterion: 'Implementation', evidence: 'Produces a linear scan with non-negative contributions and correct edge-case results.' },
    { criterion: 'Transfer', evidence: 'Adapts the computation to variable widths without losing the boundary argument.' }
  ],
  resources: [],
  qualityReview: {
    status: 'PILOT_REVIEWED',
    notes: [
      'Curated pilot; reasoning and expected outputs were checked against the canonical two-pointer implementation and prompt constraints.',
      'No external resource URLs are included until individually verified.',
      'The question currently has no matching prerequisite topic nodes; its unrelated BST and segment-tree associations were removed.'
    ]
  }
};
