import { mulberry32, randInt, shuffle, type Rng } from './rng';
import type { Level, PathStep } from './types';

export const ROUNDS = 5;

interface LevelConfig {
  size: number;
  len: [number, number];
  rotations: number;
  portal: boolean;
  hintRatio: number;
  previewMs: number;
}

const CONFIGS: LevelConfig[] = [
  { size: 5, len: [6, 7], rotations: 0, portal: false, hintRatio: 0.35, previewMs: 2000 },
  { size: 5, len: [7, 8], rotations: 1, portal: false, hintRatio: 0.2, previewMs: 2200 },
  { size: 6, len: [8, 9], rotations: 0, portal: true, hintRatio: 0.15, previewMs: 2200 },
  { size: 6, len: [9, 10], rotations: 1, portal: true, hintRatio: 0, previewMs: 2400 },
  { size: 7, len: [10, 12], rotations: 2, portal: true, hintRatio: 0, previewMs: 2600 },
];

type Pos = { r: number; c: number };
const DIRS: Pos[] = [
  { r: 0, c: 1 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: -1, c: 0 },
];

const key = (p: Pos) => `${p.r},${p.c}`;
const inBounds = (p: Pos, size: number) => p.r >= 0 && p.c >= 0 && p.r < size && p.c < size;
const neighbors = (p: Pos, size: number) =>
  DIRS.map((d) => ({ r: p.r + d.r, c: p.c + d.c })).filter((n) => inBounds(n, size));

/**
 * Self-avoiding walk that never touches itself (a cell may only neighbour the
 * previous one), so the route is unambiguous when traced with a finger.
 */
function walk(rng: Rng, size: number, start: Pos, cells: number, blocked: Set<string>): Pos[] | null {
  const path: Pos[] = [start];
  const used = new Set<string>([key(start)]);
  let budget = 4000;

  const dfs = (): boolean => {
    if (path.length === cells) return true;
    if (--budget <= 0) return false;
    const cur = path[path.length - 1];
    for (const n of shuffle(rng, neighbors(cur, size))) {
      const k = key(n);
      if (used.has(k) || blocked.has(k)) continue;
      const touches = neighbors(n, size).some((m) => used.has(key(m)) && key(m) !== key(cur));
      if (touches) continue;
      path.push(n);
      used.add(k);
      if (dfs()) return true;
      path.pop();
      used.delete(k);
    }
    return false;
  };

  return dfs() ? path : null;
}

function withHalo(cells: Pos[], size: number): Set<string> {
  const s = new Set<string>();
  for (const p of cells) {
    s.add(key(p));
    for (const n of neighbors(p, size)) s.add(key(n));
  }
  return s;
}

function buildPath(rng: Rng, cfg: LevelConfig): PathStep[] | null {
  const { size } = cfg;
  const total = randInt(rng, cfg.len[0], cfg.len[1]);
  const start = { r: randInt(rng, 0, size - 1), c: 0 };

  if (!cfg.portal) {
    const p = walk(rng, size, start, total, new Set());
    return p ? p.map((x) => ({ ...x })) : null;
  }

  const first = Math.max(3, Math.floor(total / 2));
  const seg1 = walk(rng, size, start, first, new Set());
  if (!seg1) return null;
  const halo = withHalo(seg1, size);
  const candidates: Pos[] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (!halo.has(key({ r, c }))) candidates.push({ r, c });
  for (const out of shuffle(rng, candidates)) {
    const seg2 = walk(rng, size, out, total - first, halo);
    if (seg2) {
      const steps: PathStep[] = [...seg1, ...seg2].map((x) => ({ ...x }));
      steps[first - 1].special = 'portalIn';
      steps[first].special = 'portalOut';
      return steps;
    }
  }
  return null;
}

function placeRotations(rng: Rng, path: PathStep[], count: number) {
  // Interior cells, not portals, not right next to another special, with room after.
  for (let n = 0; n < count; n++) {
    const options: number[] = [];
    for (let i = 1; i < path.length - 2; i++) {
      const near = [i - 1, i, i + 1].some((j) => path[j]?.special);
      if (!near) options.push(i);
    }
    if (!options.length) return;
    const idx = options[Math.floor(rng() * options.length)];
    path[idx].special = rng() < 0.5 ? 'rotateCW' : 'rotateCCW';
  }
}

export function generateLevel(seed: number, index: number): Level {
  const cfg = CONFIGS[Math.min(index, CONFIGS.length - 1)];
  const rng = mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
  let path: PathStep[] | null = null;
  for (let attempt = 0; attempt < 200 && !path; attempt++) path = buildPath(rng, cfg);
  if (!path) {
    // Extremely unlikely; fall back to a straight line.
    path = Array.from({ length: cfg.size }, (_, c) => ({ r: Math.floor(cfg.size / 2), c }));
  }
  placeRotations(rng, path, cfg.rotations);

  const plain: number[] = [];
  for (let i = 1; i < path.length - 1; i++) if (!path[i].special) plain.push(i);
  const hints = shuffle(rng, plain).slice(0, Math.round(plain.length * cfg.hintRatio));

  return { index, size: cfg.size, path, hints, previewMs: cfg.previewMs };
}

export function generateMatch(seed: number): Level[] {
  return Array.from({ length: ROUNDS }, (_, i) => generateLevel(seed, i));
}

export const isRotate = (s?: PathStep['special']) => s === 'rotateCW' || s === 'rotateCCW';
