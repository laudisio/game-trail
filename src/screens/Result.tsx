import { useState } from 'react';
import { encodeRun } from '../game/codec';
import { ERROR_PENALTY_MS, TIMEOUT_PENALTY_MS, roundScore, totalErrors, totalScore } from '../game/engine';
import type { Run } from '../game/types';
import { fmt } from '../format';
import { challengeUrl, shareText } from '../services/share';

interface Props {
  run: Run;
  ghost?: Run | null;
  daily: boolean;
  onReplay: () => void;
  onAgain: () => void;
  onHome: () => void;
}

export default function Result({ run, ghost, daily, onReplay, onAgain, onHome }: Props) {
  const [note, setNote] = useState('');
  const total = totalScore(run.rounds);
  const errors = totalErrors(run.rounds);
  const timeouts = run.rounds.filter((r) => !r.completed).length;
  const summary = [
    errors > 0 && `${errors} ${errors === 1 ? 'erro' : 'erros'} (+${(errors * ERROR_PENALTY_MS) / 1000}s)`,
    timeouts > 0 &&
      `${timeouts} ${timeouts === 1 ? 'nível esgotado' : 'níveis esgotados'} (+${(timeouts * TIMEOUT_PENALTY_MS) / 1000}s)`,
  ].filter(Boolean);
  const ghostTotal = ghost ? totalScore(ghost.rounds) : 0;
  const diff = ghost ? ghostTotal - total : 0;

  const share = async () => {
    const code = encodeRun(run);
    const url = challengeUrl(code);
    const who = run.name || 'Alguém';
    const text = ghost
      ? `${who} correu contra ${ghost.name || 'você'} no Rastro ⚡ ${fmt(total)} x ${fmt(ghostTotal)}. Veja os rastros lado a lado!`
      : `${who} fez ${fmt(total)} no Rastro ⚡ Consegue vencer meu fantasma?`;
    const body = url ? text : `${text}\nCódigo: ${code}`;
    const out = await shareText('Rastro', body, url);
    if (out === 'copied') setNote('Link copiado! Cole para seu amigo.');
    else if (out === 'failed') setNote('Não foi possível compartilhar.');
  };

  return (
    <div className="screen result">
      <h2 className="neon-title small">{ghost ? (diff >= 0 ? 'Vitória!' : 'Quase!') : daily ? 'Desafio do dia' : 'Fim da partida'}</h2>
      <div className="big-time">{fmt(total)}</div>
      <p className="sub">
        {summary.length === 0 ? 'Sem erros — rastro perfeito ✨' : summary.join(' · ')}
      </p>

      {ghost && (
        <div className={`versus ${diff >= 0 ? 'win' : 'lose'}`}>
          <div>
            <small>Você</small>
            <b>{fmt(total)}</b>
          </div>
          <span>vs</span>
          <div>
            <small>👻 {ghost.name || 'Fantasma'}</small>
            <b>{fmt(ghostTotal)}</b>
          </div>
          <p>{diff >= 0 ? `Você venceu por ${fmt(diff)}` : `Faltaram ${fmt(-diff)}`}</p>
        </div>
      )}

      <table className="breakdown">
        <thead>
          <tr>
            <th>Nível</th>
            <th>Tempo</th>
            <th>Erros</th>
            {ghost && <th>👻</th>}
          </tr>
        </thead>
        <tbody>
          {run.rounds.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.completed ? fmt(r.timeMs) : '⏱ esgotou'}</td>
              <td className={r.errors ? 'bad' : ''}>{r.errors}</td>
              {ghost && <td>{ghost.rounds[i] ? fmt(roundScore(ghost.rounds[i])) : '-'}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="actions">
        {ghost && (
          <button className="btn primary" onClick={onReplay}>
            ▶ Ver rastros lado a lado
          </button>
        )}
        <button className={`btn ${ghost ? 'ghost' : 'primary'}`} onClick={share}>
          ⚔️ {ghost ? 'Compartilhar resultado' : 'Desafiar um amigo'}
        </button>
        {note && <p className="note">{note}</p>}
        <div className="row">
          <button className="btn ghost" onClick={onAgain}>
            ↻ Jogar de novo
          </button>
          <button className="btn ghost" onClick={onHome}>
            Início
          </button>
        </div>
      </div>
    </div>
  );
}
