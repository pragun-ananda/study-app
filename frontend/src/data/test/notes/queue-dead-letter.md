# Dead Letter Queues and Retry Exhaustion

A dead letter queue stores tasks that have reached their retry limit. Moving a task to this terminal state makes failure visible and preserves its payload and last error for inspection, correction, or deliberate replay.

Define whether the attempt count means claims or failures, and move the task to the dead letter queue at one precise boundary. Keep this transition atomic with clearing the active lease so the task cannot be both leased and dead.

Dead lettering is a deliberate set-aside, not successful completion. Monitor its size and provide a safe replay or resolution process.
