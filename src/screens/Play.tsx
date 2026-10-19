import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Board, { type BoardMode } from '../components/Board';
import { generateMatch, ROUNDS } from '../game/levels';
import {
  ERROR_PENALTY_MS,
  RoundEngine,
  TIMEOUT_MS,
  replayAt,
  roundScore,
  totalScore,
} from '../game/engine';
import type { RoundResult, Run } from '../game/types';
import { sfx } from '../services/feedback';
import { fmt } from '../format';

type Phase = 'intro' | BoardMode;

interface Props {
  seed: number;
  name: string;
  ghost?: Run | null;
  onFinish: (run: Run) => void;
  onQuit: () => void;
}

const INTRO_MS = 750;
const HIDE_MS = 650;
const DONE_MS = 850;
const FAIL_MS = 1500;

export default function Play({ seed, name, ghost, onFinish, onQuit }: Props) {
  const levels = useMemo(() => generateMatch(seed), [seed]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [, setVersion] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [msg, setMsg] = useState('');
  const [flash, setFlash] = useState<{ cell: number; n: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);

  const level = levels[round];
  const engine = useRef(new RoundEngine(level));
  const results = useRef<RoundResult[]>([]);
  const playStart = useRef(0);
  const lockedUntil = useRef(0);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const bump = () => setVersion((v) => v + 1);

  const finishRound = useCallback(
    (timedOut: boolean) => {
      results.current[round] = engine.current.result(timedOut);
      if (timedOut) {
        sfx.error();
        setMsg('Tempo esgotado! +5s');
        setPhase('fail');
      } else {
        sfx.roundDone();
        setToast({ text: fmt(roundScore(results.current[round])), n: round });
        setPhase('done');
      }
    },
    [round],
  );

  // Phase timeline for each route.
  useEffect(() => {
    let timer: number | undefined;
    if (phase === 'intro') {
      engine.current = new RoundEngine(level);
      setMsg('');
      setFlash(null);
      timer = window.setTimeout(() => setPhase('preview'), INTRO_MS);
    } else if (phase === 'preview') {
      setMsg('Memorize o caminho!');
      timer = window.setTimeout(() => {
        sfx.hide();
        setPhase('hide');
      }, level.previewMs);
    } else if (phase === 'hide') {
      timer = window.setTimeout(() => {
        playStart.current = performance.now();
        setMsg('Deslize a partir da entrada ▶');
        setPhase('play');
      }, HIDE_MS);
    } else if (phase === 'done' || phase === 'fail') {
      timer = window.setTimeout(
        () => {
          if (round + 1 >= ROUNDS) {
            sfx.win();
            onFinish({ seed, name, rounds: results.current.slice() });
          } else {
            setRound(round + 1);
            setPhase('intro');
          }
        },
        phase === 'done' ? DONE_MS : FAIL_MS,
      );
    }
    return () => window.clearTimeout(timer);
  }, [phase, round, level, seed, name, onFinish]);

  // Clock + timeout while playing.
  useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0;
    const loop = () => {
      const t = performance.now() - playStart.current;
      setElapsed(t);
      if (t >= TIMEOUT_MS && phaseRef.current === 'play') {
        finishRound(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, finishRound]);

  const onCell = (r: number, c: number) => {
    if (phaseRef.current !== 'play') return;
    const now = performance.now();
    if (now < lockedUntil.current) return;
    const eng = engine.current;
    const out = eng.enter(r, c, now - playStart.current);
    if (out.kind === 'ignore') return;
    if (out.kind === 'arm') {
      setMsg('');
    } else if (out.kind === 'error') {
      sfx.error();
      setFlash((f) => ({ cell: out.cell, n: (f?.n ?? 0) + 1 }));
      setMsg('Fora do caminho! +2s · volte à casa acesa');
    } else if (out.kind === 'move') {
      sfx.step(eng.progress);
      if (out.effect === 'rotate') {
        sfx.rotate();
        lockedUntil.current = now + 500;
        setMsg('O tabuleiro girou! Toque onde você está');
      } else if (out.effect === 'teleport') {
        sfx.teleport();
        lockedUntil.current = now + 300;
        setMsg('Teletransporte! Continue do portal ◎');
      }
      if (out.finished) {
        bump();
        finishRound(false);
        return;
      }
    }
    bump();
  };

  const onLift = () => {
    const eng = engine.current;
    if (phaseRef.current !== 'play' || !eng.armed) return;
    eng.disarm();
    setMsg('Continue de onde parou');
    bump();
  };

  const eng = engine.current;
  const roundElapsed = phase === 'play' ? elapsed : phase === 'done' || phase === 'fail' ? results.current[round]?.timeMs ?? 0 : 0;
  const doneScore = totalScore(results.current.slice(0, round));
  const liveScore =
    phase === 'done' || phase === 'fail'
      ? totalScore(results.current.slice(0, round + 1))
      : doneScore + roundElapsed + eng.errors * ERROR_PENALTY_MS;

  const ghostRound = ghost?.rounds[round];
  const ghostState = ghost ? replayAt(level, ghostRound, roundElapsed) : null;
  const ghostScore = ghost
    ? totalScore(ghost.rounds.slice(0, round)) +
      (ghostState?.done && ghostRound
        ? roundScore(ghostRound)
        : Math.min(roundElapsed, ghostRound?.timeMs ?? TIMEOUT_MS) + (ghostState?.errors ?? 0) * ERROR_PENALTY_MS)
    : 0;

  const boardMode: BoardMode = phase === 'intro' ? 'hide' : phase;

  return (
    <div className="screen play">
      <header className="hud">
        <button className="icon-btn" onClick={onQuit} aria-label="Sair">
          ✕
        </button>
        <div className="rounds">
          {levels.map((_, i) => (
            <span key={i} className={`pip ${i < round ? 'ok' : ''} ${i === round ? 'now' : ''}`} />
          ))}
        </div>
        <div className="clock">{fmt(liveScore)}</div>
      </header>

      <div className="hud-sub">
        <span>
          Nível <b>{round + 1}</b>/{ROUNDS}
        </span>
        <span className={eng.errors ? 'bad' : ''}>✖ {eng.errors}</span>
        {ghost && (
          <span className="ghost-tag">
            👻 {ghost.name || 'Fantasma'} {fmt(ghostScore)}
          </span>
        )}
      </div>

      <div className="board-wrap">
        {phase === 'intro' && (
          <div className="intro-splash" key={`intro-${round}`}>
            <small>Nível</small>
            <strong>{round + 1}</strong>
          </div>
        )}
        <Board
          key={`board-${round}`}
          level={level}
          mode={boardMode}
          progress={eng.progress}
          quarterTurns={eng.quarterTurns}
          armed={eng.armed}
          errorFlash={flash}
          ghost={ghostState && phase !== 'intro' ? { progress: ghostState.progress } : null}
          onCell={onCell}
          onLift={onLift}
          className={phase === 'intro' ? 'dim' : ''}
        />
        {toast && toast.n === round && phase === 'done' && <div className="round-toast">✓ {toast.text}</div>}
        {phase === 'preview' && <div className="preview-bar" style={{ animationDuration: `${level.previewMs}ms` }} />}
      </div>

      <p className="msg" key={msg}>
        {msg || '\u00a0'}
      </p>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span>
        <i className="lg-rotate">↻</i> gira o tabuleiro
      </span>
      <span>
        <i className="lg-portal">◉</i> teletransporta
      </span>
    </div>
  );
}
