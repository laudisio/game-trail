export function fmt(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(2)}s`;
}

export function fmtShort(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}
