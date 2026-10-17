import { useEffect, useMemo, useRef, useState } from 'react';
import Board from '../components/Board';
import { generateMatch, ROUNDS } from '../game/levels';
import { HESITATION_MS, firstMoments, hesitations, isEarlier, replayAt, totalScore, type Moment } from '../game/engine';
import type { Run } from '../game/types';
import { fmt, fmtShort } from '../format';

interface Props {
  a: Run;
  b: Run;
  onBack: () => void;
}

const TAIL_MS = 900;

function describe(m: Moment | null) {
  return m ? `percurso ${m.round + 1}, ${fmtShort(m.t)}` : '';
}

export default function Replay({ a, b, onBack }: Props) {
  const levels = useMemo(() => generateMatch(a.seed), [a.seed]);
  const [round, setRound] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const last = useRef(0);

  const level = levels[round];
  const ra = a.rounds[round];
  const rb = b.rounds[round];
  const duration = Math.max(ra?.timeMs ?? 0, rb?.timeMs ?? 0) + TAIL_MS;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    last.current = performance.now();
    const loop = (now: number) => {
      const dt = (now - last.current) * speed;
      last.current = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          if (round + 1 < ROUNDS) {
            setRound(round + 1);
            return 0;
          }
          setPlaying(false);
          return duration;
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, duration, round]);

  const sa = replayAt(level, ra, t);
  const sb = replayAt(level, rb, t);
  const fa = firstMoments(a.rounds);
  const fb = firstMoments(b.rounds);
  const nameA = a.name || 'Você';
  const nameB = b.name || 'Fantasma';

  const verdict = (ma: Moment | null, mb: Moment | null, verb: string) => {
    if (!ma && !mb) return `Ninguém ${verb}.`;
    if (isEarlier(ma, mb)) return `${nameA} ${verb} primeiro (${describe(ma)})`;
    return `${nameB} ${verb} primeiro (${describe(mb)})`;
  };

  const goRound = (i: number) => {
    setRound(i);
    setT(0);
    setPlaying(true);
  };

  const side = (run: Run, s: ReturnType<typeof replayAt>, color: 'cyan' | 'magenta') => {
    const r = run.rounds[round];
    const showErr = s.lastError && t - s.lastError.t < 450 ? { cell: s.lastError.cell, n: s.errors } : null;
    const hesitating = !s.done && t > 0 && s.idleMs > HESITATION_MS && t < (r?.timeMs ?? 0);
    return (
      <div className={`replay-side ${color}`}>
        <div className="replay-name">
          <b>{run.name || (color === 'cyan' ? 'Você' : 'Fantasma')}</b>
          <span>{fmt(totalScore(run.rounds))}</span>
        </div>
        <Board
          level={level}
          mode="replay"
          progress={s.progress}
          quarterTurns={s.quarterTurns}
          errorFlash={showErr}
          hesitating={hesitating}
          playerColor={color}
          className="mini"
        />
        <div className="replay-stats">
          {s.done ? `✓ ${fmtShort(r?.timeMs ?? 0)}` : r?.completed === false && t >= (r?.timeMs ?? 0) ? '⏱ esgotou' : `${fmtShort(t)}`}
          {s.errors > 0 && <span className="bad"> · ✖ {s.errors}</span>}
        </div>
        <Timeline run={run} round={round} duration={duration} t={t} />
      </div>
    );
  };

  return (
    <div className="screen replay">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">
          ←
        </button>
        <h2>Rastros lado a lado</h2>
        <span />
      </header>

      <div className="verdicts">
        <p>
          <i className="dot-err" /> {verdict(fa.error, fb.error, 'errou')}
        </p>
        <p>
          <i className="dot-hes" /> {verdict(fa.hesitation, fb.hesitation, 'hesitou')}
        </p>
      </div>

      <div className="round-chips">
        {levels.map((_, i) => (
          <button key={i} className={`chip ${i === round ? 'on' : ''}`} onClick={() => goRound(i)}>
            {i + 1}
          </button>
        ))}
      </div>

      <div className="replay-grid">
        {side(a, sa, 'cyan')}
        {side(b, sb, 'magenta')}
      </div>

      <div className="replay-controls">
        <button
          className="btn ghost"
          onClick={() => {
            if (!playing && round === ROUNDS - 1 && t >= duration) goRound(0);
            else setPlaying(!playing);
          }}
        >
          {playing ? '❚❚ Pausar' : '▶ Assistir'}
        </button>
        <button className="btn ghost" onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 0.5 : 1)}>
          {speed}x
        </button>
        <button className="btn ghost" onClick={() => goRound(0)}>
          ↺ Do início
        </button>
      </div>
    </div>
  );
}

function Timeline({ run, round, duration, t }: { run: Run; round: number; duration: number; t: number }) {
  const r = run.rounds[round];
  const pct = (ms: number) => `${Math.min(100, (ms / duration) * 100)}%`;
  return (
    <div className="timeline">
      <div className="tl-fill" style={{ width: pct(Math.min(t, r?.timeMs ?? 0)) }} />
      {r?.events.filter((e) => e.error).map((e, i) => <i key={`e${i}`} className="tl-err" style={{ left: pct(e.t) }} />)}
      {hesitations(r).map((h, i) => (
        <i key={`h${i}`} className="tl-hes" style={{ left: pct(h) }} />
      ))}
      <div className="tl-head" style={{ left: pct(t) }} />
    </div>
  );
}
