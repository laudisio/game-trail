import type { Run } from './types';

const VERSION = 1;
const TICK = 10; // ms resolution of recorded events

function pushVarint(out: number[], n: number) {
  let v = Math.max(0, Math.floor(n));
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v);
}

class Reader {
  i = 0;
  constructor(private b: Uint8Array) {}
  byte() {
    if (this.i >= this.b.length) throw new Error('fim inesperado');
    return this.b[this.i++];
  }
  varint() {
    let n = 0;
    let mul = 1;
    for (;;) {
      const x = this.byte();
      n += (x & 0x7f) * mul;
      if (x < 0x80) return n;
      mul *= 128;
    }
  }
}

function toBase64Url(bytes: number[]): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

/** Compact, URL-safe encoding of a full run (used for ghosts / challenges). */
export function encodeRun(run: Run): string {
  const out: number[] = [VERSION];
  pushVarint(out, run.seed >>> 0);
  const name = new TextEncoder().encode(run.name.slice(0, 16));
  pushVarint(out, name.length);
  out.push(...name);
  pushVarint(out, run.rounds.length);
  for (const r of run.rounds) {
    pushVarint(out, Math.round(r.timeMs / TICK));
    out.push(r.completed ? 1 : 0);
    pushVarint(out, r.events.length);
    let prev = 0;
    for (const ev of r.events) {
      const t = Math.round(ev.t / TICK);
      pushVarint(out, t - prev);
      prev = t;
      pushVarint(out, ev.cell * 2 + (ev.error ? 1 : 0));
    }
  }
  return toBase64Url(out);
}

export function decodeRun(code: string): Run {
  const rd = new Reader(fromBase64Url(code.trim()));
  if (rd.byte() !== VERSION) throw new Error('versão desconhecida');
  const seed = rd.varint() >>> 0;
  const nameLen = rd.varint();
  const nameBytes = new Uint8Array(nameLen);
  for (let i = 0; i < nameLen; i++) nameBytes[i] = rd.byte();
  const name = new TextDecoder().decode(nameBytes);
  const count = rd.varint();
  if (count > 10) throw new Error('código inválido');
  const rounds: Run['rounds'] = [];
  for (let i = 0; i < count; i++) {
    const timeMs = rd.varint() * TICK;
    const completed = rd.byte() === 1;
    const n = rd.varint();
    const events = [];
    let t = 0;
    let errors = 0;
    for (let j = 0; j < n; j++) {
      t += rd.varint();
      const v = rd.varint();
      const error = v % 2 === 1;
      if (error) errors++;
      events.push({ t: t * TICK, cell: Math.floor(v / 2), error });
    }
    rounds.push({ timeMs, completed, errors, events });
  }
  return { seed, name, rounds };
}

/** Accepts a raw code or any URL containing `?d=<code>`. */
export function extractCode(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/[?&#]d=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]+$/.test(s) ? s : null;
}
