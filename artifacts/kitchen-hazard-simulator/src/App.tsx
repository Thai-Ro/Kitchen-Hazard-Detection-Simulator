import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, Check, ChevronRight,
  CircleHelp, Clock3, Eye, Footprints, Lightbulb, MousePointer2,
  RotateCcw, ShieldAlert, Sparkles, Target, X, Zap,
} from 'lucide-react';
import KitchenScene from './KitchenScene';
import { createRun, zones } from './gameData';
import './app.css';

type Run = ReturnType<typeof createRun>;
type Screen = 'briefing' | 'playing' | 'results';
type Feedback = { kind: 'wrong' | 'right'; message: string } | null;

const zoneBrief = [
  'Range, oven & hot work',
  'Water, chemicals & floor',
  'Tools & open food',
  'Shelves, loads & access',
  'Cold storage & threshold',
  'Powered equipment',
];
const getTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const shuffle = <T,>(items: T[]) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

function App() {
  const [screen, setScreen] = useState<Screen>('briefing');
  const [run, setRun] = useState<Run>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [step, setStep] = useState<'identify' | 'correct' | 'complete'>('identify');
  const [fixChoices, setFixChoices] = useState<string[]>([]);
  const [identifyChoices, setIdentifyChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintUsed, setHintUsed] = useState<string[]>([]);
  const [wrongByZone, setWrongByZone] = useState<Record<string, number>>({});
  const [retries, setRetries] = useState(0);
  const [hints, setHints] = useState(0);
  const [score, setScore] = useState(0);
  const [startAt, setStartAt] = useState(0);
  const [now, setNow] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileKeys, setMobileKeys] = useState<string[]>([]);

  const active = run.find((item) => item.zone.id === activeZone);
  const elapsed = screen === 'briefing' ? 0 : Math.max(0, Math.floor(((screen === 'results' ? now : Date.now()) - startAt) / 1000));
  const bonus = Math.max(0, 20 - Math.floor(elapsed / 90));
  const finalScore = Math.max(0, score + (screen === 'results' ? bonus : 0));
  const accuracy = completed.length ? Math.round((completed.filter((id) => !wrongByZone[id]).length / completed.length) * 100) : 0;

  useEffect(() => {
    if (screen !== 'playing') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [screen]);

  const startRun = () => {
    const fresh = createRun();
    setRun(fresh);
    setCompleted([]);
    setActiveZone(null);
    setStep('identify');
    setFeedback(null);
    setHintVisible(false);
    setHintUsed([]);
    setWrongByZone({});
    setRetries(0);
    setHints(0);
    setScore(0);
    const start = Date.now();
    setStartAt(start);
    setNow(start);
    setScreen('playing');
  };

  const openZone = (zoneId: string) => {
    const item = run.find((entry) => entry.zone.id === zoneId);
    if (!item || completed.includes(zoneId) || screen !== 'playing') return;
    if (document.pointerLockElement) document.exitPointerLock();
    setActiveZone(zoneId);
    setStep('identify');
    setFeedback(null);
    setHintVisible(false);
    setFixChoices(shuffle([item.hazard.correct, item.hazard.unsafe]));
    const alternatives = [...new Set(zones.flatMap((zone) => zone.hazards.map((hazard) => hazard.name)))]
      .filter((name) => name !== item.hazard.name);
    setIdentifyChoices(shuffle([item.hazard.name, ...shuffle(alternatives).slice(0, 2)]));
  };

  const recordWrong = (message: string) => {
    if (!activeZone) return;
    setRetries((value) => value + 1);
    setWrongByZone((value) => ({ ...value, [activeZone]: (value[activeZone] ?? 0) + 1 }));
    setScore((value) => Math.max(0, value - 10));
    setFeedback({ kind: 'wrong', message });
  };

  const chooseHazard = (hazardName: string) => {
    if (!active) return;
    if (hazardName === active.hazard.name) {
      setStep('correct');
      setFeedback(null);
    } else {
      recordWrong('Not quite. Recheck the condition you can see at this station, then make another selection.');
    }
  };

  const chooseFix = (choice: string) => {
    if (!active) return;
    if (choice !== active.hazard.correct) {
      recordWrong(active.hazard.riskExplanation);
      return;
    }
    const isLast = completed.length === 5;
    setCompleted((value) => [...value, active.zone.id]);
    setScore((value) => value + 100);
    setFeedback({ kind: 'right', message: active.hazard.lesson });
    setStep('complete');
    if (isLast) {
      window.setTimeout(() => {
        setNow(Date.now());
        setActiveZone(null);
        setScreen('results');
      }, 2100);
    }
  };

  const useHint = () => {
    if (!active || hintUsed.includes(active.zone.id)) {
      setHintVisible(true);
      return;
    }
    setHintUsed((value) => [...value, active.zone.id]);
    setHints((value) => value + 1);
    setScore((value) => Math.max(0, value - 8));
    setHintVisible(true);
  };

  const closeInspect = () => {
    if (step === 'complete' && completed.length === 6) return;
    setActiveZone(null);
    setFeedback(null);
  };

  const toggleMobileKey = (key: string, down: boolean) => {
    setMobileKeys((current) => down
      ? current.includes(key) ? current : [...current, key]
      : current.filter((item) => item !== key));
  };

  const activeStepNum = step === 'identify' ? '01' : step === 'correct' ? '02' : '03';
  const scorePotential = useMemo(() => Math.min(620, 600 + 20), []);

  return (
    <main className="app-shell grain">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span className="brand-mark-inner" /></div>
          <div><div className="brand-name">SHIFT / SAFE</div><div className="brand-caption">KITCHEN HAZARD SIMULATOR</div></div>
        </div>
        <div className="topbar-center">
          <span className="status-led" />
          <span>{screen === 'briefing' ? 'TRAINING FLOOR · READY' : screen === 'playing' ? 'LIVE SHIFT · WALKTHROUGH' : 'SHIFT COMPLETE · DEBRIEF'}</span>
        </div>
        <div className="topbar-right">
          {screen === 'playing' && <span className="run-id">ROUND 01 <i>—</i> {String(completed.length).padStart(2, '0')} / 06 SAFE</span>}
          <span className="offline-tag"><span /> LOCAL SESSION</span>
        </div>
      </header>

      {screen === 'briefing' && (
        <section className="briefing page-in" aria-labelledby="brief-title">
          <div className="brief-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> PRE-SHIFT BRIEFING <span className="brief-index">01 / 03</span></div>
            <h1 id="brief-title">A safer shift<br />starts with <em>a scan.</em></h1>
            <p className="brief-intro">Step onto the line. Look closely at the work around you. Spot what could hurt someone—and make the safer call.</p>
            <div className="brief-meta">
              <div><span className="meta-label">YOUR OBJECTIVE</span><strong>Find &amp; fix six hazards</strong></div>
              <div><span className="meta-label">EST. WALKTHROUGH</span><strong>About 5 minutes</strong></div>
            </div>
            <button className="start-button" onClick={startRun} data-testid="button-start-shift">
              <span>Start the walkthrough</span><span className="start-icon"><ChevronRight size={19} /></span>
            </button>
            <div className="brief-note"><ShieldAlert size={15} /> Practice scenario · no certification or compliance claims</div>
          </div>
          <div className="brief-visual" aria-hidden="true">
            <div className="visual-topline"><span>LINE WALK / SIM 001</span><span>06 AREAS · 06 CHECKS</span></div>
            <div className="kitchen-sketch">
              <div className="sketch-ceiling"><span /><span /><span /></div>
              <div className="sketch-wall">
                <div className="sketch-canopy" />
                <div className="sketch-shelf"><i /><i /><i /><i /><i /></div>
                <div className="sketch-hob"><b /><b /><b /></div>
                <div className="sketch-counter" />
                <div className="sketch-cupboard"><i /><i /><i /><i /></div>
                <div className="sketch-fridge"><i /><i /></div>
                <div className="sketch-sink"><i /></div>
              </div>
              <div className="sketch-floor"><div className="floor-lines" /><span className="floor-marker">YOU ARE HERE</span></div>
              <span className="hazard-ping ping-one" /><span className="hazard-ping ping-two" /><span className="hazard-ping ping-three" />
            </div>
            <div className="visual-caption"><span><i className="caption-dot" /> COMMERCIAL KITCHEN · SHIFT 07:12</span><span>FIG. 01</span></div>
            <div className="visual-legend"><span><i className="legend-risk" /> Unchecked area</span><span><i className="legend-ready" /> Your next move</span></div>
          </div>
          <div className="zones-brief">
            <div className="zone-brief-heading"><span className="eyebrow-line" /> SIX STATIONS TO CHECK</div>
            <div className="zone-brief-grid">
              {zones.map((zone, index) => (
                <div className="zone-brief-item" key={zone.id} data-testid={`brief-zone-${zone.id}`}>
                  <span className="zone-num">{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{zone.name}</strong><small>{zoneBrief[index]}</small></div>
                  <span className="zone-arrow">↗</span>
                </div>
              ))}
            </div>
          </div>
          <footer className="page-footer"><span>FIELD GUIDE <b>01—06</b></span><span>OBSERVE FIRST. ACT SAFELY.</span><span>BUILT FOR THE LINE <b>©</b></span></footer>
        </section>
      )}

      {screen === 'playing' && (
        <section className="game-layout page-in" aria-label="Kitchen hazard walkthrough">
          <div className="game-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" /> ON THE FLOOR <span className="brief-index">ROUND 01</span></div><h1>Walk the line.</h1></div>
            <div className="game-heading-actions">
              <div className="stat-pill"><Clock3 size={15} /><span>TIME</span><strong>{getTime(elapsed)}</strong></div>
              <div className="stat-pill score-pill"><Target size={15} /><span>SCORE</span><strong>{score.toString().padStart(3, '0')}</strong></div>
              <button className="icon-button help-button" aria-label="Show controls" onClick={() => setHelpOpen((open) => !open)} data-testid="button-controls-help"><CircleHelp size={18} /></button>
            </div>
          </div>
          {helpOpen && <div className="controls-popover" role="dialog" aria-label="Controls guide">
            <button className="popover-close" onClick={() => setHelpOpen(false)} aria-label="Close controls"><X size={15} /></button>
            <strong>Move through the room</strong>
            <p><b>W A S D</b> or arrow keys to walk · click and drag to look · click a glowing marker or press <b>E</b> nearby.</p>
            <p>Pointer lock is optional. Press <b>Esc</b> or use the release button to free your mouse.</p>
          </div>}
          <div className="game-content">
            <aside className="checklist">
              <div className="panel-kicker">SHIFT CHECKLIST <span>{completed.length}/06</span></div>
              <div className="progress-track"><div style={{ width: `${completed.length / 6 * 100}%` }} /></div>
              <div className="checklist-items">
                {run.map(({ zone }, index) => {
                  const isDone = completed.includes(zone.id);
                  const isNear = zone.id === activeZone;
                  return <div key={zone.id} className={`check-row ${isDone ? 'is-done' : ''} ${isNear ? 'is-current' : ''}`} data-testid={`check-zone-${zone.id}`}>
                    <span className="check-num">{isDone ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span>
                    <span className="check-name">{zone.name}<small>{isDone ? 'CORRECTED' : isNear ? 'IN RANGE' : 'NOT CHECKED'}</small></span>
                    <span className="check-state">{isDone ? <BadgeCheck size={16} /> : <span />}</span>
                  </div>;
                })}
              </div>
              <div className="score-note"><Zap size={14} /><span>Careful choices count.<br /><b>Speed is secondary.</b></span></div>
            </aside>

            <div className="viewport-column">
              <div className="scene-frame">
                <KitchenScene
                  targets={run.map(({ zone, hazard }) => ({ zone, hazard, complete: completed.includes(zone.id) }))}
                  onInspect={openZone}
                  mobileKeys={mobileKeys}
                />
                <div className="view-label"><span>FIRST PERSON</span><span>03D / LIVE</span></div>
              </div>
              <div className="viewport-foot">
                <div className="walk-legend"><Footprints size={14} /> Walk close to inspect a station</div>
                <div className="desktop-controls"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>MOVE</span><i /> <MousePointer2 size={14} /><span>LOOK</span></div>
              </div>
              <div className="touch-controls" aria-label="Touch movement controls">
                <div className="touch-pad">
                  <button aria-label="Move forward" onPointerDown={() => toggleMobileKey('forward', true)} onPointerUp={() => toggleMobileKey('forward', false)} onPointerLeave={() => toggleMobileKey('forward', false)}><ArrowUp /></button>
                  <div><button aria-label="Move left" onPointerDown={() => toggleMobileKey('left', true)} onPointerUp={() => toggleMobileKey('left', false)} onPointerLeave={() => toggleMobileKey('left', false)}><ArrowLeft /></button><button aria-label="Move backward" onPointerDown={() => toggleMobileKey('back', true)} onPointerUp={() => toggleMobileKey('back', false)} onPointerLeave={() => toggleMobileKey('back', false)}><ArrowDown /></button><button aria-label="Move right" onPointerDown={() => toggleMobileKey('right', true)} onPointerUp={() => toggleMobileKey('right', false)} onPointerLeave={() => toggleMobileKey('right', false)}><ArrowRight /></button></div>
                </div>
                <span>DRAG TO LOOK</span>
              </div>
            </div>

            <aside className="field-notes">
              <div className="panel-kicker">FIELD NOTES <span><i className="live-dot" /> LIVE</span></div>
              {active ? (
                <div className="inspection-panel fade-up" key={active.zone.id}>
                  <div className="inspect-topline"><span>STATION {active.zone.short}</span><button className="icon-button close-inspect" aria-label="Close inspection" onClick={closeInspect} data-testid="button-close-inspection"><X size={17} /></button></div>
                  <h2>{active.zone.name}</h2>
                  {step !== 'complete' && <div className="step-line"><span className={step === 'identify' ? 'active' : 'passed'}>{step === 'identify' ? '01' : <Check size={12} />}</span><i className={step === 'correct' ? 'passed' : ''} /><span className={step === 'correct' ? 'active' : ''}>02</span><small>{step === 'identify' ? 'IDENTIFY' : 'CORRECT'}</small></div>}
                  {step === 'identify' && <>
                    <div className="prompt-block"><span className="prompt-label">LOOK CLOSELY</span><h3>What needs attention here?</h3><p>Choose the condition you noticed in this work area.</p></div>
                    <div className="answer-list">
                      {identifyChoices.map((choice, index) => <button className="answer-option" key={choice} onClick={() => chooseHazard(choice)} data-testid={`answer-identify-${index}`}>
                        <span className="answer-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span><ChevronRight size={15} />
                      </button>)}
                    </div>
                  </>}
                  {step === 'correct' && <>
                    <div className="prompt-block"><span className="prompt-label">HAZARD IDENTIFIED</span><h3>{active.hazard.name}</h3><p>{active.hazard.description}</p></div>
                    <div className="question-divider"><span>WHAT'S THE SAFER RESPONSE?</span></div>
                    <div className="answer-list">
                      {fixChoices.map((choice, index) => <button className="answer-option fix-option" key={choice} onClick={() => chooseFix(choice)} data-testid={`answer-fix-${index}`}>
                        <span className="answer-key">{String.fromCharCode(65 + index)}</span><span>{choice}</span><ChevronRight size={15} />
                      </button>)}
                    </div>
                  </>}
                  {step === 'complete' && <>
                    <div className="correct-badge"><BadgeCheck size={20} /><span>CONDITION CORRECTED</span></div>
                    <div className="lesson-card"><span className="prompt-label">TAKE THIS WITH YOU</span><p>{active.hazard.lesson}</p></div>
                    {completed.length < 6 && <button className="next-button" onClick={closeInspect} data-testid="button-continue-walk">Back to the walk <ChevronRight size={16} /></button>}
                  </>}
                  {feedback?.kind === 'wrong' && <div className="feedback wrong-feedback" role="status"><span className="feedback-mark"><X size={14} /></span><p>{feedback.message}</p></div>}
                  {step !== 'complete' && <>
                    {hintVisible && <div className="hint-card" role="status"><Lightbulb size={15} /><p>{active.hazard.clue}</p></div>}
                    <button className={`hint-button ${hintUsed.includes(active.zone.id) ? 'hint-used' : ''}`} onClick={useHint} disabled={hintVisible} data-testid="button-hint">
                      <Lightbulb size={15} /> {hintVisible ? 'Hint revealed' : 'Need a nudge?'} <span>{hintUsed.includes(active.zone.id) ? 'USED · −8 PTS' : '−8 PTS'}</span>
                    </button>
                  </>}
                  <div className="inspect-footer"><span>{activeStepNum} / 03</span><span>SAFE WORK STARTS WITH YOU</span></div>
                </div>
              ) : <>
                <div className="notes-empty">
                  <div className="notes-orbit"><Eye size={25} /><span className="orbit-dot" /></div>
                  <span className="prompt-label">OBSERVE THE ROOM</span>
                  <h2>Nothing flagged.<br /><em>For now.</em></h2>
                  <p>Walk the aisle and inspect each station. A marker appears when you’re close enough.</p>
                  <div className="scan-rule"><span /><i>SCAN · MOVE · INSPECT</i><span /></div>
                </div>
                <div className="notes-bottom"><span>NO HAZARD LABELS IN ADVANCE</span><span>TRUST YOUR EYES</span></div>
              </>}
            </aside>
          </div>
          <div className="game-footer"><span>SHIFT / SAFE <b>—</b> TRAINING SIMULATOR</span><span>LOCAL SESSION · PROGRESS IS NOT SAVED</span><button onClick={() => setHelpOpen((value) => !value)} data-testid="button-help-footer"><CircleHelp size={13} /> CONTROLS</button></div>
        </section>
      )}

      {screen === 'results' && (
        <section className="results page-in" aria-labelledby="results-title">
          <div className="results-topline"><span className="eyebrow"><span className="eyebrow-line" /> END OF ROUND <span className="brief-index">03 / 03</span></span><span className="offline-tag"><span /> SESSION COMPLETE</span></div>
          <div className="results-head">
            <div><h1 id="results-title">Good shift.<br /><em>Keep that scan.</em></h1><p>You found a safer response for every station. Here’s what to carry into your next shift.</p></div>
            <div className="final-score"><span>SHIFT SCORE</span><strong>{finalScore}<small> / {scorePotential}</small></strong><div><Sparkles size={13} /> ACCURACY OVER SPEED</div></div>
          </div>
          <div className="result-metrics">
            <div className="metric-block"><span><Target size={15} /> ACCURACY</span><strong>{accuracy}<small>%</small></strong><i>{completed.filter((id) => !wrongByZone[id]).length} of 6 first try</i></div>
            <div className="metric-block"><span><Clock3 size={15} /> WALKTHROUGH</span><strong>{getTime(elapsed)}</strong><i>Time bonus capped at 20</i></div>
            <div className="metric-block"><span><RotateCcw size={15} /> RETRIES</span><strong>{retries.toString().padStart(2, '0')}</strong><i>{hints} hint{hints === 1 ? '' : 's'} used · {hints * 8} points</i></div>
          </div>
          <div className="recap-heading"><div><span className="eyebrow-line" /> SHIFT RECAP</div><span>THE CONDITION · THE SAFER RESPONSE</span></div>
          <div className="recap-list">
            {run.map(({ zone, hazard }, index) => <article className="recap-row" key={zone.id} data-testid={`recap-${zone.id}`}>
              <span className="recap-num">{String(index + 1).padStart(2, '0')}</span>
              <div className="recap-zone"><span>{zone.name}</span><small>{hazard.name}</small></div>
              <p>{hazard.lesson}</p>
              <div className="recap-result"><Check size={15} /> CORRECTED</div>
            </article>)}
          </div>
          <div className="results-bottom">
            <div className="closing-note"><BadgeCheck size={18} /><span><strong>Good eyes make a difference.</strong><small>Every shift is safer when we notice the small things.</small></span></div>
            <button className="start-button replay-button" onClick={startRun} data-testid="button-replay"><span>Run another shift</span><span className="start-icon"><RotateCcw size={17} /></span></button>
          </div>
          <footer className="page-footer"><span>FIELD GUIDE <b>03—03</b></span><span>OBSERVE FIRST. ACT SAFELY.</span><span>NO HISTORY STORED <b>©</b></span></footer>
        </section>
      )}
    </main>
  );
}

export default App;
