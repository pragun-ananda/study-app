import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchInterviewLearningPath,
  fetchInterviewLearningAttempts,
  recordInterviewLearningEvent,
  startInterviewLearningAttempt
} from '../../api/client';
import { InterviewLearningAttempt, InterviewLearningPath, TopicNode } from '../../types/telemetry';

interface GuidedPracticePanelProps {
  problemId: string;
  isLight: boolean;
  onAttemptStarted: () => void;
  onRevealSolution: () => void;
  topicNodes?: TopicNode[];
  onOpenConcept?: (topic: TopicNode) => void;
}

type Mode = 'intro' | 'initial-attempt' | 'diagnostics' | 'stages' | 'transfer' | 'complete';

export default function GuidedPracticePanel({ problemId, isLight, onAttemptStarted, onRevealSolution, topicNodes = [], onOpenConcept = () => undefined }: GuidedPracticePanelProps) {
  const [path, setPath] = useState<InterviewLearningPath | null>(null);
  const [attempt, setAttempt] = useState<InterviewLearningAttempt | null>(null);
  const [mode, setMode] = useState<Mode>('intro');
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [saved, setSaved] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [confidence, setConfidence] = useState(3);
  const [reviewDueAt, setReviewDueAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardClass = isLight ? 'border-slate-200 bg-white text-slate-800' : 'border-slate-800 bg-slate-950/70 text-slate-100';
  const secondaryClass = isLight ? 'text-slate-600' : 'text-slate-400';
  const buttonClass = isLight
    ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
    : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPath(null);
    setAttempt(null);
    setMode('intro');
    setIndex(0);
    setResponse('');
    setSaved(false);
    setReviewDueAt(null);
    setError(null);
    fetchInterviewLearningPath(problemId)
      .then((result) => { if (!cancelled) setPath(result); })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the guided learning path.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [problemId]);

  const currentStage = useMemo(() => path?.reasoningStages[index], [path, index]);
  const relatedConcepts = useMemo(() => (path?.concepts || []).flatMap((concept) => {
    const topic = concept.topicId ? topicNodes.find((node) => node.id === concept.topicId) : undefined;
    return topic ? [{ concept, topic }] : [];
  }), [path, topicNodes]);

  const renderConceptLinks = (text: string) => {
    const terms = relatedConcepts
      .flatMap(({ concept, topic }) => (concept.terms?.length ? concept.terms : [concept.name])
        .map((term) => ({ term, topic })))
      .sort((a, b) => b.term.length - a.term.length);
    if (!terms.length) return text;
    const termPattern = terms.map(({ term }) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')).join('|');
    const matcher = new RegExp(`\\b(${termPattern})\\b`, 'gi');
    const termByText = new Map(terms.map(({ term, topic }) => [term.toLowerCase(), topic]));
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    for (const match of text.matchAll(matcher)) {
      const start = match.index ?? 0;
      if (start > cursor) parts.push(text.slice(cursor, start));
      const phrase = match[0];
      const topic = termByText.get(phrase.toLowerCase());
      parts.push(topic ? <button key={`${topic.id}-${start}`} type="button" aria-label={`Open concept: ${topic.name}`} onClick={() => onOpenConcept(topic)} title={topic.summary} className="font-semibold text-sky-600 underline decoration-sky-400/50 underline-offset-2 hover:text-sky-500 dark:text-cyan-300 dark:decoration-cyan-400/50">{phrase}</button> : phrase);
      cursor = start + phrase.length;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts.length ? parts : text;
  };

  const begin = async () => {
    if (!path) return;
    setBusy(true);
    setError(null);
    try {
      const started = await startInterviewLearningAttempt(problemId);
      setAttempt(started);
      onAttemptStarted();
      setMode(path.initialAttemptPrompt ? 'initial-attempt' : 'diagnostics');
      setIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start this practice attempt.');
    } finally {
      setBusy(false);
    }
  };

  const sendEvent = async (eventType: string, stageId?: string, payload?: Record<string, unknown>) => {
    if (!attempt) return;
    await recordInterviewLearningEvent(problemId, attempt.id, { eventType, stageId, payload });
  };

  const saveDiagnostic = async () => {
    if (!path || !attempt || !response.trim()) return;
    const concept = path.concepts[index];
    setBusy(true);
    setError(null);
    try {
      await sendEvent('DIAGNOSTIC_RESPONSE', undefined, { conceptId: concept.id, response: response.trim() });
      setResponse('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this response.');
    } finally {
      setBusy(false);
    }
  };

  const saveInitialAttempt = async () => {
    if (!attempt || !response.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendEvent('INITIAL_ATTEMPT', undefined, { response: response.trim() });
      setResponse('');
      setMode('diagnostics');
      setIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your first attempt.');
    } finally {
      setBusy(false);
    }
  };

  const continueDiagnostic = () => {
    if (!path) return;
    setSaved(false);
    if (index + 1 >= path.concepts.length) {
      setMode('stages');
      setIndex(0);
    } else {
      setIndex((previous) => previous + 1);
    }
    setResponse('');
  };

  const revealHint = async () => {
    if (!currentStage || !attempt || hintRevealed) return;
    setBusy(true);
    try {
      await sendEvent('HINT_REQUESTED', currentStage.id);
      setHintRevealed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record hint use.');
    } finally {
      setBusy(false);
    }
  };

  const saveStageResponse = async () => {
    if (!currentStage || !response.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendEvent('STAGE_RESPONSE', currentStage.id, { response: response.trim() });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this reasoning step.');
    } finally {
      setBusy(false);
    }
  };

  const verifyStage = async () => {
    if (!currentStage) return;
    setBusy(true);
    setError(null);
    try {
      await sendEvent('STAGE_VERIFIED', currentStage.id, { selfChecked: true });
      setSaved(false);
      setResponse('');
      setHintRevealed(false);
      if (path && index + 1 >= path.reasoningStages.length) {
        setMode('transfer');
        setIndex(0);
      } else {
        setIndex((previous) => previous + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record this check.');
    } finally {
      setBusy(false);
    }
  };

  const saveTransfer = async () => {
    if (!response.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendEvent('TRANSFER_RESPONSE', undefined, { response: response.trim() });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your transfer response.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendEvent('CONFIDENCE_RECORDED', undefined, { confidence });
      await sendEvent('COMPLETED');
      setMode('complete');
      try {
        const attempts = await fetchInterviewLearningAttempts(problemId);
        setReviewDueAt(attempts.find((item) => item.id === attempt?.id)?.reviewDueAt || null);
      } catch {
        setReviewDueAt(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish this attempt.');
    } finally {
      setBusy(false);
    }
  };

  const revealSolution = async () => {
    try {
      await sendEvent('SOLUTION_REVEALED');
    } catch {
      // Keep solution navigation available if telemetry is temporarily unavailable.
    }
    onRevealSolution();
  };

  if (loading) return <div className={`p-6 text-sm ${secondaryClass}`} role="status">Loading problem guide…</div>;
  if (!path) return <div className={`m-5 rounded-xl border p-5 ${cardClass}`} role="alert">{error || 'No guide is available for this question yet.'}</div>;

  const breakdown = path.problemBreakdown;
  const coreFailures = breakdown?.failureScenarios.filter((item) =>
    ['worker_crash', 'slow_live_worker', 'stale_worker_report', 'retry_exhaustion'].includes(item.id)
  ) || [];
  const coverageGaps = breakdown?.failureScenarios.filter((item) => item.scope === 'CORE' && item.sourceTestNames.length === 0) || [];

  return (
    <section className="space-y-3 p-4" data-testid="guided-practice-panel" aria-label="Problem breakdown and practice">
      <header className={`rounded-xl border p-4 ${cardClass}`}>
        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-500">Problem guide</div>
        <p className="mt-2 text-sm leading-relaxed">{renderConceptLinks(path.interpretation.goal)}</p>
        {mode === 'intro' && <button type="button" onClick={begin} disabled={busy} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>
          {busy ? 'Starting…' : 'Start practice'}
        </button>}
      </header>

      {breakdown && <details open={mode === 'intro'} className={`rounded-xl border p-4 ${cardClass}`} data-testid="problem-breakdown">
        <summary className="cursor-pointer text-sm font-bold">Problem breakdown</summary>
        <div className="mt-3 grid gap-4 text-xs sm:grid-cols-2">
          <section>
            <h3 className="font-bold">Queue contract</h3>
            <ul className={`mt-1 list-disc space-y-1 pl-4 ${secondaryClass}`}>
              {breakdown.contract.map((item) => <li key={item.operation}><code>{item.operation}</code>: {item.behavior}</li>)}
            </ul>
          </section>
          <section>
            <h3 className="font-bold">Task lifecycle</h3>
            <p className={`mt-1 ${secondaryClass}`}>{renderConceptLinks('PENDING → LEASED → DONE, PENDING (retry), or DEAD (limit reached).')}</p>
            <p className={`mt-1 ${secondaryClass}`}>{renderConceptLinks('Keep each task recorded. Only its current lease token can change it.')}</p>
          </section>
          <section>
            <h3 className="font-bold">Failure handling</h3>
            <ul className={`mt-1 list-disc space-y-1 pl-4 ${secondaryClass}`}>
              {coreFailures.map((item) => <li key={item.id}><strong>{item.id.replace(/_/g, ' ')}</strong>: {renderConceptLinks(item.queueBehavior)}</li>)}
            </ul>
            {coverageGaps.length > 0 && <p className="mt-2 text-amber-500">Core test gap: {coverageGaps.map((item) => item.id.replace(/_/g, ' ')).join(', ')}.</p>}
          </section>
          <section>
            <h3 className="font-bold">Cost and delivery</h3>
            <p className={`mt-1 ${secondaryClass}`}>Submit O(1) · claim amortized O(log h) · heartbeat O(log h).</p>
            <p className={`mt-1 ${secondaryClass}`}>{renderConceptLinks('At-least-once: duplicate work can happen. Use idempotency or fencing for external effects.')}</p>
          </section>
        </div>
      </details>}

      {mode === 'initial-attempt' && <div className={`rounded-xl border p-4 ${cardClass}`}>
        <h3 className="text-sm font-bold">Your approach</h3>
        <p className={`mt-1 text-xs ${secondaryClass}`}>{path.initialAttemptPrompt}</p>
        <textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={4} className={`mt-3 w-full rounded-lg border p-3 text-xs ${isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-700 bg-slate-900'}`} aria-label="Your initial problem analysis" />
        <button type="button" onClick={saveInitialAttempt} disabled={busy || !response.trim()} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${buttonClass}`}>Save and continue</button>
      </div>}

      {mode === 'diagnostics' && path.concepts[index] && (() => {
        const concept = path.concepts[index];
        return <div className={`rounded-xl border p-4 ${cardClass}`}>
          <div className={`text-[10px] font-mono uppercase tracking-widest ${secondaryClass}`}>Concept {index + 1} of {path.concepts.length}</div>
          <h3 className="mt-2 text-sm font-bold">{concept.name}</h3>
          <p className={`mt-1 text-xs ${secondaryClass}`}>{concept.intuition}</p>
          <p className="mt-3 text-sm font-medium">{concept.diagnosticQuestion}</p>
          <textarea value={response} onChange={(event) => setResponse(event.target.value)} disabled={saved} rows={3} className={`mt-3 w-full rounded-lg border p-3 text-xs ${isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-700 bg-slate-900'}`} aria-label={`Response for ${concept.name}`} />
          {saved ? <div className="mt-3 space-y-2">
            <p className={`text-xs ${secondaryClass}`}>Check: {concept.diagnosticSuccessCriteria}</p>
            <button type="button" onClick={continueDiagnostic} className={`rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>{index + 1 === path.concepts.length ? 'Continue' : 'Next concept'}</button>
          </div> : <button type="button" onClick={saveDiagnostic} disabled={busy || !response.trim()} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${buttonClass}`}>Save response</button>}
        </div>;
      })()}

      {mode === 'stages' && currentStage && <div className={`rounded-xl border p-4 ${cardClass}`}>
        <div className={`text-[10px] font-mono uppercase tracking-widest ${secondaryClass}`}>Step {index + 1} of {path.reasoningStages.length}</div>
        <h3 className="mt-2 text-sm font-bold">{currentStage.title}</h3>
        <p className={`mt-1 text-xs ${secondaryClass}`}>{currentStage.purpose}</p>
        <p className="mt-4 text-sm font-medium">{currentStage.learnerPrompt}</p>
        <textarea value={response} onChange={(event) => setResponse(event.target.value)} disabled={saved} rows={4} className={`mt-3 w-full rounded-lg border p-3 text-xs ${isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-700 bg-slate-900'}`} aria-label={`Your reasoning for ${currentStage.title}`} />
        {!hintRevealed && <button type="button" onClick={revealHint} disabled={busy} className={`mt-3 rounded-lg border px-3 py-2 text-xs ${buttonClass}`}>Show hint</button>}
        {hintRevealed && <p className={`mt-3 rounded-lg border p-3 text-xs ${isLight ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`} data-testid="guided-hint">{currentStage.hint}</p>}
        {saved ? <div className="mt-4 space-y-3">
          <div className={`rounded-lg border p-3 ${isLight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
            <div className="text-xs font-bold">Check your answer</div>
            <ul className={`mt-2 list-disc space-y-1 pl-4 text-xs ${secondaryClass}`}>{currentStage.verificationCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
          </div>
          <button type="button" onClick={verifyStage} disabled={busy} className={`rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>Continue</button>
        </div> : <button type="button" onClick={saveStageResponse} disabled={busy || !response.trim()} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${buttonClass}`}>Save response</button>}
        <div className="mt-4 border-t border-slate-700/30 pt-3">
          <button type="button" onClick={revealSolution} className={`text-xs underline underline-offset-2 ${secondaryClass}`}>Open full solution</button>
        </div>
      </div>}

      {mode === 'transfer' && <div className={`rounded-xl border p-4 ${cardClass}`}>
        <div className={`text-[10px] font-mono uppercase tracking-widest ${secondaryClass}`}>Try a variation</div>
        <p className="mt-2 text-sm font-medium">{path.transferExercise.prompt}</p>
        <p className={`mt-2 text-xs ${secondaryClass}`}>{path.transferExercise.changedConstraint}</p>
        <textarea value={response} onChange={(event) => setResponse(event.target.value)} disabled={saved} rows={4} className={`mt-3 w-full rounded-lg border p-3 text-xs ${isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-700 bg-slate-900'}`} aria-label="Transfer exercise response" />
        {saved ? <div className="mt-3 space-y-3">
          <p className={`text-xs ${secondaryClass}`}>Check: {path.transferExercise.assessmentCriteria.join(' ')}</p>
          <label className={`block text-xs ${secondaryClass}`}>Confidence: {confidence}/5
            <input aria-label="Confidence" type="range" min={1} max={5} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} className="mt-2 block w-full" />
          </label>
          <button type="button" onClick={finish} disabled={busy} className={`rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>Finish</button>
        </div> : <button type="button" onClick={saveTransfer} disabled={busy || !response.trim()} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${buttonClass}`}>Save response</button>}
      </div>}

      {mode === 'complete' && <div className={`rounded-xl border p-4 ${cardClass}`}>
        <h3 className="text-sm font-bold">Practice complete</h3>
        <p className={`mt-2 text-xs ${secondaryClass}`}>Review this problem again {reviewDueAt ? new Date(reviewDueAt).toLocaleDateString() : 'tomorrow'}.</p>
        <button type="button" onClick={revealSolution} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>Open full solution</button>
      </div>}

      {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">{error}</p>}
    </section>
  );
}
