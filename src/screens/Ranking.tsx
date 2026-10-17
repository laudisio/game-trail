import { useEffect, useState } from 'react';
import { decodeRun } from '../game/codec';
import { dailySeed } from '../game/rng';
import type { Run } from '../game/types';
import { fmt } from '../format';
import { ranking, type RankingEntry } from '../services/ranking';

interface Props {
  onBack: () => void;
  onRace: (ghost: Run) => void;
  onReplay: (mine: Run, other: Run) => void;
}

export default function Ranking({ onBack, onRace, onReplay }: Props) {
  const [tab, setTab] = useState<'daily' | 'best'>('daily');
  const [list, setList] = useState<RankingEntry[]>([]);
  const seed = dailySeed();

  useEffect(() => {
    (tab === 'daily' ? ranking.bySeed(seed) : ranking.best(20)).then(setList);
  }, [tab, seed]);

  const myBestOnSeed = (s: number) => list.find((e) => e.mine && e.seed === s);

  return (
    <div className="screen ranking">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">
          ←
        </button>
        <h2>Ranking</h2>
        <span />
      </header>
      <div className="tabs">
        <button className={tab === 'daily' ? 'on' : ''} onClick={() => setTab('daily')}>
          Desafio do dia
        </button>
        <button className={tab === 'best' ? 'on' : ''} onClick={() => setTab('best')}>
          Meus recordes
        </button>
      </div>
      {list.length === 0 ? (
        <p className="empty">
          {tab === 'daily'
            ? 'Ninguém jogou o desafio de hoje ainda. Jogue e compartilhe com os amigos!'
            : 'Jogue uma partida para aparecer aqui.'}
        </p>
      ) : (
        <ol className="rank-list">
          {list.map((e, i) => {
            const mine = myBestOnSeed(e.seed);
            return (
              <li key={e.id} className={e.mine ? 'mine' : ''}>
                <span className="pos">{i + 1}</span>
                <span className="who">
                  {e.mine ? `${e.name} (você)` : e.name}
                  <small>
                    {e.errors} {e.errors === 1 ? 'erro' : 'erros'} · {new Date(e.date).toLocaleDateString('pt-BR')}
                  </small>
                </span>
                <span className="time">{fmt(e.totalMs)}</span>
                {!e.mine && (
                  <span className="rank-actions">
                    <button className="btn sm ghost" onClick={() => onRace(decodeRun(e.code))}>
                      👻
                    </button>
                    {mine && (
                      <button className="btn sm ghost" onClick={() => onReplay(decodeRun(mine.code), decodeRun(e.code))}>
                        ▶
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="note">Ranking salvo neste aparelho (inclui desafios recebidos). Ranking online chega com a AWS.</p>
    </div>
  );
}
