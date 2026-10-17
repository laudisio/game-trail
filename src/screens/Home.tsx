import { useState } from 'react';
import { decodeRun, extractCode } from '../game/codec';
import { totalScore } from '../game/engine';
import type { Run } from '../game/types';
import { fmt } from '../format';
import { isMuted, setMuted, sfx } from '../services/feedback';

interface Props {
  name: string;
  onName: (n: string) => void;
  challenge: Run | null;
  onPlay: () => void;
  onDaily: () => void;
  onRace: (ghost: Run) => void;
  onChallenge: (ghost: Run) => void;
  onRanking: () => void;
  onHowTo: () => void;
}

export default function Home({ name, onName, challenge, onPlay, onDaily, onRace, onChallenge, onRanking, onHowTo }: Props) {
  const [muted, setMutedState] = useState(isMuted());
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [err, setErr] = useState('');

  const tryCode = () => {
    const c = extractCode(code);
    try {
      if (!c) throw new Error();
      const run = decodeRun(c);
      setErr('');
      setShowCode(false);
      setCode('');
      onChallenge(run);
    } catch {
      setErr('Código inválido');
    }
  };

  return (
    <div className="screen home">
      <button
        className="icon-btn mute"
        aria-label={muted ? 'Ativar som' : 'Silenciar'}
        onClick={() => {
          setMuted(!muted);
          setMutedState(!muted);
          if (muted) sfx.step(3);
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <div className="logo">
        <svg viewBox="0 0 120 60" className="logo-path" aria-hidden>
          <polyline points="8,52 8,30 44,30 44,8 80,8 80,30 112,30" />
          <circle cx="8" cy="52" r="4" className="in" />
          <circle cx="112" cy="30" r="4" className="out" />
        </svg>
        <h1 className="neon-title">RASTRO</h1>
        <p className="tagline">o caminho desaparece enquanto você joga ⚡</p>
      </div>

      <label className="name-field">
        <span>Seu apelido</span>
        <input value={name} maxLength={16} placeholder="Jogador" onChange={(e) => onName(e.target.value)} />
      </label>

      {challenge && (
        <div className="challenge-card">
          <p>
            ⚔️ <b>{challenge.name || 'Um amigo'}</b> te desafiou
          </p>
          <strong>{fmt(totalScore(challenge.rounds))}</strong>
          <button className="btn primary" onClick={() => onRace(challenge)}>
            Correr contra o fantasma 👻
          </button>
        </div>
      )}

      <div className="actions">
        <button className={`btn ${challenge ? 'ghost' : 'primary'}`} onClick={onPlay}>
          ▶ Jogar
        </button>
        <button className="btn ghost" onClick={onDaily}>
          📅 Desafio do dia
        </button>
        <div className="row">
          <button className="btn ghost" onClick={onRanking}>
            🏆 Ranking
          </button>
          <button className="btn ghost" onClick={onHowTo}>
            ❔ Como jogar
          </button>
        </div>
        {showCode ? (
          <div className="code-box">
            <input autoFocus value={code} placeholder="Cole o link ou código" onChange={(e) => setCode(e.target.value)} />
            <button className="btn primary sm" onClick={tryCode}>
              OK
            </button>
            {err && <p className="note bad">{err}</p>}
          </div>
        ) : (
          <button className="link" onClick={() => setShowCode(true)}>
            Recebi um código de desafio
          </button>
        )}
      </div>
    </div>
  );
}
