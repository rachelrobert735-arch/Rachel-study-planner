import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Leaf, Pause, Play, RotateCcw, X } from 'lucide-react';
import './FocusTimer.css';

type Subject = 'Mathematics' | 'Physics' | 'Chemistry' | 'English' | 'General';
type Phase = 'idle' | 'running' | 'paused' | 'complete';

interface FocusTimerProps {
  onComplete: (minutes: number, subject: Subject) => void;
  onClose: () => void;
}

const subjects: Subject[] = ['Mathematics', 'Physics', 'Chemistry', 'English', 'General'];
const circumference = 2 * Math.PI * 108;

/** Completed sessions are recorded once. Unfinished sessions are intentionally not saved. */
export function FocusTimer({ onComplete, onClose }: FocusTimerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [preset, setPreset] = useState<'25' | '50' | 'custom'>('25');
  const [customMinutes, setCustomMinutes] = useState('30');
  const [subject, setSubject] = useState<Subject>('General');
  const [remainingMs, setRemainingMs] = useState(25 * 60_000);
  const [sessionMinutes, setSessionMinutes] = useState(25);
  const [pendingAction, setPendingAction] = useState<'close' | 'reset' | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const completeHeadingRef = useRef<HTMLHeadingElement>(null);
  const deadlineRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const sessionRef = useRef<{ minutes: number; subject: Subject }>({ minutes: 25, subject: 'General' });
  const completeCallbackRef = useRef(onComplete);
  const requestCloseRef = useRef<() => void>(() => {});
  completeCallbackRef.current = onComplete;

  const selectedMinutes = preset === 'custom' ? Number(customMinutes) : Number(preset);
  const validDuration = Number.isInteger(selectedMinutes) && selectedMinutes >= 1 && selectedMinutes <= 180;
  const hasSession = phase === 'running' || phase === 'paused';
  const shownMs = phase === 'idle' ? (validDuration ? selectedMinutes : 0) * 60_000 : remainingMs;
  const seconds = Math.max(0, Math.ceil(shownMs / 1_000));
  const minutesText = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondsText = String(seconds % 60).padStart(2, '0');
  const progress = phase === 'idle' ? 0 : Math.min(1, Math.max(0, 1 - remainingMs / (sessionMinutes * 60_000)));

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    deadlineRef.current = null;
    setRemainingMs(0);
    setPendingAction(null);
    setPhase('complete');
    const session = sessionRef.current;
    completeCallbackRef.current(session.minutes, session.subject);
  }, []);

  const requestClose = () => {
    if (pendingAction) {
      setPendingAction(null);
      window.requestAnimationFrame(() => modalRef.current?.querySelector<HTMLElement>('[data-session-action]')?.focus());
    } else if (hasSession) setPendingAction('close');
    else onClose();
  };
  requestCloseRef.current = requestClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const initialFocus = window.requestAnimationFrame(() => {
      modalRef.current?.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestCloseRef.current();
      }
      if (event.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusScope = modal.querySelector<HTMLElement>('[role="alertdialog"]') ?? modal;
      const focusable = Array.from(focusScope.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
      )).filter((element) => !element.matches(':disabled') && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        modal.focus();
      } else if (event.shiftKey && (document.activeElement === first || !focusScope.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !focusScope.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(initialFocus);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    // An absolute deadline keeps the clock correct when background tabs throttle intervals.
    const tick = () => {
      if (deadlineRef.current === null) return;
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0) finish();
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [phase, finish]);

  useEffect(() => {
    if (pendingAction) cancelRef.current?.focus();
  }, [pendingAction]);

  useEffect(() => {
    if (phase === 'complete') completeHeadingRef.current?.focus();
  }, [phase]);

  const start = () => {
    if (phase === 'paused') {
      deadlineRef.current = Date.now() + remainingMs;
      setPhase('running');
      return;
    }
    if (!validDuration) return;
    completedRef.current = false;
    sessionRef.current = { minutes: selectedMinutes, subject };
    setSessionMinutes(selectedMinutes);
    setRemainingMs(selectedMinutes * 60_000);
    deadlineRef.current = Date.now() + selectedMinutes * 60_000;
    setPhase('running');
  };

  const pause = () => {
    const remaining = Math.max(0, (deadlineRef.current ?? Date.now()) - Date.now());
    if (remaining === 0) {
      finish();
      return;
    }
    deadlineRef.current = null;
    setRemainingMs(remaining);
    setPhase('paused');
  };

  const reset = () => {
    deadlineRef.current = null;
    setPendingAction(null);
    setPhase('idle');
    setRemainingMs((validDuration ? selectedMinutes : 25) * 60_000);
    window.requestAnimationFrame(() => modalRef.current?.querySelector<HTMLElement>('[data-session-action]')?.focus());
  };

  const dismissPrompt = () => {
    setPendingAction(null);
    window.requestAnimationFrame(() => modalRef.current?.querySelector<HTMLElement>('[data-session-action]')?.focus());
  };

  return (
    <div className="focus-timer-backdrop" onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div ref={modalRef} className="focus-timer-modal" role="dialog" aria-modal="true" aria-labelledby="focus-timer-title" aria-describedby="focus-timer-description" tabIndex={-1}>
        <button className="focus-timer-close" type="button" aria-label="Close focus session" onClick={requestClose}><X size={20} /></button>
        <div className="focus-timer-eyebrow"><Leaf size={15} aria-hidden="true" /> A MOMENT TO GROW</div>
        {phase === 'complete' ? (
          <div className="focus-timer-complete">
            <div className="focus-timer-complete-icon"><Check size={32} aria-hidden="true" /></div>
            <h2 id="focus-timer-title" ref={completeHeadingRef} tabIndex={-1}>A little progress, made.</h2>
            <p id="focus-timer-description">{sessionMinutes} minutes of focus, just for your future self.</p>
            <div className="focus-timer-saved"><Check size={16} aria-hidden="true" /> {sessionRef.current.subject} session saved in Focus sessions</div>
            <p className="focus-timer-break-note">Stretch a little. Take a sip of water. You earned a break.</p>
            <button className="focus-timer-primary" type="button" onClick={onClose}>Back to my day</button>
            <button className="focus-timer-text-button" type="button" onClick={reset}>Start another session</button>
          </div>
        ) : (
          <>
            <h2 id="focus-timer-title">One thing at a time.</h2>
            <p id="focus-timer-description">A little focus goes a long way.</p>
            <label className="focus-timer-subject-label" htmlFor="focus-timer-subject">What are we working on?</label>
            <select id="focus-timer-subject" className="focus-timer-subject" value={subject} disabled={hasSession} onChange={(event) => setSubject(event.target.value as Subject)}>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <div className="focus-timer-clock">
              <svg viewBox="0 0 240 240" aria-hidden="true">
                <circle className="focus-timer-track" cx="120" cy="120" r="108" />
                <circle className="focus-timer-progress" cx="120" cy="120" r="108" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
              </svg>
              <div className="focus-timer-clock-content">
                <span className="focus-timer-time" role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`} aria-live="off">{minutesText}<span>:</span>{secondsText}</span>
                <span className="focus-timer-status" aria-live="polite">{phase === 'running' ? 'YOU’VE GOT THIS' : phase === 'paused' ? 'TAKE YOUR TIME' : 'MAKE A LITTLE SPACE'}</span>
              </div>
            </div>
            <fieldset className="focus-timer-durations" disabled={hasSession}>
              <legend className="focus-timer-sr-only">Session duration</legend>
              {(['25', '50', 'custom'] as const).map((item) => (
                <button key={item} type="button" className={preset === item ? 'is-selected' : ''} aria-pressed={preset === item} onClick={() => setPreset(item)}>{item === 'custom' ? 'Custom' : `${item} min`}</button>
              ))}
            </fieldset>
            {preset === 'custom' && (
              <div className="focus-timer-custom">
                <label htmlFor="focus-timer-minutes">Minutes</label>
                <input id="focus-timer-minutes" type="number" inputMode="numeric" min={1} max={180} step={1} value={customMinutes} disabled={hasSession} aria-invalid={!validDuration} aria-describedby="focus-timer-minutes-hint" onChange={(event) => setCustomMinutes(event.target.value)} />
                <span id="focus-timer-minutes-hint">Choose 1–180 minutes</span>
              </div>
            )}
            <div className="focus-timer-actions">
              <button className="focus-timer-primary" type="button" data-initial-focus data-session-action disabled={!validDuration} onClick={phase === 'running' ? pause : start}>
                {phase === 'running' ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                {phase === 'running' ? 'Pause session' : phase === 'paused' ? 'Keep going' : 'Let’s focus'}
              </button>
              {hasSession && <button className="focus-timer-reset" type="button" aria-label="Reset focus session" onClick={() => setPendingAction('reset')}><RotateCcw size={18} /></button>}
            </div>
            <p className="focus-timer-footnote">Completed sessions are saved in Focus sessions.<br />Closing or reloading ends an unfinished session.</p>
          </>
        )}
        {pendingAction && (
          <div className="focus-timer-confirm" role="alertdialog" aria-modal="true" aria-labelledby="focus-timer-confirm-title" aria-describedby="focus-timer-confirm-description">
            <h3 id="focus-timer-confirm-title">{pendingAction === 'close' ? 'Leave this session?' : 'Start fresh?'}</h3>
            <p id="focus-timer-confirm-description">This unfinished session won’t be saved in Focus sessions.</p>
            <div>
              <button ref={cancelRef} type="button" className="focus-timer-primary" onClick={dismissPrompt}>Keep my session</button>
              <button type="button" className="focus-timer-text-button" onClick={() => {
                if (pendingAction === 'close') { deadlineRef.current = null; onClose(); }
                else reset();
              }}>{pendingAction === 'close' ? 'End session' : 'Reset timer'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
