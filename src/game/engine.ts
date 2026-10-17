import { isRotate } from './levels';
import type { Level, RoundResult, RunEvent } from './types';

export const ERROR_PENALTY_MS = 2000;
export const TIMEOUT_MS = 20000;
export const TIMEOUT_PENALTY_MS = 5000;
export const HESITATION_MS = 800;

export type Effect = 'rotate' | 'teleport' | null;
export type Outcome =
  | { kind: 'ignore' }
  | { kind: 'arm' }
  | { kind: 'move'; effect: Effect; finished: boolean }
  | { kind: 'error'; cell: number };

/**
 * Pure state machine for a single route. The player must be touching the cell
 * where they currently are ("armed") to advance; leaving the route or being
 * moved by a rotation / portal disarms them until they touch it again.
 */
export class RoundEngine {
  progress = 0;
  armed = false;
  errors = 0;
  quarterTurns = 0;
  finished = false;
  events: RunEvent[] = [];
  finishTime = 0;

  constructor(public level: Level) {}

  cellIndex(r: number, c: number) {
    return r * this.level.size + c;
  }

  get current() {
    return this.level.path[this.progress];
  }

  enter(r: number, c: number, t: number): Outcome {
    if (this.finished) return { kind: 'ignore' };
    const cur = this.current;
    const isCur = cur.r === r && cur.c === c;

    if (!this.armed) {
      if (isCur) {
        this.armed = true;
        return { kind: 'arm' };
      }
      return { kind: 'ignore' };
    }
    if (isCur) return { kind: 'ignore' };

    const next = this.level.path[this.progress + 1];
    if (next && next.r === r && next.c === c) {
      this.progress++;
      this.events.push({ t, cell: this.cellIndex(r, c), error: false });
      let effect: Effect = null;
      if (next.special === 'portalIn') {
        this.progress++;
        this.armed = false;
        effect = 'teleport';
      } else if (isRotate(next.special)) {
        this.quarterTurns += next.special === 'rotateCW' ? 1 : -1;
        this.armed = false;
        effect = 'rotate';
      }
      if (this.progress >= this.level.path.length - 1) {
        this.finished = true;
        this.finishTime = t;
      }
      return { kind: 'move', effect, finished: this.finished };
    }

    const visited = this.level.path.slice(0, this.progress).some((p) => p.r === r && p.c === c);
    if (visited) return { kind: 'ignore' };

    const cell = this.cellIndex(r, c);
    this.errors++;
    this.armed = false;
    this.events.push({ t, cell, error: true });
    return { kind: 'error', cell };
  }

  disarm() {
    this.armed = false;
  }

  result(timedOut = false): RoundResult {
    return {
      timeMs: timedOut ? TIMEOUT_MS : this.finishTime,
      errors: this.errors,
      completed: !timedOut && this.finished,
      events: this.events.slice(),
    };
  }
}

export function roundScore(r: RoundResult): number {
  return r.timeMs + r.errors * ERROR_PENALTY_MS + (r.completed ? 0 : TIMEOUT_PENALTY_MS);
}

export function totalScore(rounds: RoundResult[]): number {
  return rounds.reduce((s, r) => s + roundScore(r), 0);
}

export function totalErrors(rounds: RoundResult[]): number {
  return rounds.reduce((s, r) => s + r.errors, 0);
}

export interface ReplayState {
  progress: number;
  quarterTurns: number;
  errors: number;
  lastError: { cell: number; t: number } | null;
  idleMs: number;
  done: boolean;
}

/** Reconstructs where a recorded player was at time `t` of a round. */
export function replayAt(level: Level, round: RoundResult | undefined, t: number): ReplayState {
  const state: ReplayState = { progress: 0, quarterTurns: 0, errors: 0, lastError: null, idleMs: t, done: false };
  if (!round) return state;
  let lastT = 0;
  for (const ev of round.events) {
    if (ev.t > t) break;
    lastT = ev.t;
    if (ev.error) {
      state.errors++;
      state.lastError = { cell: ev.cell, t: ev.t };
      continue;
    }
    state.progress++;
    const step = level.path[state.progress];
    if (step?.special === 'portalIn') state.progress++;
    else if (step?.special === 'rotateCW') state.quarterTurns++;
    else if (step?.special === 'rotateCCW') state.quarterTurns--;
  }
  state.idleMs = t - lastT;
  state.done = state.progress >= level.path.length - 1;
  return state;
}

export interface Moment {
  round: number;
  t: number;
}

/** First error and first hesitation (pause longer than HESITATION_MS) of a run. */
export function firstMoments(rounds: RoundResult[]): { error: Moment | null; hesitation: Moment | null } {
  let error: Moment | null = null;
  let hesitation: Moment | null = null;
  rounds.forEach((r, round) => {
    let prev = 0;
    for (const ev of r.events) {
      if (!error && ev.error) error = { round, t: ev.t };
      if (!hesitation && ev.t - prev > HESITATION_MS && prev > 0) hesitation = { round, t: prev + HESITATION_MS };
      prev = ev.t;
    }
  });
  return { error, hesitation };
}

export function hesitations(round: RoundResult | undefined): number[] {
  if (!round) return [];
  const out: number[] = [];
  let prev = 0;
  for (const ev of round.events) {
    if (prev > 0 && ev.t - prev > HESITATION_MS) out.push(prev + HESITATION_MS);
    prev = ev.t;
  }
  return out;
}

export function isEarlier(a: Moment | null, b: Moment | null): boolean {
  if (!a) return false;
  if (!b) return true;
  return a.round < b.round || (a.round === b.round && a.t < b.t);
}
