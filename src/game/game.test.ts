import { describe, expect, it } from 'vitest';
import { CONFIGS, ROUNDS, generateMatch } from './levels';
import { RoundEngine, replayAt, totalScore } from './engine';
import { decodeRun, encodeRun, extractCode } from './codec';

const adjacent = (a: { r: number; c: number }, b: { r: number; c: number }) =>
  Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

describe('levels', () => {
  it('is deterministic per seed', () => {
    expect(generateMatch(42)).toEqual(generateMatch(42));
    expect(generateMatch(42)).not.toEqual(generateMatch(43));
  });

  it('has 10 levels that never get easier', () => {
    expect(ROUNDS).toBe(10);
    expect(CONFIGS).toHaveLength(ROUNDS);
    for (let i = 1; i < CONFIGS.length; i++) {
      const [a, b] = [CONFIGS[i - 1], CONFIGS[i]];
      expect(b.size).toBeGreaterThanOrEqual(a.size);
      expect(b.len[0]).toBeGreaterThanOrEqual(a.len[0]);
      expect(b.hintRatio).toBeLessThanOrEqual(a.hintRatio);
      expect(b.previewMs / b.len[1]).toBeLessThanOrEqual(a.previewMs / a.len[1]);
    }
  });

  it('builds valid routes for many seeds', () => {
    for (let seed = 1; seed < 300; seed++) {
      const levels = generateMatch(seed * 7919);
      levels.forEach((lv, i) => {
        const p = lv.path;
        expect(p[0].c).toBe(0);
        const keys = new Set(p.map((s) => `${s.r},${s.c}`));
        expect(keys.size).toBe(p.length);
        for (let j = 1; j < p.length; j++) {
          if (p[j].special === 'portalOut') expect(p[j - 1].special).toBe('portalIn');
          else expect(adjacent(p[j - 1], p[j])).toBe(true);
        }
        const cfg = CONFIGS[i];
        expect(p.length).toBeGreaterThanOrEqual(cfg.len[0]);
        expect(p.length).toBeLessThanOrEqual(cfg.len[1]);
        expect(p.some((s) => s.special === 'portalIn')).toBe(cfg.portal);
        if (cfg.rotations > 0) expect(p.some((s) => s.special?.startsWith('rotate'))).toBe(true);
        expect(p.every((s) => s.r >= 0 && s.c >= 0 && s.r < lv.size && s.c < lv.size)).toBe(true);
      });
    }
  });
});

describe('engine', () => {
  it('walks a route with rotation, portal and an error', () => {
    const level = generateMatch(1234)[3];
    const eng = new RoundEngine(level);
    const p = level.path;
    expect(eng.enter(p[1].r, p[1].c, 10).kind).toBe('ignore'); // not armed
    expect(eng.enter(p[0].r, p[0].c, 20).kind).toBe('arm');

    // step off the route
    const off = [
      { r: p[0].r - 1, c: p[0].c },
      { r: p[0].r + 1, c: p[0].c },
      { r: p[0].r, c: p[0].c + 1 },
    ].find((x) => x.r >= 0 && x.r < level.size && !p.some((s) => s.r === x.r && s.c === x.c))!;
    expect(eng.enter(off.r, off.c, 30).kind).toBe('error');
    expect(eng.armed).toBe(false);
    eng.enter(p[0].r, p[0].c, 40);

    let t = 100;
    while (!eng.finished) {
      const cur = eng.current;
      if (!eng.armed) expect(eng.enter(cur.r, cur.c, t).kind).toBe('arm');
      const next = p[eng.progress + 1];
      const out = eng.enter(next.r, next.c, (t += 100));
      expect(out.kind).toBe('move');
    }
    const res = eng.result();
    expect(res.completed).toBe(true);
    expect(res.errors).toBe(1);
    const end = replayAt(level, res, res.timeMs);
    expect(end.done).toBe(true);
    expect(end.quarterTurns).toBe(eng.quarterTurns);
    expect(totalScore([res])).toBe(res.timeMs + 2000);
  });
});

describe('codec', () => {
  it('round-trips a run', () => {
    const run = {
      seed: 4000000000,
      name: 'Joã😀',
      rounds: [
        { timeMs: 4230, errors: 1, completed: true, events: [{ t: 500, cell: 3, error: false }, { t: 900, cell: 48, error: true }] },
        { timeMs: 20000, errors: 0, completed: false, events: [] },
      ],
    };
    const code = encodeRun(run);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeRun(code)).toEqual(run);
    expect(extractCode(`https://x.com/?d=${code}`)).toBe(code);
  });
});
