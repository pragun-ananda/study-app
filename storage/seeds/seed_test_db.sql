--
-- KNOWLEDGE GRAPH TEST DATABASE SEED
-- Deterministically generated from frontend domain model
-- Total Topics: 187 across 7 domain categories
-- Total Directed Prerequisite Edges: 229
-- Total Markdown Notes: 4
-- Total Study Todos: 5
--

BEGIN;

-- 1. TOPICS
INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z, last_reviewed) VALUES
  ('TOPIC-001', 'Neural Network Backpropagation', 'AI & ML', 'Reverse-mode automatic differentiation, chain rule, loss gradients, and Adam optimizer.', 48.00, 'DUE', 19.08, -0.14, 9.45, '2026-08-24T08:00:00Z'),
  ('TOPIC-002', 'Transformer Self-Attention', 'AI & ML', 'Scaled dot-product attention, multi-head projections, positional encoding matrices.', 82.00, 'MASTERED', 15.97, -1.86, 10.50, '2026-08-23T10:00:00Z'),
  ('TOPIC-003', 'Generative Adversarial Networks (GANs)', 'AI & ML', 'Minimax game between generator and discriminator neural networks.', 66.00, 'LEARNING', 18.38, 4.32, 11.46, '2026-08-21T10:00:00Z'),
  ('TOPIC-004', 'Variational Autoencoders (VAEs)', 'AI & ML', 'Latent space sampling with KL divergence regularization.', 24.00, 'NEW', 21.67, -4.79, 12.22, '2026-08-17T10:00:00Z'),
  ('TOPIC-005', 'Graph Neural Networks (GNNs)', 'AI & ML', 'Message passing neural networks operating on non-Euclidean graph domains.', 54.00, 'LEARNING', 10.30, 1.36, 12.79, NULL),
  ('TOPIC-006', 'Diffusion Models & Score Matching', 'AI & ML', 'Forward noise addition and reverse denoising U-Net architectures.', 33.00, 'DUE', 21.48, 1.77, 7.98, '2026-08-24T08:00:00Z'),
  ('TOPIC-007', 'Reinforcement Learning with RLHF', 'AI & ML', 'Policy gradients, reward model alignment, and Proximal Policy Optimization.', 63.00, 'LEARNING', 16.64, -5.07, 8.50, '2026-08-23T10:00:00Z'),
  ('TOPIC-008', 'Contrastive Learning (CLIP)', 'AI & ML', 'Joint multimodal embedding spaces aligning image and text representations.', 83.00, 'MASTERED', 14.83, 6.10, 8.98, '2026-08-21T10:00:00Z'),
  ('TOPIC-009', 'Mixture of Experts (MoE)', 'AI & ML', 'Sparse gating routing tokens to specialized feedforward expert subnetworks.', 50.00, 'LEARNING', 26.05, -2.94, 9.25, '2026-08-17T10:00:00Z'),
  ('TOPIC-010', 'Convolutional Neural Networks (CNNs)', 'AI & ML', 'Spatial translation invariance, kernel convolutions, pooling layers.', 31.00, 'DUE', 8.46, -3.94, 9.34, NULL),
  ('TOPIC-011', 'Recurrent Neural Networks & LSTM', 'AI & ML', 'Sequential memory cells with input, forget, and output gating mechanisms.', 84.00, 'MASTERED', 20.25, 4.48, 6.34, '2026-08-24T08:00:00Z'),
  ('TOPIC-012', 'Deep Q-Learning (DQN)', 'AI & ML', 'Off-policy value iteration with experience replay buffer and target networks.', 73.00, 'LEARNING', 19.88, -6.00, 6.50, '2026-08-23T10:00:00Z'),
  ('TOPIC-013', 'Gradient Boosted Decision Trees', 'AI & ML', 'Sequential ensemble learning minimizing residual loss gradients.', 36.00, 'DUE', 11.12, 3.99, 6.49, '2026-08-21T10:00:00Z'),
  ('TOPIC-014', 'Principal Component Analysis (PCA)', 'AI & ML', 'Orthogonal variance maximization via covariance matrix eigenvectors.', 26.00, 'NEW', 27.41, 2.07, 6.28, '2026-08-17T10:00:00Z'),
  ('TOPIC-015', 't-SNE & UMAP Dimensionality Reduction', 'AI & ML', 'Non-linear manifold visualization preserving local neighborhood topologies.', 52.00, 'LEARNING', 11.49, -9.26, 5.88, NULL),
  ('TOPIC-016', 'Support Vector Machines (SVM)', 'AI & ML', 'Maximum margin hyperplanes with kernel trick for non-linear classification.', 68.00, 'LEARNING', 17.32, 5.30, 4.81, '2026-08-24T08:00:00Z'),
  ('TOPIC-017', 'K-Means & GMM Clustering', 'AI & ML', 'Centroid expectation-maximization partition of feature space.', 61.00, 'LEARNING', 23.05, -4.25, 4.50, '2026-08-23T10:00:00Z'),
  ('TOPIC-018', 'LoRA Parameter-Efficient Fine-Tuning', 'AI & ML', 'Low-rank matrix decomposition of attention weight update deltas.', 10.00, 'NEW', 9.82, -0.34, 4.01, '2026-08-21T10:00:00Z'),
  ('TOPIC-019', 'Speculative Decoding in LLMs', 'AI & ML', 'Draft model generation validated in parallel by target LLM verification.', 50.00, 'LEARNING', 24.90, 6.86, 3.31, '2026-08-17T10:00:00Z'),
  ('TOPIC-020', 'Retrieval-Augmented Generation (RAG)', 'AI & ML', 'External knowledge retrieval via vector embeddings for context augmentation.', 81.00, 'MASTERED', 17.64, -11.18, 2.27, NULL),
  ('TOPIC-021', 'HNSW Vector Indexing', 'AI & ML', 'Hierarchical Navigable Small World graphs for fast approximate nearest neighbor search.', 14.00, 'NEW', 14.60, 3.95, 3.29, '2026-08-24T08:00:00Z'),
  ('TOPIC-022', 'Direct Preference Optimization (DPO)', 'AI & ML', 'Implicit reward optimization directly on preference pairs without separate reward model.', 60.00, 'LEARNING', 24.23, -0.84, 2.50, '2026-08-23T10:00:00Z'),
  ('TOPIC-023', 'Monte Carlo Tree Search (MCTS)', 'AI & ML', 'Heuristic tree search combining selection, expansion, simulation, and backpropagation.', 12.00, 'NEW', 11.73, -4.36, 1.52, '2026-08-21T10:00:00Z'),
  ('TOPIC-024', 'Knowledge Distillation', 'AI & ML', 'Teacher-student model compression matching soft logit probability distributions.', 32.00, 'DUE', 20.05, 8.30, 0.26, '2026-08-17T10:00:00Z'),
  ('TOPIC-025', 'Neural Radiance Fields (NeRF)', 'AI & ML', 'Implicit volumetric 3D scene representation parameterized by MLP rays.', 15.00, 'NEW', 22.96, -8.65, -1.02, NULL),
  ('TOPIC-026', '3D Gaussian Splatting', 'AI & ML', 'Real-time radiance field rendering via rasterized 3D anisotropic Gaussians.', 25.00, 'NEW', 13.60, 1.09, 1.75, '2026-08-24T08:00:00Z'),
  ('TOPIC-027', 'Quantization & GGUF Formats', 'AI & ML', 'INT8/INT4 weight quantization reducing VRAM bandwidth footprint.', 76.00, 'LEARNING', 22.77, 2.20, 0.50, '2026-08-23T10:00:00Z'),
  ('TOPIC-028', 'Softmax Temperature Scaling', 'AI & ML', 'Controlling logit probability sharpness during token generation sampling.', 55.00, 'LEARNING', 15.64, -5.64, -0.96, '2026-08-21T10:00:00Z'),
  ('TOPIC-029', 'Actor-Critic Architectures', 'AI & ML', 'Combining value function critic estimation with policy gradient actor updates.', 12.00, 'NEW', 15.78, 6.29, -2.64, '2026-08-17T10:00:00Z'),
  ('TOPIC-030', 'Swarm Intelligence & Particle Swarm', 'AI & ML', 'Stochastic collective optimization inspired by biological flocking dynamics.', 24.00, 'NEW', 24.21, -3.27, -4.48, NULL),
  ('TOPIC-031', 'Autoencoders & Latent Compression', 'AI & ML', 'Dimensionality bottleneck mapping input features to dense latent representations.', 81.00, 'MASTERED', 15.70, -0.96, 0.03, '2026-08-24T08:00:00Z'),
  ('TOPIC-032', 'Convolutional Autoencoders', 'AI & ML', 'Spatial feature extraction and reconstruction via transposed convolutions.', 51.00, 'LEARNING', 19.49, 2.31, -1.50, '2026-08-23T10:00:00Z'),
  ('TOPIC-033', 'Self-Supervised Masked Autoencoders', 'AI & ML', 'Masking random patches of visual/text inputs to learn representation priors.', 78.00, 'LEARNING', 18.34, -1.97, -3.45, '2026-08-21T10:00:00Z'),
  ('TOPIC-034', 'Binary Search & Binary Search Trees', 'CS', 'Logarithmic search space partitioning and ordered tree structures.', 48.00, 'DUE', 12.30, 13.94, 1.15, '2026-08-24T08:00:00Z'),
  ('TOPIC-035', 'B-Trees & B+ Trees', 'CS', 'Self-balancing multi-way search trees optimized for disk page storage.', 13.00, 'NEW', 9.20, 12.22, 2.20, '2026-08-23T10:00:00Z'),
  ('TOPIC-036', 'Red-Black Trees', 'CS', 'Self-balancing binary search tree guaranteeing O(log N) operations.', 14.00, 'NEW', 11.60, 18.40, 3.16, '2026-08-21T10:00:00Z'),
  ('TOPIC-037', 'Trie Prefix Trees', 'CS', 'Retrieval tree structure storing string prefixes for rapid lookup.', 57.00, 'LEARNING', 14.89, 9.28, 3.92, '2026-08-17T10:00:00Z'),
  ('TOPIC-038', 'Skip Lists', 'CS', 'Probabilistic layered linked list achieving logarithmic search complexity.', 60.00, 'LEARNING', 3.78, 15.28, 4.74, NULL),
  ('TOPIC-039', 'Disjoint Set Union (DSU)', 'CS', 'Union-find data structure with path compression and rank heuristics.', 30.00, 'DUE', 14.71, 15.83, -0.33, '2026-08-24T08:00:00Z'),
  ('TOPIC-040', 'Segment Trees & Lazy Propagation', 'CS', 'Tree data structure enabling O(log N) range queries and point updates.', 64.00, 'LEARNING', 9.86, 9.00, 0.20, '2026-08-23T10:00:00Z'),
  ('TOPIC-041', 'Fenwick Trees (Binary Indexed Tree)', 'CS', 'Space-efficient tree structure calculating prefix sums in O(log N).', 27.00, 'NEW', 8.06, 20.17, 0.67, '2026-08-21T10:00:00Z'),
  ('TOPIC-042', 'Dijkstra Shortest Path Algorithm', 'CS', 'Greedy single-source shortest path algorithm for non-negative weighted graphs.', 35.00, 'DUE', 19.17, 11.49, 1.04, '2026-08-17T10:00:00Z'),
  ('TOPIC-043', 'A* Heuristic Pathfinding Algorithm', 'CS', 'Best-first search combining actual path cost with heuristic distance estimates.', 72.00, 'LEARNING', 1.84, 10.22, 1.38, NULL),
  ('TOPIC-044', 'Tarjan Strongly Connected Components', 'CS', 'Depth-first search algorithm partitioning directed graphs into strongly connected subgraphs.', 82.00, 'MASTERED', 13.47, 18.55, -1.96, '2026-08-24T08:00:00Z'),
  ('TOPIC-045', 'Topological Sort (Kahn Algorithm)', 'CS', 'Linear ordering of vertices in a Directed Acyclic Graph (DAG).', 53.00, 'LEARNING', 13.05, 8.11, -1.78, '2026-08-23T10:00:00Z'),
  ('TOPIC-046', 'Convex Hull (Graham Scan)', 'CS', 'Finding the smallest convex polygon enclosing a set of 2D points.', 27.00, 'NEW', 4.34, 18.06, -1.81, '2026-08-21T10:00:00Z'),
  ('TOPIC-047', 'Knuth-Morris-Pratt (KMP) Matching', 'CS', 'String pattern matching in O(N+M) using prefix failure functions.', 34.00, 'DUE', 20.63, 16.14, -2.02, '2026-08-17T10:00:00Z'),
  ('TOPIC-048', 'Aho-Corasick Automaton', 'CS', 'Trie-based finite state machine for matching dictionary patterns simultaneously.', 34.00, 'DUE', 4.71, 4.82, -2.42, NULL),
  ('TOPIC-049', 'Kruskal & Prim Minimum Spanning Trees', 'CS', 'Greedy algorithms finding minimum cost spanning trees on weighted graphs.', 16.00, 'NEW', 10.55, 19.37, -3.49, '2026-08-24T08:00:00Z'),
  ('TOPIC-050', 'Fast Fourier Transform (FFT)', 'CS', 'O(N log N) algorithm converting time-domain signals into frequency spectra.', 66.00, 'LEARNING', 16.27, 9.82, -3.80, '2026-08-23T10:00:00Z'),
  ('TOPIC-051', 'Bloom Filters', 'CS', 'Space-efficient probabilistic data structure testing set membership.', 67.00, 'LEARNING', 3.13, 13.68, -4.28, '2026-08-21T10:00:00Z'),
  ('TOPIC-052', 'HyperLogLog Cardinality Estimation', 'CS', 'Probabilistic algorithm estimating unique elements using register bit patterns.', 68.00, 'LEARNING', 18.12, 20.93, -4.99, '2026-08-17T10:00:00Z'),
  ('TOPIC-053', 'Cuckoo Hashing', 'CS', 'Hash table resolving collisions using multiple hash functions and displacement chains.', 88.00, 'MASTERED', 10.71, 2.87, -5.87, NULL),
  ('TOPIC-054', 'AVL Trees', 'CS', 'Strictly balanced binary search tree maintaining height balance factor within 1.', 17.00, 'NEW', 7.82, 18.03, -5.00, '2026-08-24T08:00:00Z'),
  ('TOPIC-055', 'Splay Trees', 'CS', 'Self-adjusting binary search tree bringing recently accessed elements to root.', 90.00, 'MASTERED', 17.46, 13.23, -5.80, '2026-08-23T10:00:00Z'),
  ('TOPIC-056', 'Maximum Flow (Dinic Algorithm)', 'CS', 'Finding maximum network flow using level graphs and blocking flows.', 46.00, 'DUE', 4.95, 9.71, -6.78, '2026-08-21T10:00:00Z'),
  ('TOPIC-057', 'Hopcroft-Karp Bipartite Matching', 'CS', 'O(E sqrt(V)) algorithm finding maximum cardinality matchings in bipartite graphs.', 90.00, 'MASTERED', 13.17, 22.73, -7.96, '2026-08-17T10:00:00Z'),
  ('TOPIC-058', 'Bitmask Dynamic Programming', 'CS', 'Encoding subset states into integer bitmasks for NP-hard state space traversal.', 21.00, 'NEW', 16.18, 5.42, -9.33, NULL),
  ('TOPIC-059', 'Suffix Automaton & Suffix Trees', 'CS', 'Compact representation of all suffixes of a string for instant substring queries.', 19.00, 'NEW', 6.82, 15.18, -6.57, '2026-08-24T08:00:00Z'),
  ('TOPIC-060', 'Radix & Bucket Sort', 'CS', 'Non-comparative integer sorting algorithms operating in linear time.', 11.00, 'NEW', 15.99, 16.27, -7.80, '2026-08-23T10:00:00Z'),
  ('TOPIC-061', 'Bellman-Ford Algorithm', 'CS', 'Graph search algorithm detecting negative weight cycles.', 40.00, 'DUE', 8.86, 8.43, -9.27, '2026-08-21T10:00:00Z'),
  ('TOPIC-062', 'Floyd-Warshall All-Pairs Shortest Path', 'CS', 'Dynamic programming matrix algorithm computing shortest paths between all node pairs.', 50.00, 'LEARNING', 8.95, 20.40, -10.93, '2026-08-17T10:00:00Z'),
  ('TOPIC-063', 'Kd-Trees & Spatial Partitioning', 'CS', 'Multidimensional binary search tree partitioning space for range searches.', 62.00, 'LEARNING', 17.44, 10.81, -12.78, NULL),
  ('TOPIC-064', 'Quadtrees & Octrees', 'CS', 'Tree structures recursively subdividing 2D/3D space into quadrants/octants.', 86.00, 'MASTERED', 8.92, 13.11, -8.27, '2026-08-24T08:00:00Z'),
  ('TOPIC-065', 'LCP Arrays & Suffix Arrays', 'CS', 'Sorted array of all suffixes enabling fast string pattern analysis.', 16.00, 'NEW', 12.71, 16.39, -9.80, '2026-08-23T10:00:00Z'),
  ('TOPIC-066', 'Z-Algorithm String Searching', 'CS', 'Linear time algorithm computing longest common prefix lengths.', 71.00, 'LEARNING', 11.56, 12.10, -11.75, '2026-08-21T10:00:00Z'),
  ('TOPIC-067', 'Distributed Consensus (Raft)', 'SYSTEMS', 'Leader election, log replication, heartbeat timers, and state machine safety.', 33.00, 'DUE', -2.84, 17.46, 10.25, '2026-08-24T08:00:00Z'),
  ('TOPIC-068', 'Paxos Protocol', 'SYSTEMS', 'Consensus algorithm for agreeing on a single value in asynchronous networks.', 70.00, 'LEARNING', -6.09, 15.64, 11.30, '2026-08-23T10:00:00Z'),
  ('TOPIC-069', 'Byzantine Fault Tolerance (PBFT)', 'SYSTEMS', 'Consensus surviving up to 1/3 arbitrary malicious or failing node components.', 25.00, 'NEW', -3.61, 22.00, 12.21, '2026-08-21T10:00:00Z'),
  ('TOPIC-070', 'Two-Phase Commit (2PC)', 'SYSTEMS', 'Atomic commitment protocol guaranteeing distributed transaction consistency.', 54.00, 'LEARNING', -0.23, 12.63, 12.92, '2026-08-17T10:00:00Z'),
  ('TOPIC-071', 'CAP Theorem & PACELC', 'SYSTEMS', 'Fundamental trade-offs between Consistency, Availability, and Partition Tolerance.', 79.00, 'LEARNING', -11.91, 18.95, 13.43, NULL),
  ('TOPIC-072', 'Vector Clocks & Lamport Timestamps', 'SYSTEMS', 'Logical clocks establishing causal ordering of events in distributed systems.', 20.00, 'NEW', -0.53, 19.40, 8.69, '2026-08-24T08:00:00Z'),
  ('TOPIC-073', 'Consistent Hashing & DHT', 'SYSTEMS', 'Minimizing key remapping during hash ring node addition or removal.', 94.00, 'MASTERED', -5.40, 12.36, 9.17, '2026-08-23T10:00:00Z'),
  ('TOPIC-074', 'LSM Trees (Log-Structured Merge-Tree)', 'SYSTEMS', 'Write-optimized storage engine combining MemTable, WAL, and SSTables.', 57.00, 'LEARNING', -7.24, 23.78, 9.57, '2026-08-21T10:00:00Z'),
  ('TOPIC-075', 'Write-Ahead Logging (WAL)', 'SYSTEMS', 'Ensuring transaction durability by appending changes to log before disk modification.', 87.00, 'MASTERED', 4.21, 14.55, 9.76, '2026-08-17T10:00:00Z'),
  ('TOPIC-076', 'Copy-on-Write (CoW)', 'SYSTEMS', 'Resource management strategy deferring page duplication until data modification.', 46.00, 'DUE', -13.72, 13.54, 9.75, NULL),
  ('TOPIC-077', 'Memory Paging & TLB Caches', 'SYSTEMS', 'Virtual memory translation using page tables and Translation Lookaside Buffers.', 59.00, 'LEARNING', -1.79, 22.05, 6.96, '2026-08-24T08:00:00Z'),
  ('TOPIC-078', 'Cache Coherence (MESI Protocol)', 'SYSTEMS', 'Maintaining memory consistency across multiprocessor caches via hardware states.', 38.00, 'DUE', -2.10, 11.46, 7.04, '2026-08-23T10:00:00Z'),
  ('TOPIC-079', 'Lock-Free Data Structures & CAS', 'SYSTEMS', 'Concurrent synchronization using atomic Compare-And-Swap primitives.', 60.00, 'LEARNING', -10.97, 21.58, 6.92, '2026-08-21T10:00:00Z'),
  ('TOPIC-080', 'eBPF Kernel Tracing', 'SYSTEMS', 'Running sandboxed bytecode programs in the Linux kernel without module compilation.', 37.00, 'DUE', 5.49, 19.64, 6.60, '2026-08-17T10:00:00Z'),
  ('TOPIC-081', 'io_uring Linux Async I/O', 'SYSTEMS', 'High-performance asynchronous I/O interface using shared kernel/user ring buffers.', 72.00, 'LEARNING', -10.55, 8.24, 6.07, NULL),
  ('TOPIC-082', 'Zero-Copy Socket Transfers', 'SYSTEMS', 'Direct DMA memory transfer between disk and network interfaces bypassing CPU.', 35.00, 'DUE', -4.69, 22.78, 5.34, '2026-08-24T08:00:00Z'),
  ('TOPIC-083', 'TCP Congestion Control (BBR)', 'SYSTEMS', 'Model-based congestion control measuring bottleneck bandwidth and round-trip time.', 48.00, 'DUE', 1.00, 13.27, 4.92, '2026-08-23T10:00:00Z'),
  ('TOPIC-084', 'QUIC Protocol & HTTP/3', 'SYSTEMS', 'UDP-based transport protocol providing multiplexed streams without head-of-line blocking.', 81.00, 'MASTERED', -12.13, 17.21, 4.28, '2026-08-21T10:00:00Z'),
  ('TOPIC-085', 'gRPC & Protocol Buffers', 'SYSTEMS', 'High-performance RPC framework using binary Protocol Buffer serialization.', 69.00, 'LEARNING', 2.81, 24.33, 3.44, '2026-08-17T10:00:00Z'),
  ('TOPIC-086', 'Kafka Log Partitioning & Consumer Groups', 'SYSTEMS', 'Distributed immutable append-only commit log partitioning pub-sub messages.', 94.00, 'MASTERED', -4.51, 6.55, 2.40, NULL),
  ('TOPIC-087', 'Saga Pattern for Microservices', 'SYSTEMS', 'Distributed transaction management via sequence of local transactions and compensations.', 85.00, 'MASTERED', -7.30, 21.32, 3.71, '2026-08-24T08:00:00Z'),
  ('TOPIC-088', 'Event Sourcing & CQRS', 'SYSTEMS', 'Persisting domain state as sequence of immutable events separating read/write models.', 46.00, 'DUE', 1.80, 16.93, 2.52, '2026-08-23T10:00:00Z'),
  ('TOPIC-089', 'Token Bucket Rate Limiting', 'SYSTEMS', 'Traffic shaping algorithm controlling request burst rates via token replenishment.', 56.00, 'LEARNING', -10.01, 13.37, 1.63, '2026-08-21T10:00:00Z'),
  ('TOPIC-090', 'Envoy Reverse Proxy Architecture', 'SYSTEMS', 'High-performance L7 proxy managing service mesh traffic routing and observability.', 35.00, 'DUE', -2.16, 25.74, 0.28, '2026-08-17T10:00:00Z'),
  ('TOPIC-091', 'Linux cgroups & Namespaces', 'SYSTEMS', 'Kernel features enabling resource limit isolation for container runtimes.', 18.00, 'NEW', 0.45, 9.41, -1.62, NULL),
  ('TOPIC-092', 'Virtual Memory Swapping & OOM Killer', 'SYSTEMS', 'Kernel memory management paging out inactive pages to swap files under pressure.', 69.00, 'LEARNING', -7.83, 18.45, 1.98, '2026-08-24T08:00:00Z'),
  ('TOPIC-093', 'Non-Volatile Memory (NVM) Storage', 'SYSTEMS', 'Byte-addressable persistent memory bridging DRAM speeds with storage persistence.', 36.00, 'DUE', 0.22, 19.50, 0.65, '2026-08-23T10:00:00Z'),
  ('TOPIC-094', 'Network Function Virtualization (NFV)', 'SYSTEMS', 'Replacing hardware appliances with virtualized software network functions.', 76.00, 'LEARNING', -6.01, 12.76, -1.01, '2026-08-21T10:00:00Z'),
  ('TOPIC-095', 'Gossip Protocols for Cluster Membership', 'SYSTEMS', 'Decentralized peer-to-peer epidemic protocol disseminating cluster state.', 86.00, 'MASTERED', -5.81, 22.57, -2.88, '2026-08-17T10:00:00Z'),
  ('TOPIC-096', 'Chubby Lock Service', 'SYSTEMS', 'Coarse-grained distributed lock service based on Paxos for cluster metadata.', 17.00, 'NEW', 0.24, 15.32, -4.98, NULL),
  ('TOPIC-097', 'Dynamo Database Architecture', 'SYSTEMS', 'Highly available key-value store using consistent hashing, vector clocks, and sloppy quorums.', 50.00, 'LEARNING', -5.09, 17.17, 0.42, '2026-08-24T08:00:00Z'),
  ('TOPIC-098', 'Singular Value Decomposition (SVD)', 'MATH', 'Matrix factorization into singular vectors and singular value diagonal scaling.', 21.00, 'NEW', -15.05, 7.72, -0.15, '2026-08-24T08:00:00Z'),
  ('TOPIC-099', 'Eigenvalues & Eigenvectors', 'MATH', 'Special scalar multipliers and invariant direction vectors of linear transformations.', 92.00, 'MASTERED', -18.31, 5.90, 0.91, '2026-08-23T10:00:00Z'),
  ('TOPIC-100', 'Fourier Transform Analysis', 'MATH', 'Decomposing continuous/discrete functions into infinite frequency components.', 25.00, 'NEW', -15.83, 12.26, 1.82, '2026-08-21T10:00:00Z'),
  ('TOPIC-101', 'Laplace Transform', 'MATH', 'Integral transform converting differential equations into algebraic domain representations.', 70.00, 'LEARNING', -12.44, 2.89, 2.53, '2026-08-17T10:00:00Z'),
  ('TOPIC-102', 'Riemannian Geometry & Manifolds', 'MATH', 'Differential geometry studying smooth spaces with Riemannian metric tensors.', 69.00, 'LEARNING', -24.13, 9.21, 3.04, NULL),
  ('TOPIC-103', 'Tensor Calculus & Differential Forms', 'MATH', 'Generalizing vectors and matrices to multidimensional geometric object tensors.', 28.00, 'NEW', -12.74, 9.66, -1.70, '2026-08-24T08:00:00Z'),
  ('TOPIC-104', 'Bayesian Inference & Priors', 'MATH', 'Updating probability hypotheses as new empirical evidence or data becomes available.', 45.00, 'DUE', -17.61, 2.62, -1.22, '2026-08-23T10:00:00Z'),
  ('TOPIC-105', 'Markov Chains & Transition Matrices', 'MATH', 'Stochastic memoryless process where future states depend only on current state.', 23.00, 'NEW', -19.45, 14.04, -0.82, '2026-08-21T10:00:00Z'),
  ('TOPIC-106', 'Hidden Markov Models (HMM)', 'MATH', 'Statistical Markov model with unobserved hidden states emitting observable outputs.', 65.00, 'LEARNING', -8.00, 4.81, -0.63, '2026-08-17T10:00:00Z'),
  ('TOPIC-107', 'Jacobian & Hessian Matrices', 'MATH', 'First-order partial derivative vectors and second-order curvature matrices.', 38.00, 'DUE', -25.93, 3.80, -0.64, NULL),
  ('TOPIC-108', 'Convex Optimization & Duality', 'MATH', 'Minimizing convex objective functions subject to linear and convex inequality constraints.', 27.00, 'NEW', -14.00, 12.31, -3.43, '2026-08-24T08:00:00Z'),
  ('TOPIC-109', 'Lagrange Multipliers & KKT Conditions', 'MATH', 'Finding local maxima/minima of functions subject to equality and inequality constraints.', 63.00, 'LEARNING', -14.26, 2.23, -3.59, '2026-08-23T10:00:00Z'),
  ('TOPIC-110', 'Group Theory & Symmetry', 'MATH', 'Abstract algebra studying algebraic structures with closure, associativity, identity, and inverses.', 85.00, 'MASTERED', -23.18, 11.84, -3.47, '2026-08-21T10:00:00Z'),
  ('TOPIC-111', 'Ring & Field Theory', 'MATH', 'Algebraic structures supporting addition, multiplication, and multiplicative inverses.', 37.00, 'DUE', -6.73, 9.90, -3.79, '2026-08-17T10:00:00Z'),
  ('TOPIC-112', 'Category Theory & Functors', 'MATH', 'Abstract mathematical framework studying objects, arrows, morphisms, and structural mappings.', 77.00, 'LEARNING', -22.76, -1.50, -4.32, NULL),
  ('TOPIC-113', 'Complex Analysis & Residues', 'MATH', 'Study of functions of complex variables, holomorphic functions, and contour integrals.', 43.00, 'DUE', -16.90, 13.04, -5.05, '2026-08-24T08:00:00Z'),
  ('TOPIC-114', 'Topology & Homotopy', 'MATH', 'Study of geometric properties preserved under continuous deformations and stretchings.', 21.00, 'NEW', -11.18, 3.57, -5.48, '2026-08-23T10:00:00Z'),
  ('TOPIC-115', 'Information Entropy & KL Divergence', 'MATH', 'Quantifying uncertainty, information content, and relative difference between distributions.', 83.00, 'MASTERED', -24.34, 7.47, -6.11, '2026-08-21T10:00:00Z'),
  ('TOPIC-116', 'Wasserstein Distance (Earth Mover)', 'MATH', 'Optimal transport distance metric measuring cost of transforming one probability distribution into another.', 41.00, 'DUE', -9.40, 14.59, -6.95, '2026-08-17T10:00:00Z'),
  ('TOPIC-117', 'Monte Carlo Integration', 'MATH', 'Numerical integration evaluating high-dimensional integrals via random sampling.', 10.00, 'NEW', -16.72, -3.12, -8.07, NULL),
  ('TOPIC-118', 'Stochastic Calculus & Ito Lemma', 'MATH', 'Calculus operating on stochastic processes like Brownian motion and Wiener processes.', 72.00, 'LEARNING', -19.51, 11.58, -6.68, '2026-08-24T08:00:00Z'),
  ('TOPIC-119', 'Quaternions & 3D Spatial Rotations', 'MATH', 'Four-dimensional number system avoiding gimbal lock during 3D spatial rotations.', 63.00, 'LEARNING', -10.19, 7.00, -7.61, '2026-08-23T10:00:00Z'),
  ('TOPIC-120', 'Graph Theory & Spectral Clustering', 'MATH', 'Partitioning graph vertices using eigenvalues of normalized graph Laplacian matrices.', 84.00, 'MASTERED', -22.22, 3.63, -8.76, '2026-08-21T10:00:00Z'),
  ('TOPIC-121', 'Differential Equations (PDE/ODE)', 'MATH', 'Equations relating functions to their derivatives governing physical systems.', 87.00, 'MASTERED', -14.38, 16.00, -10.11, '2026-08-17T10:00:00Z'),
  ('TOPIC-122', 'Vector Calculus & Divergence Theorem', 'MATH', 'Gradient, curl, and divergence fields relating volume integrals to surface fluxes.', 27.00, 'NEW', -11.60, -0.24, -11.67, NULL),
  ('TOPIC-123', 'Ergodic Theory & Dynamical Systems', 'MATH', 'Statistical behavior of deterministic dynamical systems over long time horizons.', 61.00, 'LEARNING', -20.05, 8.71, -8.41, '2026-08-24T08:00:00Z'),
  ('TOPIC-124', 'Combinatorics & Generating Functions', 'MATH', 'Formal power series encoding sequence terms as coefficients for counting problems.', 51.00, 'LEARNING', -12.00, 9.76, -9.74, '2026-08-23T10:00:00Z'),
  ('TOPIC-125', 'Number Theory & Modular Arithmetic', 'MATH', 'Study of integers, prime factorizations, modular congruences, and Diophantine equations.', 25.00, 'NEW', -18.22, 3.02, -11.40, '2026-08-21T10:00:00Z'),
  ('TOPIC-126', 'Galois Theory', 'MATH', 'Connecting field theory and group theory to solve polynomial equation roots.', 14.00, 'NEW', -18.02, 12.83, -13.27, '2026-08-17T10:00:00Z'),
  ('TOPIC-127', 'Differential Geometry of Curves', 'MATH', 'Frenet-Serret formulas describing curvature and torsion of space curves.', 69.00, 'LEARNING', -11.89, 5.53, -15.35, NULL),
  ('TOPIC-128', 'Fixed Point Theorems (Banach/Brouwer)', 'MATH', 'Conditions guaranteeing existence of invariant points under continuous mappings.', 70.00, 'LEARNING', -17.31, 7.43, -9.97, '2026-08-24T08:00:00Z'),
  ('TOPIC-129', 'Quantum Superposition & Qubits', 'PHYSICS', 'Physical state existing as linear combination of basis state vectors.', 33.00, 'DUE', -14.97, -7.85, 8.60, '2026-08-24T08:00:00Z'),
  ('TOPIC-130', 'Quantum Entanglement & EPR Paradox', 'PHYSICS', 'Non-local quantum correlation between entangled particle pairs.', 38.00, 'DUE', -18.37, -9.78, 9.65, '2026-08-23T10:00:00Z'),
  ('TOPIC-131', 'Quantum Teleportation Protocol', 'PHYSICS', 'Transferring quantum state information using entanglement and classical bits.', 12.00, 'NEW', -15.82, -3.22, 10.51, '2026-08-21T10:00:00Z'),
  ('TOPIC-132', 'Shor Quantum Factoring Algorithm', 'PHYSICS', 'Polynomial time quantum algorithm factoring integers using quantum Fourier transforms.', 28.00, 'NEW', -12.33, -12.88, 11.16, '2026-08-17T10:00:00Z'),
  ('TOPIC-133', 'Grover Quantum Search Algorithm', 'PHYSICS', 'O(sqrt N) quantum amplitude amplification searching unsorted databases.', 94.00, 'MASTERED', -24.35, -6.37, 11.59, NULL),
  ('TOPIC-134', 'Quantum Decoherence & Noise', 'PHYSICS', 'Loss of quantum coherence caused by environmental interaction and phase randomization.', 58.00, 'LEARNING', -12.75, -5.87, 6.95, '2026-08-24T08:00:00Z'),
  ('TOPIC-135', 'Topological Qubits & Anyons', 'PHYSICS', 'Fault-tolerant quantum computing storing info in non-Abelian anyon braiding.', 94.00, 'MASTERED', -17.65, -13.13, 7.37, '2026-08-23T10:00:00Z'),
  ('TOPIC-136', 'Special & General Relativity', 'PHYSICS', 'Spacetime metric curvature governed by Einstein stress-energy tensor equations.', 23.00, 'NEW', -19.53, -1.44, 7.69, '2026-08-21T10:00:00Z'),
  ('TOPIC-137', 'Schwarzschild Black Hole Metric', 'PHYSICS', 'Exact solution to Einstein field equations describing static non-rotating black holes.', 24.00, 'NEW', -7.84, -10.87, 7.78, '2026-08-17T10:00:00Z'),
  ('TOPIC-138', 'Maxwell Equations & Electromagnetism', 'PHYSICS', 'Unified electromagnetic field theory governing electric and magnetic vectors.', 57.00, 'LEARNING', -26.11, -11.89, 7.66, NULL),
  ('TOPIC-139', 'Thermodynamic Entropy & Second Law', 'PHYSICS', 'Irreversible increase in statistical disorder within isolated physical systems.', 34.00, 'DUE', -14.03, -3.31, 5.12, '2026-08-24T08:00:00Z'),
  ('TOPIC-140', 'Quantum Electrodynamics (QED)', 'PHYSICS', 'Relativistic quantum field theory describing photon-electron interactions.', 43.00, 'DUE', -14.28, -13.97, 5.09, '2026-08-23T10:00:00Z'),
  ('TOPIC-141', 'Feynman Diagram Particle Physics', 'PHYSICS', 'Pictorial representation of subatomic particle interaction perturbation series.', 46.00, 'DUE', -23.24, -3.74, 4.86, '2026-08-21T10:00:00Z'),
  ('TOPIC-142', 'Higgs Mechanism & Symmetry Breaking', 'PHYSICS', 'Spontaneous gauge symmetry breaking granting mass to fundamental bosons.', 45.00, 'DUE', -6.67, -5.71, 4.40, '2026-08-17T10:00:00Z'),
  ('TOPIC-143', 'Dark Matter & WIMP Detection', 'PHYSICS', 'Non-baryonic mass inferable from galactic rotation curves and gravitational lensing.', 68.00, 'LEARNING', -22.77, -17.14, 3.73, NULL),
  ('TOPIC-144', 'String Theory & Calabi-Yau Manifolds', 'PHYSICS', 'Replacing point particles with 1D vibrating strings in 10/11 dimensional spacetime.', 43.00, 'DUE', -16.89, -2.66, 3.39, '2026-08-24T08:00:00Z'),
  ('TOPIC-145', 'Loop Quantum Gravity', 'PHYSICS', 'Non-perturbative background-independent quantum theory of discrete spacetime spin networks.', 38.00, 'DUE', -11.22, -12.02, 2.82, '2026-08-23T10:00:00Z'),
  ('TOPIC-146', 'AdS/CFT Gauge-Gravity Duality', 'PHYSICS', 'Holographic equivalence between anti-de Sitter gravity and boundary conformal field theories.', 86.00, 'MASTERED', -24.23, -8.14, 2.03, '2026-08-21T10:00:00Z'),
  ('TOPIC-147', 'Quantum Optics & Cavity QED', 'PHYSICS', 'Interaction between quantized light fields and single atoms inside optical cavities.', 37.00, 'DUE', -9.54, -1.17, 1.03, '2026-08-17T10:00:00Z'),
  ('TOPIC-148', 'Condensed Matter Superconductivity', 'PHYSICS', 'Zero electrical resistance below critical temperature due to Cooper electron pairing.', 52.00, 'LEARNING', -16.71, -18.50, -0.20, NULL),
  ('TOPIC-149', 'Bose-Einstein Condensate (BEC)', 'PHYSICS', 'State of matter where macroscopic quantum phenomena emerge near absolute zero.', 61.00, 'LEARNING', -19.35, -4.23, 1.65, '2026-08-24T08:00:00Z'),
  ('TOPIC-150', 'Quantum Hall Effect & Chern Numbers', 'PHYSICS', 'Quantized Hall conductance in 2D electron gases topologically protected by invariants.', 56.00, 'LEARNING', -10.49, -8.58, 0.54, '2026-08-23T10:00:00Z'),
  ('TOPIC-151', 'Particle Accelerators & Synchrotrons', 'PHYSICS', 'Accelerating charged particles to relativistic speeds using RF cavities and dipole magnets.', 60.00, 'LEARNING', -21.83, -11.72, -0.80, '2026-08-21T10:00:00Z'),
  ('TOPIC-152', 'Neutrino Oscillations & PMNS Matrix', 'PHYSICS', 'Flavor transformation of neutrinos demonstrating non-zero mass differences.', 30.00, 'DUE', -14.58, -0.81, -2.11, '2026-08-17T10:00:00Z'),
  ('TOPIC-153', 'Cosmic Microwave Background (CMB)', 'PHYSICS', 'Thermal relic radiation from recombination epoch preserving early universe fluctuations.', 37.00, 'DUE', -12.17, -15.01, -4.04, NULL),
  ('TOPIC-154', 'Gravitational Waves & LIGO Interferometry', 'PHYSICS', 'Spacetime metric ripples detected via laser arm phase interference.', 35.00, 'DUE', -19.33, -7.06, -0.22, '2026-08-24T08:00:00Z'),
  ('TOPIC-155', 'Standard Model of Particle Physics', 'PHYSICS', 'Gauge theory classifying quarks, leptons, gauge bosons, and Higgs scalar.', 37.00, 'DUE', -12.85, -6.26, -1.73, '2026-08-23T10:00:00Z'),
  ('TOPIC-156', 'Quantum Field Theory (QFT) Canonical Quantization', 'PHYSICS', 'Promoting classical fields to operator-valued distributions over Hilbert space.', 66.00, 'LEARNING', -17.62, -11.16, -3.62, '2026-08-21T10:00:00Z'),
  ('TOPIC-157', 'Spintronics & Magnetic Tunnel Junctions', 'PHYSICS', 'Exploiting electron spin orientation alongside charge for ultra-low power memory.', 28.00, 'NEW', -17.09, -5.48, -5.66, '2026-08-17T10:00:00Z'),
  ('TOPIC-158', 'RSA Asymmetric Encryption', 'CYBERSECURITY', 'Public key cryptography based on difficulty of prime factorization.', 69.00, 'LEARNING', -2.36, -17.55, 1.30, '2026-08-24T08:00:00Z'),
  ('TOPIC-159', 'Elliptic Curve Cryptography (ECC)', 'CYBERSECURITY', 'Public key encryption based on algebraic structure of elliptic curves over finite fields.', 36.00, 'DUE', -6.70, -20.01, 2.08, '2026-08-23T10:00:00Z'),
  ('TOPIC-160', 'Zero-Knowledge Proofs (ZK-SNARKs)', 'CYBERSECURITY', 'Proving possession of secret knowledge without disclosing the secret content.', 20.00, 'NEW', -3.51, -11.90, 2.50, '2026-08-21T10:00:00Z'),
  ('TOPIC-161', 'Diffie-Hellman Key Exchange', 'CYBERSECURITY', 'Method allowing two parties to establish shared secret keys over insecure channels.', 36.00, 'DUE', 0.71, -23.70, 2.57, '2026-08-17T10:00:00Z'),
  ('TOPIC-162', 'AES-GCM Authenticated Encryption', 'CYBERSECURITY', 'Symmetric block cipher mode providing data confidentiality and authenticity.', 13.00, 'NEW', -13.73, -15.83, 2.28, NULL),
  ('TOPIC-163', 'SHA-256 & Cryptographic Hashes', 'CYBERSECURITY', 'One-way cryptographic function mapping arbitrary data to fixed 256-bit hashes.', 59.00, 'LEARNING', -0.12, -15.08, -1.48, '2026-08-24T08:00:00Z'),
  ('TOPIC-164', 'Homomorphic Encryption (FHE)', 'CYBERSECURITY', 'Encryption enabling arbitrary computations directly on ciphertext without decryption.', 27.00, 'NEW', -5.65, -23.67, -1.59, '2026-08-23T10:00:00Z'),
  ('TOPIC-165', 'Post-Quantum Lattice Cryptography', 'CYBERSECURITY', 'Quantum-resistant encryption based on hardness of shortest vector lattice problems.', 50.00, 'LEARNING', -7.73, -10.37, -2.06, '2026-08-21T10:00:00Z'),
  ('TOPIC-166', 'Return-Oriented Programming (ROP)', 'CYBERSECURITY', 'Exploitation technique executing code using existing instruction gadgets.', 42.00, 'DUE', 5.19, -20.91, -2.88, '2026-08-17T10:00:00Z'),
  ('TOPIC-167', 'Side-Channel Attacks (Spectre/Meltdown)', 'CYBERSECURITY', 'Exfiltrating secrets via speculative execution CPU cache timing leakage.', 70.00, 'LEARNING', -14.53, -21.89, -4.06, NULL),
  ('TOPIC-168', 'Public Key Infrastructure (PKI)', 'CYBERSECURITY', 'Framework managing digital certificates and public key authentication.', 87.00, 'MASTERED', -1.92, -13.08, -4.26, '2026-08-24T08:00:00Z'),
  ('TOPIC-169', 'TLS 1.3 Cryptographic Handshake', 'CYBERSECURITY', 'Transport Layer Security protocol reducing handshake latency to 1-RTT.', 78.00, 'LEARNING', -2.11, -23.60, -5.26, '2026-08-23T10:00:00Z'),
  ('TOPIC-170', 'WebAssembly (Wasm) Sandboxing', 'CYBERSECURITY', 'Memory-safe sandboxed execution environment inside modern browsers.', 47.00, 'DUE', -10.48, -13.72, -6.70, '2026-08-21T10:00:00Z'),
  ('TOPIC-171', 'Content Security Policy (CSP)', 'CYBERSECURITY', 'HTTP response header restricting resource loading to mitigate XSS attacks.', 23.00, 'NEW', 4.28, -15.73, -8.32, '2026-08-17T10:00:00Z'),
  ('TOPIC-172', 'Cross-Site Request Forgery (CSRF)', 'CYBERSECURITY', 'Exploit forcing authenticated user browsers to submit unauthorized actions.', 83.00, 'MASTERED', -9.20, -24.93, -10.39, NULL),
  ('TOPIC-173', 'Kerberos Authentication Protocol', 'CYBERSECURITY', 'Ticket-based authentication service providing mutual identity verification.', 54.00, 'LEARNING', -4.45, -14.12, -7.03, '2026-08-24T08:00:00Z'),
  ('TOPIC-174', 'Buffer Overflow & Stack Canaries', 'CYBERSECURITY', 'Memory corruption flaw overwriting adjacent stack memory and return pointers.', 81.00, 'MASTERED', -1.22, -19.90, -8.92, '2026-08-23T10:00:00Z'),
  ('TOPIC-175', 'Fuzzing & Coverage-Guided Testing', 'CYBERSECURITY', 'Automated vulnerability discovery feeding mutated inputs to binary targets.', 86.00, 'MASTERED', -6.70, -17.66, -11.17, '2026-08-21T10:00:00Z'),
  ('TOPIC-176', 'Microservices & Service Mesh', 'ARCH', 'Decoupled application architecture managed via sidecar proxies and control planes.', 22.00, 'NEW', 13.22, -14.07, 8.71, '2026-08-24T08:00:00Z'),
  ('TOPIC-177', 'Domain-Driven Design (DDD)', 'ARCH', 'Software design modeling complex business domains around ubiquitous languages.', 62.00, 'LEARNING', 8.00, -17.02, 9.08, '2026-08-23T10:00:00Z'),
  ('TOPIC-178', 'Clean Architecture & Hexagonal Ports', 'ARCH', 'Architectural pattern decoupling business logic from external frameworks and IO.', 78.00, 'LEARNING', 11.81, -7.44, 8.91, '2026-08-21T10:00:00Z'),
  ('TOPIC-179', 'Event-Driven Architecture (EDA)', 'ARCH', 'Asynchronous communication pattern driven by event production, detection, and consumption.', 27.00, 'NEW', 16.64, -21.14, 8.21, '2026-08-17T10:00:00Z'),
  ('TOPIC-180', 'Reactive Streams & Backpressure', 'ARCH', 'Asynchronous stream processing standard controlling data flow rates between stages.', 43.00, 'DUE', 0.35, -12.15, 6.98, NULL),
  ('TOPIC-181', 'Serverless & Edge Functions', 'ARCH', 'Event-driven compute execution running at network edge locations on demand.', 56.00, 'LEARNING', 15.27, -11.42, 4.70, '2026-08-24T08:00:00Z'),
  ('TOPIC-182', 'Database Sharding & Partitioning', 'ARCH', 'Horizontal data distribution splitting database tables across node clusters.', 93.00, 'MASTERED', 9.52, -20.42, 3.58, '2026-08-23T10:00:00Z'),
  ('TOPIC-183', 'GraphQL Schema & Resolvers', 'ARCH', 'Query language for APIs enabling clients to request precise data shapes.', 51.00, 'LEARNING', 7.56, -7.03, 2.08, '2026-08-21T10:00:00Z'),
  ('TOPIC-184', 'OpenAPI & RESTful API Specs', 'ARCH', 'Standardized contract specifications for RESTful HTTP web service interfaces.', 83.00, 'MASTERED', 19.59, -17.13, 0.04, '2026-08-17T10:00:00Z'),
  ('TOPIC-185', 'Service Workers & PWA Caching', 'ARCH', 'Background browser scripts intercepting network requests for offline caching.', 81.00, 'MASTERED', 2.66, -17.61, -2.52, NULL),
  ('TOPIC-186', 'Distributed Tracing (OpenTelemetry)', 'ARCH', 'Collecting trace spans across microservices to analyze request latencies.', 73.00, 'LEARNING', 12.62, -11.08, 0.38, '2026-08-24T08:00:00Z'),
  ('TOPIC-187', 'Feature Flag Toggles & Canary Deployments', 'ARCH', 'Safe deployment strategy exposing new code incrementally to target user slices.', 14.00, 'NEW', 12.01, -16.59, -1.92, '2026-08-23T10:00:00Z');

-- 2. TOPIC PREREQUISITES (Directed Graph Edges)
INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES
  ('TOPIC-010', 'TOPIC-001'),
  ('TOPIC-002', 'TOPIC-001'),
  ('TOPIC-011', 'TOPIC-001'),
  ('TOPIC-031', 'TOPIC-001'),
  ('TOPIC-028', 'TOPIC-001'),
  ('TOPIC-020', 'TOPIC-002'),
  ('TOPIC-018', 'TOPIC-002'),
  ('TOPIC-019', 'TOPIC-002'),
  ('TOPIC-009', 'TOPIC-002'),
  ('TOPIC-033', 'TOPIC-002'),
  ('TOPIC-003', 'TOPIC-001'),
  ('TOPIC-004', 'TOPIC-003'),
  ('TOPIC-006', 'TOPIC-003'),
  ('TOPIC-116', 'TOPIC-003'),
  ('TOPIC-004', 'TOPIC-001'),
  ('TOPIC-004', 'TOPIC-115'),
  ('TOPIC-003', 'TOPIC-004'),
  ('TOPIC-031', 'TOPIC-004'),
  ('TOPIC-005', 'TOPIC-001'),
  ('TOPIC-005', 'TOPIC-120'),
  ('TOPIC-021', 'TOPIC-005'),
  ('TOPIC-026', 'TOPIC-006'),
  ('TOPIC-007', 'TOPIC-001'),
  ('TOPIC-022', 'TOPIC-007'),
  ('TOPIC-029', 'TOPIC-007'),
  ('TOPIC-012', 'TOPIC-007'),
  ('TOPIC-008', 'TOPIC-002'),
  ('TOPIC-020', 'TOPIC-008'),
  ('TOPIC-021', 'TOPIC-008'),
  ('TOPIC-027', 'TOPIC-009'),
  ('TOPIC-019', 'TOPIC-009'),
  ('TOPIC-032', 'TOPIC-010'),
  ('TOPIC-026', 'TOPIC-010'),
  ('TOPIC-002', 'TOPIC-011'),
  ('TOPIC-029', 'TOPIC-012'),
  ('TOPIC-016', 'TOPIC-013'),
  ('TOPIC-014', 'TOPIC-013'),
  ('TOPIC-014', 'TOPIC-099'),
  ('TOPIC-014', 'TOPIC-098'),
  ('TOPIC-015', 'TOPIC-014'),
  ('TOPIC-102', 'TOPIC-015'),
  ('TOPIC-016', 'TOPIC-108'),
  ('TOPIC-109', 'TOPIC-016'),
  ('TOPIC-120', 'TOPIC-017'),
  ('TOPIC-104', 'TOPIC-017'),
  ('TOPIC-027', 'TOPIC-018'),
  ('TOPIC-009', 'TOPIC-019'),
  ('TOPIC-020', 'TOPIC-021'),
  ('TOPIC-008', 'TOPIC-020'),
  ('TOPIC-021', 'TOPIC-038'),
  ('TOPIC-028', 'TOPIC-022'),
  ('TOPIC-023', 'TOPIC-043'),
  ('TOPIC-007', 'TOPIC-023'),
  ('TOPIC-024', 'TOPIC-002'),
  ('TOPIC-027', 'TOPIC-024'),
  ('TOPIC-025', 'TOPIC-001'),
  ('TOPIC-026', 'TOPIC-025'),
  ('TOPIC-006', 'TOPIC-026'),
  ('TOPIC-024', 'TOPIC-027'),
  ('TOPIC-095', 'TOPIC-030'),
  ('TOPIC-004', 'TOPIC-031'),
  ('TOPIC-036', 'TOPIC-034'),
  ('TOPIC-054', 'TOPIC-034'),
  ('TOPIC-035', 'TOPIC-034'),
  ('TOPIC-055', 'TOPIC-034'),
  ('TOPIC-038', 'TOPIC-034'),
  ('TOPIC-074', 'TOPIC-035'),
  ('TOPIC-054', 'TOPIC-036'),
  ('TOPIC-055', 'TOPIC-036'),
  ('TOPIC-048', 'TOPIC-037'),
  ('TOPIC-059', 'TOPIC-037'),
  ('TOPIC-047', 'TOPIC-037'),
  ('TOPIC-049', 'TOPIC-039'),
  ('TOPIC-040', 'TOPIC-039'),
  ('TOPIC-041', 'TOPIC-040'),
  ('TOPIC-043', 'TOPIC-042'),
  ('TOPIC-061', 'TOPIC-042'),
  ('TOPIC-062', 'TOPIC-042'),
  ('TOPIC-045', 'TOPIC-044'),
  ('TOPIC-063', 'TOPIC-046'),
  ('TOPIC-048', 'TOPIC-047'),
  ('TOPIC-066', 'TOPIC-047'),
  ('TOPIC-059', 'TOPIC-048'),
  ('TOPIC-050', 'TOPIC-100'),
  ('TOPIC-010', 'TOPIC-050'),
  ('TOPIC-113', 'TOPIC-050'),
  ('TOPIC-052', 'TOPIC-051'),
  ('TOPIC-053', 'TOPIC-051'),
  ('TOPIC-074', 'TOPIC-051'),
  ('TOPIC-073', 'TOPIC-053'),
  ('TOPIC-057', 'TOPIC-056'),
  ('TOPIC-124', 'TOPIC-058'),
  ('TOPIC-065', 'TOPIC-059'),
  ('TOPIC-060', 'TOPIC-034'),
  ('TOPIC-064', 'TOPIC-063'),
  ('TOPIC-021', 'TOPIC-063'),
  ('TOPIC-068', 'TOPIC-067'),
  ('TOPIC-069', 'TOPIC-067'),
  ('TOPIC-070', 'TOPIC-067'),
  ('TOPIC-096', 'TOPIC-067'),
  ('TOPIC-096', 'TOPIC-068'),
  ('TOPIC-087', 'TOPIC-070'),
  ('TOPIC-072', 'TOPIC-071'),
  ('TOPIC-073', 'TOPIC-071'),
  ('TOPIC-097', 'TOPIC-071'),
  ('TOPIC-097', 'TOPIC-072'),
  ('TOPIC-097', 'TOPIC-073'),
  ('TOPIC-182', 'TOPIC-073'),
  ('TOPIC-074', 'TOPIC-075'),
  ('TOPIC-051', 'TOPIC-074'),
  ('TOPIC-070', 'TOPIC-075'),
  ('TOPIC-077', 'TOPIC-076'),
  ('TOPIC-091', 'TOPIC-076'),
  ('TOPIC-078', 'TOPIC-077'),
  ('TOPIC-092', 'TOPIC-077'),
  ('TOPIC-079', 'TOPIC-078'),
  ('TOPIC-081', 'TOPIC-080'),
  ('TOPIC-091', 'TOPIC-080'),
  ('TOPIC-082', 'TOPIC-081'),
  ('TOPIC-083', 'TOPIC-082'),
  ('TOPIC-084', 'TOPIC-083'),
  ('TOPIC-169', 'TOPIC-084'),
  ('TOPIC-085', 'TOPIC-084'),
  ('TOPIC-176', 'TOPIC-085'),
  ('TOPIC-088', 'TOPIC-086'),
  ('TOPIC-180', 'TOPIC-086'),
  ('TOPIC-090', 'TOPIC-089'),
  ('TOPIC-176', 'TOPIC-090'),
  ('TOPIC-093', 'TOPIC-077'),
  ('TOPIC-094', 'TOPIC-090'),
  ('TOPIC-097', 'TOPIC-095'),
  ('TOPIC-098', 'TOPIC-099'),
  ('TOPIC-103', 'TOPIC-098'),
  ('TOPIC-120', 'TOPIC-099'),
  ('TOPIC-101', 'TOPIC-100'),
  ('TOPIC-121', 'TOPIC-101'),
  ('TOPIC-136', 'TOPIC-102'),
  ('TOPIC-103', 'TOPIC-102'),
  ('TOPIC-114', 'TOPIC-102'),
  ('TOPIC-136', 'TOPIC-103'),
  ('TOPIC-105', 'TOPIC-104'),
  ('TOPIC-106', 'TOPIC-104'),
  ('TOPIC-115', 'TOPIC-104'),
  ('TOPIC-106', 'TOPIC-105'),
  ('TOPIC-118', 'TOPIC-105'),
  ('TOPIC-108', 'TOPIC-107'),
  ('TOPIC-001', 'TOPIC-107'),
  ('TOPIC-109', 'TOPIC-108'),
  ('TOPIC-111', 'TOPIC-110'),
  ('TOPIC-112', 'TOPIC-110'),
  ('TOPIC-126', 'TOPIC-110'),
  ('TOPIC-155', 'TOPIC-110'),
  ('TOPIC-126', 'TOPIC-111'),
  ('TOPIC-159', 'TOPIC-111'),
  ('TOPIC-113', 'TOPIC-100'),
  ('TOPIC-135', 'TOPIC-114'),
  ('TOPIC-116', 'TOPIC-115'),
  ('TOPIC-023', 'TOPIC-117'),
  ('TOPIC-119', 'TOPIC-110'),
  ('TOPIC-138', 'TOPIC-121'),
  ('TOPIC-138', 'TOPIC-122'),
  ('TOPIC-123', 'TOPIC-105'),
  ('TOPIC-058', 'TOPIC-124'),
  ('TOPIC-158', 'TOPIC-125'),
  ('TOPIC-132', 'TOPIC-125'),
  ('TOPIC-127', 'TOPIC-102'),
  ('TOPIC-128', 'TOPIC-114'),
  ('TOPIC-130', 'TOPIC-129'),
  ('TOPIC-131', 'TOPIC-129'),
  ('TOPIC-132', 'TOPIC-129'),
  ('TOPIC-133', 'TOPIC-129'),
  ('TOPIC-135', 'TOPIC-129'),
  ('TOPIC-131', 'TOPIC-130'),
  ('TOPIC-146', 'TOPIC-130'),
  ('TOPIC-158', 'TOPIC-132'),
  ('TOPIC-134', 'TOPIC-129'),
  ('TOPIC-135', 'TOPIC-134'),
  ('TOPIC-137', 'TOPIC-136'),
  ('TOPIC-154', 'TOPIC-136'),
  ('TOPIC-146', 'TOPIC-137'),
  ('TOPIC-140', 'TOPIC-138'),
  ('TOPIC-115', 'TOPIC-139'),
  ('TOPIC-141', 'TOPIC-140'),
  ('TOPIC-155', 'TOPIC-140'),
  ('TOPIC-155', 'TOPIC-141'),
  ('TOPIC-142', 'TOPIC-110'),
  ('TOPIC-155', 'TOPIC-142'),
  ('TOPIC-143', 'TOPIC-136'),
  ('TOPIC-144', 'TOPIC-102'),
  ('TOPIC-146', 'TOPIC-144'),
  ('TOPIC-145', 'TOPIC-136'),
  ('TOPIC-147', 'TOPIC-134'),
  ('TOPIC-149', 'TOPIC-148'),
  ('TOPIC-150', 'TOPIC-114'),
  ('TOPIC-151', 'TOPIC-138'),
  ('TOPIC-152', 'TOPIC-155'),
  ('TOPIC-153', 'TOPIC-136'),
  ('TOPIC-156', 'TOPIC-140'),
  ('TOPIC-157', 'TOPIC-129'),
  ('TOPIC-159', 'TOPIC-158'),
  ('TOPIC-161', 'TOPIC-158'),
  ('TOPIC-168', 'TOPIC-158'),
  ('TOPIC-161', 'TOPIC-159'),
  ('TOPIC-165', 'TOPIC-159'),
  ('TOPIC-164', 'TOPIC-160'),
  ('TOPIC-165', 'TOPIC-160'),
  ('TOPIC-169', 'TOPIC-161'),
  ('TOPIC-169', 'TOPIC-162'),
  ('TOPIC-158', 'TOPIC-163'),
  ('TOPIC-160', 'TOPIC-163'),
  ('TOPIC-166', 'TOPIC-174'),
  ('TOPIC-167', 'TOPIC-166'),
  ('TOPIC-167', 'TOPIC-077'),
  ('TOPIC-169', 'TOPIC-168'),
  ('TOPIC-171', 'TOPIC-170'),
  ('TOPIC-172', 'TOPIC-171'),
  ('TOPIC-173', 'TOPIC-168'),
  ('TOPIC-174', 'TOPIC-175'),
  ('TOPIC-176', 'TOPIC-178'),
  ('TOPIC-090', 'TOPIC-176'),
  ('TOPIC-186', 'TOPIC-176'),
  ('TOPIC-178', 'TOPIC-177'),
  ('TOPIC-086', 'TOPIC-179'),
  ('TOPIC-088', 'TOPIC-179'),
  ('TOPIC-180', 'TOPIC-179'),
  ('TOPIC-181', 'TOPIC-179'),
  ('TOPIC-183', 'TOPIC-184'),
  ('TOPIC-171', 'TOPIC-185'),
  ('TOPIC-187', 'TOPIC-176');

-- 3. NOTES (Markdown + KaTeX Math Payloads)
INSERT INTO notes (id, topic_id, title, filename, content, created_at, updated_at) VALUES
  ('NOTE-001', 'TOPIC-001', 'Backpropagation Derivation Notes', NULL, '# Neural Network Backpropagation

Backpropagation (short for *backward propagation of errors*) is the fundamental supervised learning algorithm for artificial neural networks. Given an error function, it calculates the analytical gradient of the loss with respect to all tunable parameters (weights and biases) across the computation graph.

---

## 1. Mathematical Formulation & Chain Rule
For an $L$-layer network, the forward propagation for layer $l$ is defined as:

$$ Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]} $$
$$ A^{[l]} = g(Z^{[l]}) $$

Where $g(\cdot)$ is the non-linear activation function (such as ReLU, GELU, or Sigmoid).

Applying the **multivariate chain rule**, the error term $\delta^{[l]}$ (or $dZ^{[l]}$) is computed backwards:

$$ \delta^{[L]} = \nabla_A \mathcal{L} \odot g''(Z^{[L]}) $$
$$ \delta^{[l]} = ((W^{[l+1]})^T \delta^{[l+1]}) \odot g''(Z^{[l]}) $$

---

## 2. Gradient Calculation Matrix

| Variable | Forward Pass Formula | Gradient Formula (Loss Derivative) |
| :--- | :--- | :--- |
| **Linear Combination ($Z$)** | $Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]}$ | $dZ^{[l]} = dA^{[l]} \odot g''(Z^{[l]})$ |
| **Weight Matrix ($W$)** | Parameter matrix | $dW^{[l]} = \frac{1}{m} dZ^{[l]} (A^{[l-1]})^T$ |
| **Bias Vector ($b$)** | Parameter vector | $db^{[l]} = \frac{1}{m} \sum_{i=1}^{m} dZ^{[l](i)}$ |
| **Activation Output ($A$)** | $A^{[l]} = g(Z^{[l]})$ | $dA^{[l-1]} = (W^{[l]})^T dZ^{[l]}$ |

---

## 3. Minimal Python / NumPy Vectorized Implementation

```python
import numpy as np

def backward_propagation(dAL, caches):
    """
    Computes loss gradients across all network layers.
    dAL: post-activation gradient for output layer
    caches: list of caches containing (A_prev, W, b, Z)
    """
    grads = {}
    L = len(caches)
    m = dAL.shape[1]
    
    # Output layer gradient
    current_cache = caches[L - 1]
    grads[f"dA{L-1}"], grads[f"dW{L}"], grads[f"db{L}"] = linear_activation_backward(
        dAL, current_cache, activation="sigmoid"
    )
    
    # Loop backwards through hidden layers
    for l in reversed(range(L - 1)):
        current_cache = caches[l]
        dA_prev_temp, dW_temp, db_temp = linear_activation_backward(
            grads[f"dA{l+1}"], current_cache, activation="relu"
        )
        grads[f"dA{l}"] = dA_prev_temp
        grads[f"dW{l+1}"] = dW_temp
        grads[f"db{l+1}"] = db_temp
        
    return grads
```

---

## 4. Key Bottlenecks & Optimization Techniques
- **Vanishing Gradients**: When using sigmoids/tanh, gradients saturate near zero for large $|z|$. Solution: ReLU, GELU, residual skip connections (ResNets).
- **Exploding Gradients**: Large weights lead to exponentially growing gradients. Solution: Gradient norm clipping, proper initialization (He / Xavier), LayerNorm.
- **Memory Overhead**: Activations $A^{[l]}$ must be retained in VRAM during forward pass for backward derivation. Solution: Activation checkpointing (rematerialization).
', '2026-08-17T10:00:00Z', '2026-08-24T08:00:00Z'),
  ('NOTE-002', 'TOPIC-034', 'BST Invariants & Traversal', NULL, '# Binary Search Trees (BST)

A Binary Search Tree is a rooted binary tree data structure where each internal node stores a key greater than all keys in its left subtree and less than all keys in its right subtree.

---

## 1. Asymptotic Complexity
| Operation | Average Case | Worst Case (Degenerate) |
| :--- | :--- | :--- |
| **Search** | $\mathcal{O}(\log N)$ | $\mathcal{O}(N)$ |
| **Insertion** | $\mathcal{O}(\log N)$ | $\mathcal{O}(N)$ |
| **Deletion** | $\mathcal{O}(\log N)$ | $\mathcal{O}(N)$ |

---

## 2. In-Order Traversal Invariant
Performing an in-order traversal (Left $\to$ Node $\to$ Right) visits keys in strictly sorted ascending order.
', '2026-08-14T10:00:00Z', '2026-08-23T10:00:00Z'),
  ('NOTE-003', 'TOPIC-067', 'Raft Consensus & Leader Election', NULL, '# Raft Distributed Consensus

Raft decomposes consensus into explicit sub-problems: **Leader Election**, **Log Replication**, and **Safety**.

---

## 1. Node States & Transitions
- **Follower**: Responds to incoming RPCs from leaders and candidates.
- **Candidate**: Increments term, votes for self, and sends `RequestVote` RPCs.
- **Leader**: Manages replicated log entries and broadcasts periodic heartbeats.

---

## 2. Key Invariants
1. **Election Safety**: At most one leader can be elected in a given term.
2. **Leader Append-Only**: A leader never overwrites or truncates its own log entries.
3. **Log Matching Property**: If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.
', '2026-08-18T04:00:00.000Z', '2026-08-24T10:00:00Z'),
  ('NOTE-004', 'TOPIC-098', 'SVD Matrix Factorization', NULL, '# Singular Value Decomposition (SVD)

Singular Value Decomposition (SVD) is a fundamental theorem in linear algebra stating that any $m \times n$ real matrix $A$ can be factorized into three matrices:

$$ A = U \Sigma V^T $$

---

## 1. Matrix Properties
- $U$ is an $m \times m$ orthogonal matrix (Left singular vectors, eigenvectors of $AA^T$).
- $\Sigma$ is an $m \times n$ rectangular diagonal matrix containing non-negative singular values $\sigma_1 \ge \sigma_2 \ge \dots \ge 0$.
- $V^T$ is the transpose of an $n \times n$ orthogonal matrix $V$ (Right singular vectors, eigenvectors of $A^T A$).

---

## 2. Low-Rank Matrix Approximation (Eckart-Young-Mirsky Theorem)
The optimal rank-$k$ approximation $\hat{A}_k$ in Frobenius and spectral norms is obtained by truncating to the top $k$ singular values:

$$ \hat{A}_k = \sum_{i=1}^{k} \sigma_i u_i v_i^T $$
', '2026-08-16T04:00:00.000Z', '2026-08-24T10:00:00Z');

-- 4. STUDY TODOS (Actionable Study Goals)
INSERT INTO study_todos (id, topic_id, title, category, priority, completed, due_date) VALUES
  ('TODO-001', 'TOPIC-001', 'Implement Backpropagation autograd engine from scratch', 'AI & ML', 'HIGH', FALSE, 'Today'),
  ('TODO-002', 'TOPIC-002', 'Review 15 Spaced Repetition cards for Transformer Attention', 'AI & ML', 'HIGH', FALSE, 'Today'),
  ('TODO-003', 'TOPIC-034', 'Complete Raft leader election failure scenario simulation', 'SYSTEMS', 'MEDIUM', TRUE, 'Today'),
  ('TODO-004', 'TOPIC-096', 'Read SVD Chapter 4 in Linear Algebra for ML', 'MATH', 'MEDIUM', FALSE, 'Tomorrow'),
  ('TODO-005', 'TOPIC-035', 'Build Toy Compiler LLVM SSA IR generator', 'CS', 'LOW', FALSE, 'This Week');

COMMIT;
