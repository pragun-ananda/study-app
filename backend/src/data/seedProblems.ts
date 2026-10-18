import { CreateProblemPayload } from '../types.js';

export const SEED_INTERVIEW_PROBLEMS: CreateProblemPayload[] = [
  {
    id: 'PROB-RATE-LIMITER',
    title: 'Design a High-Throughput Distributed Rate Limiter',
    type: 'SYSTEM_DESIGN',
    difficulty: 'HARD',
    domain: 'SYSTEMS',
    summary: 'Design a resilient, multi-region distributed rate limiter serving 500,000 requests per second with sub-5ms latency.',
    prompt: `### Problem Prompt: Distributed Rate Limiter

You are asked to design an enterprise-scale distributed rate limiter for an API gateway handling **500,000 requests per second** across North America and Europe.

#### Functional Requirements:
1. **Configurable Rules**: Support limits per IP, API key, and user ID (e.g. 100 requests/minute for standard tiers, 10,000 requests/minute for premium).
2. **HTTP 429 Status**: Return standard HTTP 429 (Too Many Requests) with \`Retry-After\`, \`X-RateLimit-Limit\`, and \`X-RateLimit-Remaining\` headers.
3. **Multi-Algorithm Support**: Capable of switching between Token Bucket and Sliding Window Counter.

#### Non-Functional Requirements:
1. **Ultra-Low Latency**: Decision overhead must be strictly under **5ms** at p99.
2. **High Availability & Partition Tolerance**: If the rate-limiting cluster degrades, fail OPEN (allow traffic) to protect core business uptime.
3. **Race Condition Prevention**: Handle concurrent requests arriving simultaneously without double-spending tokens.`,
    solution: `### Canonical Architecture & Solution

\`\`\`mermaid
flowchart TD
  Client["Client Traffic"] --> EdgeLB["Cloudflare Anycast LB"]
  EdgeLB --> Gateway["API Gateway / Envoy EnvoyFilter"]
  subgraph Rate Limiter Service
    Gateway --> LocalCache["In-Memory Local Token Bucket"]
    LocalCache -.->|Batch Sync / Asynchronous Flush| RedisCluster[("Redis 7.0 Cluster + Lua Script")]
    Gateway -->|429 Rate Limited| Blocked["Drop with Retry-After Header"]
    Gateway -->|200 OK Allowed| Upstream["Upstream Microservices"]
  end
\`\`\`

#### 1. Core Algorithm: Sliding Window Log vs Sliding Window Counter
* **Token Bucket**: Memory efficient ($O(1)$ space per key: current tokens + last refill timestamp). However, burst traffic can overwhelm downstream services at window boundaries.
* **Sliding Window Counter**: Combines fixed-window counters with an interpolation factor:
  $$\\text{Count} = \\text{CurrentWindowCount} + \\text{PrevWindowCount} \\times \\left(1 - \\frac{\\text{CurrentOffset}}{\\text{WindowDuration}}\\right)$$
  Memory footprint: only 2 integer counters per key ($\\approx 32$ bytes).

#### 2. Atomicity & Race Condition Mitigation
To avoid the classic *Read-Check-Update* race condition under high concurrency:
\`\`\`lua
-- Redis Lua Script for Atomic Token Bucket Evaluation
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or "0")
if current + 1 > limit then
    return 0 -- Rejected
else
    redis.call("INCRBY", key, 1)
    if current == 0 then
        redis.call("EXPIRE", key, ARGV[2])
    end
    return 1 -- Allowed
end
\`\`\`

#### 3. Scale Math & Capacity Planning
* **QPS**: 500,000 requests/second.
* **Active User Keys**: 50,000,000 daily active users.
* **Storage per Key**: 64 bytes in Redis.
* **Total Memory**: $50\\text{M} \\times 64\\text{B} = 3.2\\text{ GB}$ (easily fits in a modest Redis cluster).
* **Throughput Strategy**: A single Redis node delivers $\\sim 80\\text{k}$ QPS. With a 10-node Redis cluster with pipeline batching and read replicas, we easily clear 500k RPS.`,
    hints: [
      'Think about whether the rate limiter should be implemented as an API gateway middleware or an independent microservice.',
      'How will you avoid concurrency race conditions when two requests from the same user arrive at the exact same millisecond?',
      'Consider the memory trade-offs between Sliding Window Log (high memory) vs Sliding Window Counter (minimal memory).'
    ],
    starterCode: {
      python: `class DistributedRateLimiter:
    def __init__(self, capacity: int, refill_rate_per_sec: float):
        self.capacity = capacity
        self.refill_rate = refill_rate_per_sec

    def allow_request(self, client_id: str, timestamp: float) -> bool:
        # TODO: Implement thread-safe token bucket logic
        return True`,
      typescript: `export class DistributedRateLimiter {
  constructor(private capacity: number, private refillRatePerSec: number) {}

  public allowRequest(clientId: string, timestamp: number): boolean {
    // TODO: Implement token bucket logic
    return true;
  }
}`
    },
    testCases: [
      { input: { clientId: 'user_1', requests: 5, capacity: 5 }, expected: true, explanation: 'Under limit' },
      { input: { clientId: 'user_1', requests: 6, capacity: 5 }, expected: false, explanation: 'Exceeds capacity' }
    ],
    rubric: {
      requirements_gathering: 20,
      scale_estimations: 20,
      system_architecture: 30,
      concurrency_and_failure_modes: 30
    },
    targetCompanies: ['Stripe', 'Netflix', 'Amazon', 'Cloudflare'],
    timeLimitMinutes: 45,
    prerequisiteTopicIds: ['TOPIC-073', 'TOPIC-078']
  },
  {
    id: 'PROB-KEY-VALUE-STORE',
    title: 'Design a Globally Distributed Masterless Key-Value Store',
    type: 'SYSTEM_DESIGN',
    difficulty: 'HARD',
    domain: 'SYSTEMS',
    summary: 'Design a masterless, partition-tolerant key-value store with tunable consistency inspired by Amazon Dynamo and Cassandra.',
    prompt: `### Problem Prompt: Globally Distributed Key-Value Store

Design a distributed, highly available key-value store capable of storing petabytes of data across multiple geographic regions with zero single point of failure.

#### Functional Requirements:
1. \`put(key, value)\`: Store or update an arbitrary binary blob up to 10MB.
2. \`get(key)\`: Retrieve the latest stored value for a given key.
3. **Tunable Consistency**: Support configurable read ($R$) and write ($W$) quorums per operation.

#### Non-Functional Requirements:
1. **Always Writable**: Writes must never fail due to network partitions or single node outages.
2. **Horizontal Scalability**: Seamlessly add or remove storage nodes without downtime.
3. **Anti-Entropy**: Detect and repair replica discrepancies in the background.`,
    solution: `### Canonical Architecture

\`\`\`mermaid
flowchart LR
  Client --> Coord["Coordinator Node"]
  subgraph Consistent Hash Ring
    Coord -->|Key Hash % 2^128| N1["Node 1 (Replica A)"]
    Coord -->|Next on Ring| N2["Node 2 (Replica B)"]
    Coord -->|Next on Ring| N3["Node 3 (Replica C)"]
  end
  N1 -.->|Merkle Tree Anti-Entropy| N2
\`\`\`

#### Key Architectural Decisions:
1. **Consistent Hashing with Virtual Nodes (vnodes)**: Maps keys and physical nodes to a $2^{128}$ ring. Assigning 128-256 vnodes per server guarantees even shard distribution and eliminates hotspots during rebalancing.
2. **Quorum Consensus Formula**:
   $$\\text{Strong Consistency: } R + W > N$$
   With replication factor $N = 3$, setting $R = 2, W = 2$ guarantees the read set overlaps with the write set by at least one updated replica.
3. **Conflict Resolution with Vector Clocks**: Concurrently modified items generate divergent vector clocks, returned to clients for semantic reconciliation.
4. **Anti-Entropy with Merkle Trees**: Nodes maintain hierarchical cryptographic hash trees of data ranges. Nodes only exchange branch hashes; if root hashes match, ranges are identical ($O(1)$ check).`,
    hints: [
      'Review the CAP Theorem and PACELC trade-offs. Why does an "Always Writable" store favor AP over CP?',
      'How do virtual nodes solve the hardware heterogeneity and cascading failure problem in a consistent hash ring?',
      'How do Merkle trees minimize network bandwidth during cross-datacenter replica synchronization?'
    ],
    starterCode: {
      python: `class ConsistentHashRing:
    def __init__(self, replicas: int = 100):
        self.replicas = replicas
        self.ring = {}

    def add_node(self, node: str):
        pass

    def get_node(self, key: str) -> str:
        return ""`
    },
    testCases: [
      { input: { r: 2, w: 2, n: 3 }, expected: true, explanation: 'Strict Quorum Holds: R + W > N (read set overlaps with write set)' },
      { input: { r: 1, w: 2, n: 3 }, expected: false, explanation: 'Eventual Consistency: R + W <= N (stale reads possible)' }
    ],
    rubric: {
      data_partitioning: 25,
      replication_and_consistency: 30,
      conflict_resolution: 25,
      anti_entropy_mechanisms: 20
    },
    targetCompanies: ['Amazon', 'Netflix', 'Apple', 'Meta'],
    timeLimitMinutes: 45,
    prerequisiteTopicIds: ['TOPIC-073', 'TOPIC-035']
  },
  {
    id: 'PROB-TRAPPING-RAIN-WATER',
    title: 'Trapping Rain Water & Histogram Maximum Boundary',
    type: 'CODING',
    difficulty: 'HARD',
    domain: 'CS',
    summary: 'Calculate total trapped rainwater volume given elevation map heights using two pointers or monotonic stacks in O(n) time.',
    prompt: `### Problem: Trapping Rain Water

Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.

#### Example:
\`\`\`text
Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6
Explanation: The elevation map traps 6 units of rain water.
\`\`\`

#### Constraints:
* \`n == height.length\`
* \`1 <= n <= 2 * 10^4\`
* \`0 <= height[i] <= 10^5\`
* Target Time Complexity: **O(n)**
* Target Space Complexity: **O(1)**`,
    solution: `### Optimal Solution: Two-Pointer Technique

\`\`\`python
def trap(height: list[int]) -> int:
    if not height:
        return 0

    left, right = 0, len(height) - 1
    left_max, right_max = height[left], height[right]
    water = 0

    while left < right:
        if left_max < right_max:
            left += 1
            left_max = max(left_max, height[left])
            water += left_max - height[left]
        else:
            right -= 1
            right_max = max(right_max, height[right])
            water += right_max - height[right]

    return water
\`\`\`

#### Complexity Analysis:
* **Time Complexity**: $\\mathcal{O}(n)$ — each pointer increments/decrements at most $n$ times.
* **Space Complexity**: $\\mathcal{O}(1)$ — constant auxiliary memory.

#### Core Algorithmic Invariant:
At index \`left\`, the trapped water is bounded by $\\min(\\text{left\\_max}, \\text{right\\_max}) - \\text{height}[\\text{left}]$. Since $\\text{left\\_max} < \\text{right\\_max}$, we can guarantee that the right boundary will never restrict water height below \`left_max\`, allowing single-pass accumulation.`,
    hints: [
      'What determines how much water can be trapped at index i? (Answer: min(max_left, max_right) - height[i])',
      'Instead of precomputing prefix and suffix max arrays in O(n) space, can you maintain running maxes with two converging pointers?'
    ],
    starterCode: {
      python: `class Solution:
    def trap(self, height: list[int]) -> int:
        # TODO: Implement O(n) time O(1) space solution
        return 0`,
      typescript: `export function trap(height: number[]): number {
  // TODO: Implement O(n) time O(1) space solution
  return 0;
}`,
      java: `class Solution {
    public int trap(int[] height) {
        // TODO: Implement O(n) time O(1) space solution
        return 0;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>

class Solution {
public:
    int trap(std::vector<int>& height) {
        // TODO: Implement O(n) time O(1) space solution
        return 0;
    }
};`,
      go: `package solution

// Trap calculates total trapped rainwater volume
func Trap(height []int) int {
    // TODO: Implement O(n) time O(1) space solution
    return 0
}`,
      rust: `pub struct Solution;

impl Solution {
    pub fn trap(height: Vec<i32>) -> i32 {
        // TODO: Implement O(n) time O(1) space solution
        0
    }
}`,
      sql: `-- Schema: ElevationMap(position INT PRIMARY KEY, bar_height INT)
-- Compute total trapped water volume using window functions
SELECT 
    COALESCE(SUM(GREATEST(0, LEAST(left_max, right_max) - bar_height)), 0) AS trapped_water
FROM (
    SELECT 
        position,
        bar_height,
        MAX(bar_height) OVER (ORDER BY position ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS left_max,
        MAX(bar_height) OVER (ORDER BY position ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS right_max
    FROM ElevationMap
) water_basin;`,
      protobuf: `syntax = "proto3";

package interview.trapping_water;

service WaterTrappingService {
    rpc CalculateTrappedWater (WaterRequest) returns (WaterResponse);
}

message WaterRequest {
    repeated int32 elevation_heights = 1;
}

message WaterResponse {
    int32 total_trapped_volume = 1;
    int64 execution_time_ns = 2;
}`
    },
    testCases: [
      { input: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], expected: 6 },
      { input: [4, 2, 0, 3, 2, 5], expected: 9 }
    ],
    rubric: {
      correctness: 40,
      optimal_time_space: 30,
      edge_cases: 15,
      code_clarity: 15
    },
    targetCompanies: ['Google', 'Meta', 'Amazon', 'Bloomberg'],
    timeLimitMinutes: 30,
    prerequisiteTopicIds: ['TOPIC-034', 'TOPIC-040']
  },
  {
    id: 'PROB-LRU-LFU-CACHE',
    title: 'Implement High-Performance LRU & LFU Cache with O(1) Operations',
    type: 'CODING',
    difficulty: 'MEDIUM',
    domain: 'CS',
    summary: 'Implement Least Recently Used (LRU) and Least Frequently Used (LFU) eviction policies with O(1) get and put time complexity.',
    prompt: `### Problem: LRU Cache Implementation

Design a data structure that follows the constraints of a **Least Recently Used (LRU) Cache**.

Implement the \`LRUCache\` class:
* \`LRUCache(int capacity)\`: Initialize the LRU cache with positive size \`capacity\`.
* \`int get(int key)\`: Return the value of the \`key\` if the key exists, otherwise return \`-1\`.
* \`void put(int key, int value)\`: Update the value of the \`key\` if the \`key\` exists. Otherwise, add the \`key-value\` pair to the cache. If the number of keys exceeds the \`capacity\` from this operation, evict the least recently used key.

#### Constraints:
* The functions \`get\` and \`put\` must each run in **O(1)** average time complexity.`,
    solution: `### Solution: Hash Map + Doubly Linked List

\`\`\`python
class Node:
    def __init__(self, key=0, val=0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        # Sentinel dummy head and tail
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_to_head(self, node: Node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._insert_to_head(node)
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])
        node = Node(key, value)
        self.cache[key] = node
        self._insert_to_head(node)
        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]
\`\`\`

#### Complexity Analysis:
* \`get(key)\`: $\\mathcal{O}(1)$ time.
* \`put(key, value)\`: $\\mathcal{O}(1)$ time.
* Space: $\\mathcal{O}(\\text{capacity})$ for hash table + doubly linked list.`,
    hints: [
      'A hash map gives O(1) lookups, but does not maintain order.',
      'A doubly linked list allows O(1) removals and insertions given node references.',
      'Use dummy head and tail sentinel nodes to eliminate tedious null-pointer edge cases.'
    ],
    starterCode: {
      python: `class LRUCache:
    def __init__(self, capacity: int):
        pass

    def get(self, key: int) -> int:
        return -1

    def put(self, key: int, value: int) -> None:
        pass`
    },
    testCases: [
      { input: { capacity: 2, operations: ['put(1,1)', 'put(2,2)', 'get(1)', 'put(3,3)', 'get(2)'] }, expected: [null, null, 1, null, -1], explanation: 'Key 2 evicted when key 3 inserted' },
      { input: { capacity: 1, operations: ['put(2,1)', 'get(2)', 'put(3,2)', 'get(2)', 'get(3)'] }, expected: [null, 1, null, -1, 2], explanation: 'Key 2 evicted when key 3 inserted into 1-capacity cache' }
    ],
    rubric: {
      correctness: 40,
      o1_time_invariants: 30,
      sentinel_nodes_cleanliness: 15,
      edge_cases: 15
    },
    targetCompanies: ['Google', 'Meta', 'Apple', 'Microsoft'],
    timeLimitMinutes: 30,
    prerequisiteTopicIds: ['TOPIC-053', 'TOPIC-038']
  },
  {
    id: 'PROB-VECTOR-SEARCH-RECOMMENDER',
    title: 'Design a Real-Time Multimodal Vector Search & Recommendation System',
    type: 'ML_SYSTEM_DESIGN',
    difficulty: 'HARD',
    domain: 'AI & ML',
    summary: 'Design a low-latency multimodal retrieval engine pairing CLIP embeddings, HNSW vector indexing, and Reciprocal Rank Fusion.',
    prompt: `### Problem: Real-Time Multimodal Vector Search & Recommendation Engine

Design an AI-driven search and recommendation engine serving **250 million users** searching across text and image catalogs (e.g. Pinterest Visual Search or E-Commerce Multimodal Search).

#### Requirements:
1. **Multimodal Query Ingestion**: Support both natural language text queries and image upload queries.
2. **Sub-50ms p99 Retrieval**: Search over an index of **500,000,000 multimodal items**.
3. **Hybrid Ranking**: Blend dense semantic similarity with sparse keyword signals (BM25) and user personalization features.`,
    solution: `### High-Level Architecture

\`\`\`mermaid
flowchart TD
  User["User Query: Text or Image"] --> Gateway["API Gateway"]
  Gateway --> EmbedSvc["Dual-Tower Embedding Service (CLIP / ViT)"]
  EmbedSvc -->|Vector Embedding 1536-dim| SearchCluster["Hybrid Search Cluster"]
  subgraph Hybrid Search Engine
    SearchCluster --> DenseIndex["HNSW Vector Index (ANN Cosine)"]
    SearchCluster --> SparseIndex["BM25 Inverted Index"]
    DenseIndex --> RRF["Reciprocal Rank Fusion (RRF)"]
    SparseIndex --> RRF
  end
  RRF --> ReRanker["Cross-Encoder Heavy Re-Ranker"]
  ReRanker --> Results["Top 50 Personalized Candidates"]
\`\`\`

#### Key Components:
1. **Embedding Alignment with CLIP**: Uses joint visual-linguistic embeddings trained via contrastive InfoNCE loss, enabling direct cosine similarity between query text vectors and catalog image vectors.
2. **Approximate Nearest Neighbor (ANN) via HNSW**:
   * Graphs partitioned across shards using consistent hashing on item IDs.
   * Scaled multi-layer skip graphs deliver logarithmic search time $\\mathcal{O}(\\log N)$.
3. **Hybrid Search Fusion (RRF)**:
   $$RRF(d) = \\sum_{m \\in \\{dense, sparse\\}} \\frac{1}{k + \\text{rank}_m(d)}$$
   Prevents score distribution skew between BM25 unbounded scores and cosine similarities bounded in $[-1, 1]$.`,
    hints: [
      'Why is exact k-Nearest Neighbors (kNN) computationally intractable for 500M items at 50ms latency?',
      'How does Hierarchical Navigable Small World (HNSW) balance recall vs search latency compared to IVF-PQ?',
      'How does Reciprocal Rank Fusion eliminate the need for brittle score normalization calibration?'
    ],
    starterCode: {},
    testCases: [
      { input: { queryVector: [0.6, 0.8], candidates: [{ id: 'item_1', vector: [0.6, 0.8] }, { id: 'item_2', vector: [-0.6, -0.8] }] }, expected: 'item_1', explanation: 'Top cosine similarity candidate is item_1' },
      { input: { queryVector: [1.0, 0.0], candidates: [{ id: 'item_A', vector: [0.7, 0.7] }, { id: 'item_B', vector: [0.99, 0.01] }] }, expected: 'item_B', explanation: 'Closest angular match is item_B' }
    ],
    rubric: {
      embedding_pipeline: 25,
      vector_indexing_hnsw: 30,
      hybrid_fusion_rrf: 25,
      serving_latency_tradeoffs: 20
    },
    targetCompanies: ['OpenAI', 'Pinterest', 'Netflix', 'Google'],
    timeLimitMinutes: 45,
    prerequisiteTopicIds: ['TOPIC-051', 'TOPIC-053']
  }
];
