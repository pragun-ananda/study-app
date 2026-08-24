# Raft Distributed Consensus

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
