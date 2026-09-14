import { ApplicationItem } from '../../types/telemetry';

export const SEED_APPLICATIONS: ApplicationItem[] = [
  {
    id: 'APP-001',
    title: 'Dynamo & Cassandra: High-Availability Ring Storage',
    type: 'CASE_STUDY',
    domain: 'SYSTEMS',
    difficulty: 'ADVANCED',
    organization: 'Amazon Dynamo / Apache Cassandra',
    readTimeMinutes: 9,
    summary:
      'How Dynamo and Cassandra implement peer-to-peer consistent hash rings and vector clocks to achieve masterless, always-writable distributed storage.',
    topicIds: [],
    topicNames: [
      'CAP Theorem & PACELC',
      'Consistent Hashing & DHT',
      'Vector Clocks & Lamport Timestamps',
      'Dynamo Database Architecture'
    ],
    externalUrl: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
    content: `## Executive Overview

When Amazon published the seminal **Dynamo** paper in 2007, it established the blueprint for partition-tolerant, decentralized key-value stores. In high-traffic e-commerce and streaming workloads, availability under network partitions directly correlates with business continuity:

> **Core Philosophy:** "Always Writable" — write operations must never be rejected due to network partitions or partial cluster failures.

\`\`\`mermaid
graph TD
  Client[Client Application] --> Coordinator[Coordinator Node A]
  subgraph Consistent Hash Ring
    Coordinator -->|Key Hash % 2^128| NodeB[Node B - Replica 1]
    Coordinator -->|Next in Ring| NodeC[Node C - Replica 2]
    Coordinator -->|Next in Ring| NodeD[Node D - Replica 3]
  end
\`\`\`

---

## Architectural Pillars

### 1. Consistent Hashing & Virtual Nodes
Traditional modulo hashing ($\\text{hash}(\\text{key}) \\pmod N$) requires remapping almost all keys when a single node joins or dies ($O(K)$ movement). 

Dynamo maps both nodes and keys onto a circular $2^{128}$ ring space:
* Each physical machine is assigned multiple **Virtual Nodes (vnodes)** (typically 128 to 256).
* Virtual nodes prevent **data hotspots** on machines with disparate hardware capabilities.
* When a node fails, its virtual nodes disperse the rebalancing load evenly across the entire cluster rather than burdening a single neighbor.

### 2. Tunable Quorum Consensus ($R + W > N$)
Cassandra and Dynamo sacrifice strict consistency (choosing **AP** in CAP / **PA/EL** in PACELC) while giving clients fine-grained trade-offs via configurable quorums:

$$\\text{Replication Factor } N, \\quad \\text{Read Quorum } R, \\quad \\text{Write Quorum } W$$

* **Strong Consistency:** $R + W > N$ guarantees that the read set and write set overlap by at least one replica node holding the most recent version.
* **Eventual Consistency / Max Write Throughput:** $W = 1$, $R = 1$ provides ultra-low write latency at the expense of temporary stale reads.

### 3. Versioning & Vector Clocks
Because nodes can accept concurrent writes during a network partition, divergence is inevitable. Dynamo uses **Vector Clocks** to trace causal history:

$$VC(a) = \\{ (s_1, t_1), (s_2, t_2), \\dots, (s_k, t_k) \\}$$

When concurrent updates yield unresolvable sibling versions, the conflict is pushed to the application layer (e.g., shopping cart union merge) or reconciled via Last-Write-Wins (LWW).

---

## Key Production Lessons
1. **Gossip Protocol:** Heartbeats between peer nodes dynamically disseminate cluster membership without requiring a central coordinator or ZooKeeper.
2. **Sloppy Quorums & Hinted Handoff:** If the first $N$ natural nodes on the ring are unreachable, other healthy nodes temporarily accept writes and hand them back when the primary recovers.
`
  },
  {
    id: 'APP-002',
    title: 'Design a Real-Time Autocomplete / Typeahead Engine',
    type: 'INTERVIEW_PROBLEM',
    domain: 'CS',
    difficulty: 'INTERMEDIATE',
    organization: 'System Design Interview (Google / Meta)',
    readTimeMinutes: 8,
    summary:
      'Architect a low-latency suggestion service delivering top-k ranked query completions under 30ms for 5 billion queries per day.',
    topicIds: [],
    topicNames: [
      'Trie Prefix Trees',
      'Binary Search & Binary Search Trees',
      'B-Trees & B+ Trees'
    ],
    content: `## Problem Formulation

Design a distributed search autocomplete service that returns the top 5 most relevant completions as a user types into a search bar.

### Scale & Constraints
* **Traffic:** 5 billion searches per day $\\approx 58,000$ queries/sec (QPS). Peak QPS $\\approx 120,000$.
* **Latency SLA:** $\\le 30\\text{ms}$ at p99 globally.
* **Typing Volume:** Each search involves an average of 4 keystrokes, magnifying internal read queries to $\\approx 240,000$ QPS.

\`\`\`mermaid
sequenceDiagram
  autonumber
  actor User
  participant CDN as Global Edge / CDN
  participant Agg as Aggregator Service
  participant Trie as In-Memory Trie Cluster
  participant DB as Persistent B+ Tree DB

  User->>CDN: Keystroke "alg..."
  CDN->>Agg: Route to nearest edge region
  Agg->>Trie: Lookup prefix "alg"
  Note over Trie: Returns precomputed top 5 suggestions in O(1)
  Trie-->>Agg: ["algorithm", "algebra", "algo trading"]
  Agg-->>User: JSON Response (< 25ms)
  Note over DB: Offline Spark job rebuilds Trie every 15 min
\`\`\`

---

## Data Structure Deep-Dive: Trie with In-Node Top-K

### The Naive Approach
A standard **Trie (Prefix Tree)** allows finding all matching suffixes in $O(P + S)$ where $P$ is the prefix length and $S$ is the number of all child descendant nodes. Traversing the entire subtree at query time and sorting frequencies causes latency spikes for popular prefixes like \`"a"\` or \`"th"\`.

### The Optimized Solution: In-Node Caching
Each Trie node stores a cached list of the **top 5 most frequent search terms** traversing through that prefix:

\`\`\`typescript
interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  topSuggestions: Array<{ query: string; frequency: number }>; // Max 5 items
}
\`\`\`

### Complexity Comparison
* **Lookup Time:** Reduced from $O(P + S \\log k)$ to strictly $O(P)$—completely independent of corpus size.
* **Storage Trade-off:** Memory usage increases by roughly $3\\times$, but total query strings easily fit into distributed RAM:
  $$\\text{500 million queries} \\times 50\\text{ bytes} \\approx 25\\text{ GB of memory}.$$

---

## Storage & Tiering: B+ Trees for Durability
While the Trie lives entirely in RAM across a partitioned cluster (sharded by hash of the prefix), the permanent query-frequency log is stored in a **B+ Tree database** (such as RocksDB or PostgreSQL). An offline pipeline computes rolling frequency decays (e.g. exponential moving average) and updates the in-memory Trie snapshots every 15 minutes.
`
  },
  {
    id: 'APP-003',
    title: 'Production RAG: Multi-Stage Document Retrieval Pipeline',
    type: 'PROJECT_BLUEPRINT',
    domain: 'AI & ML',
    difficulty: 'ADVANCED',
    organization: 'Enterprise AI Architecture',
    readTimeMinutes: 11,
    summary:
      'Build an industrial-grade Retrieval-Augmented Generation pipeline combining HNSW dense vector search, reciprocal rank fusion, and attention-based prompt compression.',
    topicIds: [],
    topicNames: [
      'Transformer Self-Attention',
      'Retrieval-Augmented Generation (RAG)',
      'HNSW Vector Indexing'
    ],
    content: `## System Architecture

Modern Retrieval-Augmented Generation (RAG) goes far beyond simple vector similarity search. In production, naive vector retrieval suffers from semantic drift, lost-in-the-middle context decay, and token budget exhaustion.

\`\`\`mermaid
graph LR
  Query[User Prompt] --> Embed[Embedding Model]
  Embed --> Dense[HNSW Vector Index]
  Query --> Sparse[BM25 Lexical Index]
  Dense --> RRF[Reciprocal Rank Fusion]
  Sparse --> RRF
  RRF --> Rerank[Cross-Encoder Reranker]
  Rerank --> Context[Attention Context Assembly]
  Context --> LLM[Target LLM Generation]
\`\`\`

---

## Core Components

### 1. Hierarchical Navigable Small World (HNSW)
Dense retrieval relies on finding vector nearest neighbors in high-dimensional embedding spaces (e.g. 1536 dimensions):
* **Multi-Layer Graph Structure:** Higher layers feature long-range skip links (fast coarse search), while bottom layers contain dense local links for fine refinement.
* **Search Complexity:** $O(\\log N)$ logarithmic query time compared to exhaustive $O(N)$ dot products.
* **Hyperparameters:** $M$ (max connections per node) and $efConstruction$ (size of the dynamic candidate list during graph indexing).

### 2. Reciprocal Rank Fusion (RRF)
Hybrid search fuses dense semantic vectors with sparse lexical BM25 tokens:

$$RRF(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)}$$

where $k \\approx 60$ is a smoothing constant and $r_m(d)$ is the document rank within retrieval method $m$.

### 3. Transformer Attention & Context Grounding
When retrieved passages are injected into the context window, Transformer self-attention weights decay non-linearly across long sequences ("lost in the middle" effect). 

To maximize attention fidelity:
1. **Cross-Encoder Re-ranking:** Re-score top 50 candidates down to top 5 using an exact cross-attention model.
2. **Context Compression:** Strip non-essential sentences while preserving entities.
3. **Citation Masking:** Explicitly constrain generated tokens to cross-reference span IDs.
`
  },
  {
    id: 'APP-004',
    title: 'Zero-RTT Latency in Cloudflare TLS 1.3 Handshake',
    type: 'CASE_STUDY',
    domain: 'CYBERSECURITY',
    difficulty: 'ADVANCED',
    organization: 'Cloudflare / IETF RFC 8446',
    readTimeMinutes: 7,
    summary:
      'How Cloudflare and major edge CDNs reduced cryptographic handshake latency by 50% using ephemeral Diffie-Hellman, AES-GCM, and 0-RTT early data resumption.',
    topicIds: [],
    topicNames: [
      'Diffie-Hellman Key Exchange',
      'AES-GCM Authenticated Encryption',
      'Public Key Infrastructure (PKI)',
      'TLS 1.3 Cryptographic Handshake'
    ],
    externalUrl: 'https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/',
    content: `## Executive Overview

Every HTTPS connection on the web incurs a latency penalty before user data can traverse the wire. For decades under **TLS 1.2**, setting up a secure, authenticated channel mandated two complete network round-trips (**2-RTT**):

$$\\text{ClientHello} \\longrightarrow \\text{ServerHello} \\longrightarrow \\text{Key Exchange} \\longrightarrow \\text{Finished}$$

On mobile connections with $100\\text{ms}$ RTT, establishing a secure connection consumed $200\\text{ms}$ to $400\\text{ms}$ of pure waiting time before the first HTTP byte was transmitted.

\`\`\`mermaid
sequenceDiagram
  autonumber
  actor Client as Web Browser
  participant Edge as Edge Gateway / CDN

  Note over Client,Edge: 1-RTT Standard Full Handshake
  Client->>Edge: ClientHello + Key Share (ECDHE) + CipherSuites
  Edge->>Client: ServerHello + Key Share + Encrypted Extensions + Certificate + Finished
  Note over Client: Derives Symmetric Master Key via HKDF
  Client->>Edge: Finished + First Encrypted HTTP Request
  Edge-->>Client: Encrypted HTTP Response
\`\`\`

---

## Architectural Breakthroughs in TLS 1.3

### 1. Ephemeral Diffie-Hellman by Default
Under TLS 1.2, static RSA key exchanges allowed an attacker who recorded historical encrypted traffic to retrospectively decrypt it if the server's private key was compromised years later. 

TLS 1.3 **deprecates static RSA and non-ephemeral DH entirely**:
* Mandates **Ephemeral Diffie-Hellman (ECDHE)** for every session.
* Guarantees **Perfect Forward Secrecy (PFS)**: Even if the private certificate key leaks, past recorded traffic remains mathematically impossible to decrypt.

### 2. Streamlined 1-RTT Handshake
In TLS 1.3, the client makes an educated guess about the server's supported elliptic curve (e.g. \`X25519\` or \`P-256\`) and proactively includes its **Key Share** directly in the initial \`ClientHello\`. This cuts the standard handshake down from 2-RTT to strictly **1-RTT**.

### 3. Authenticated Encryption with Associated Data (AEAD)
All legacy CBC block modes (vulnerable to padding oracle attacks like BEAST and POODLE) were removed. TLS 1.3 permits only modern AEAD cipher suites:
* **AES-128-GCM / AES-256-GCM** (hardware accelerated via Intel AES-NI / ARM Crypto).
* **CHACHA20-POLY1305** for low-power mobile chips lacking AES acceleration hardware.

### 4. 0-RTT Early Data Resumption
For returning visitors, TLS 1.3 introduces **0-RTT Resumption**:
* The client uses a Pre-Shared Key (PSK) negotiated in a previous session to encrypt initial HTTP \`GET\` requests inside the very first packet.
* Eliminates handshake latency completely ($0\\text{ms}$ overhead).
`
  }
];

