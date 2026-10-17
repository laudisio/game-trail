import { encodeRun } from '../game/codec';
import { totalErrors, totalScore } from '../game/engine';
import type { Run } from '../game/types';
import { load, save } from './storage';

export interface RankingEntry {
  id: string;
  name: string;
  seed: number;
  totalMs: number;
  errors: number;
  date: string;
  code: string;
  mine: boolean;
}

/**
 * Data layer for rankings. Today it is local (this device + friends' codes you
 * opened); swap `ranking` for an AWS-backed implementation later.
 */
export interface RankingService {
  submit(run: Run, mine: boolean): Promise<RankingEntry>;
  bySeed(seed: number): Promise<RankingEntry[]>;
  best(limit?: number): Promise<RankingEntry[]>;
}

const KEY = 'rastro.ranking.v1';

class LocalRankingService implements RankingService {
  private all(): RankingEntry[] {
    return load<RankingEntry[]>(KEY, []);
  }

  async submit(run: Run, mine: boolean) {
    const code = encodeRun(run);
    const entry: RankingEntry = {
      id: code,
      name: run.name || 'Anônimo',
      seed: run.seed,
      totalMs: totalScore(run.rounds),
      errors: totalErrors(run.rounds),
      date: new Date().toISOString(),
      code,
      mine,
    };
    const list = this.all().filter((e) => e.id !== entry.id);
    list.push(entry);
    list.sort((a, b) => a.totalMs - b.totalMs);
    save(KEY, list.slice(0, 200));
    return entry;
  }

  async bySeed(seed: number) {
    return this.all().filter((e) => e.seed === seed);
  }

  async best(limit = 10) {
    return this.all()
      .filter((e) => e.mine)
      .slice(0, limit);
  }
}

export const ranking: RankingService = new LocalRankingService();
