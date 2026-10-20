# In-Process and Distributed Queue Boundaries

An in-process queue shares memory and synchronization primitives with its workers. It can use a local lock and a monotonic clock, but its task records disappear if the process stops.

A distributed queue must coordinate claims over a network and persist enough state to recover after a restart. A timeout cannot prove a remote worker is dead: a partitioned or paused worker may still finish. Use unique fencing tokens for ownership and make external effects idempotent.

Use the simplest boundary that meets the problem’s requirements. Persistence, replication, and network coordination add important guarantees, but they also add failure modes and operational cost.
