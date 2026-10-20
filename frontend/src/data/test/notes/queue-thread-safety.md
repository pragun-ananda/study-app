# Thread Safety in Shared Queues

Thread safety means shared queue state stays valid when multiple workers call operations at the same time. Protect state transitions such as removing a pending task, assigning its lease token, and recording its deadline as one atomic operation.

Keep task execution outside the queue lock. Otherwise one slow task can prevent every worker from claiming or completing other work.

For a work queue, test that concurrent claims never assign the same current lease to two workers, and that completion or failure with an old lease cannot mutate current state.
