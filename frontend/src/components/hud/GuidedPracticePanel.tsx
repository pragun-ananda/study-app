import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchInterviewLearningPath,
  fetchInterviewLearningAttempts,
  recordInterviewLearningEvent,
  startInterviewLearningAttempt
} from '../../api/client';
import { InterviewLearningAttempt, InterviewLearningPath } from '../../types/telemetry';

interface GuidedPracticePanelProps {
  problemId: string;
  isLight: boolean;
  onAttemptStarted: () => void;
  onRevealSolution: () => void;
}

type Mode = 'intro' | 'diagnostics' | 'stages' | 'transfer' | 'complete';

export default function GuidedPracticePanel({ problemId, isLight, onAttemptStarted, onRevealSolution }: GuidedPracticePanelProps) {
  const [path, setPath] = useState<InterviewLearningPath | null>(null);
  const [attempt, setAttempt] = useState<InterviewLearningAttempt | null>(null);
  const [mode, setMode] = useState<Mode>('intro');
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [saved, setSaved] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});
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
    setDiagnostics({});
    setReviewDueAt(null);
    setError(null);
    fetchInterviewLearningPath(problemId)
      .then((result) => { if (!cancelled) setPath(result); })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the guided learning path.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [problemId]);

  const currentStage = useMemo(() => path?.reasoningStages[index], [path, index]);

  const begin = async () => {
    if (!path) return;
    setBusy(true);
    setError(null);
    try {
      const started = await startInterviewLearningAttempt(problemId);
      setAttempt(started);
      onAttemptStarted();
      setMode('diagnostics');
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
      setDiagnostics((previous) => ({ ...previous, [concept.id]: response.trim() }));
      setResponse('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this response.');
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

  if (loading) return <div className={`p-6 text-sm ${secondaryClass}`} role="status">Loading guided practice…</div>;
  if (!path) return <div className={`m-5 rounded-xl border p-5 ${cardClass}`} role="alert">{error || 'A reviewed pilot learning path is not available for this question yet.'}</div>;

  return (
    <section className="space-y-4 p-5" data-testid="guided-practice-panel" aria-label="Guided practice">
      <header className={`rounded-xl border p-4 ${cardClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-500">Guided practice · pilot v{path.version}</div>
            <p className="mt-2 text-sm leading-relaxed">{path.interpretation.goal}</p>
          </div>
          <span className={`rounded border px-2 py-1 text-[10px] font-mono ${secondaryClass}`}>{path.publicationStatus}</span>
        </div>
        {mode === 'intro' && (
          <>
            <ul className={`mt-3 list-disc space-y-1 pl-5 text-xs ${secondaryClass}`}>
              {path.interpretation.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}
            </ul>
            <button type="button" onClick={begin} disabled={busy} className={`mt-4 rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>
              {busy ? 'Starting…' : 'Start an attempt'}
            </button>
          </>
        )}
      </header>

      {mode === 'diagnostics' && path.concepts[index] && (() => {
        const concept = path.concepts[index];
        return <div className={`rounded-xl border p-4 ${cardClass}`}>
          <div className={`text-[10px] font-mono uppercase tracking-widest ${secondaryClass}`}>Prerequisite check {index + 1} of {path.concepts.length}</div>
          <h3 className="mt-2 text-sm font-bold">{concept.name}</h3>
          <p className={`mt-1 text-xs ${secondaryClass}`}>{concept.intuition}</p>
          <p className="mt-3 text-sm font-medium">{concept.diagnosticQuestion}</p>
          <textarea value={response} onChange={(event) => setResponse(event.target.value)} disabled={saved} rows={3} className={`mt-3 w-full rounded-lg border p-3 text-xs ${isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-700 bg-slate-900'}`} aria-label={`Response for ${concept.name}`} />
          {saved ? <div className="mt-3 space-y-2">
            <p className={`text-xs ${secondaryClass}`}>Self-check: {concept.diagnosticSuccessCriteria}</p>
            <button type="button" onClick={continueDiagnostic} className={`rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>{index + 1 === path.concepts.length ? 'Continue to reasoning' : 'Next concept'}</button>
          </div> : <button type="button" onClick={saveDiagnostic} disabled={busy || !response.trim()} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${buttonClass}`}>Save my response</button>}
        </div>;
      })()}

      {mode === 'stages' && currentStage && <div className={`rounded-xl border p-4 ${cardClass}`}>
        <div className={`text-[10px] font-mono uppercase tracking-widest ${secondaryClass}`}>Reasoning stage {index + 1} of {path.reasoningStages.length}</div>
        <h3 className="mt-2 text-sm font-bold">{currentStage.title}</h3>
        <p className={`mt-1 text-xs ${secondaryClass}`}>{currentStage.purpose}</p>
        <p className="mt-4 text-sm font-medium">{currentStage.learnerPrompt}</p>
        <textarea value={response} onChange={(event) => setResponse(event.target.value)} disabled={saved} rows={4} className={`mt-3 w-full rounded-lg border p-3 text-xs ${isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-700 bg-slate-900'}`} aria-label={`Your reasoning for ${currentStage.title}`} />
        {!hintRevealed && <button type="button" onClick={revealHint} disabled={busy} className={`mt-3 rounded-lg border px-3 py-2 text-xs ${buttonClass}`}>Show a hint for this step</button>}
        {hintRevealed && <p className={`mt-3 rounded-lg border p-3 text-xs ${isLight ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`} data-testid="guided-hint">{currentStage.hint}</p>}
        {saved ? <div className="mt-4 space-y-3">
          <div className={`rounded-lg border p-3 ${isLight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
            <div className="text-xs font-bold">Check your reasoning</div>
            <ul className={`mt-2 list-disc space-y-1 pl-4 text-xs ${secondaryClass}`}>{currentStage.verificationCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
          </div>
          <button type="button" onClick={verifyStage} disabled={busy} className={`rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>I checked these criteria · continue</button>
        </div> : <button type="button" onClick={saveStageResponse} disabled={busy || !response.trim()} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${buttonClass}`}>Save reflection</button>}
        <div className="mt-5 border-t border-slate-700/30 pt-3">
          <button type="button" onClick={revealSolution} className={`text-xs underline underline-offset-2 ${secondaryClass}`}>Reveal the canonical solution</button>
        </div>
      </div>}

      {mode === 'transfer' && <div className={`rounded-xl border p-4 ${cardClass}`}>
        <div className={`text-[10px] font-mono uppercase tracking-widest ${secondaryClass}`}>Transfer exercise</div>
        <p className="mt-2 text-sm font-medium">{path.transferExercise.prompt}</p>
        <p className={`mt-2 text-xs ${secondaryClass}`}>{path.transferExercise.changedConstraint}</p>
        <textarea value={response} onChange={(event) => setResponse(event.target.value)} disabled={saved} rows={5} className={`mt-3 w-full rounded-lg border p-3 text-xs ${isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-700 bg-slate-900'}`} aria-label="Transfer exercise response" />
        {saved ? <div className="mt-3 space-y-3">
          <p className={`text-xs ${secondaryClass}`}>Self-check: {path.transferExercise.assessmentCriteria.join(' ')}</p>
          <label className={`block text-xs ${secondaryClass}`}>How confident are you that you could solve a similar variant without help? {confidence}/5
            <input aria-label="Confidence" type="range" min={1} max={5} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} className="mt-2 block w-full" />
          </label>
          <button type="button" onClick={finish} disabled={busy} className={`rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>Finish and schedule a revisit</button>
        </div> : <button type="button" onClick={saveTransfer} disabled={busy || !response.trim()} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${buttonClass}`}>Save transfer response</button>}
        <p className={`mt-3 text-[10px] ${secondaryClass}`}>This pilot stores your response and self-check only; it does not automatically grade transfer performance.</p>
      </div>}

      {mode === 'complete' && <div className={`rounded-xl border p-4 ${cardClass}`}>
        <h3 className="text-sm font-bold">Attempt recorded</h3>
        <p className={`mt-2 text-xs ${secondaryClass}`}>Your revisit is scheduled for {reviewDueAt ? new Date(reviewDueAt).toLocaleDateString() : 'tomorrow'}. This is a reminder, not a mastery score.</p>
        <button type="button" onClick={revealSolution} className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${buttonClass}`}>Review the canonical solution</button>
      </div>}

      {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">{error}</p>}
      {attempt && mode !== 'intro' && mode !== 'complete' && <div className={`text-right text-[10px] font-mono ${secondaryClass}`}>Attempt {attempt.id} · content v{attempt.pathVersion}</div>}
    </section>
  );
}
