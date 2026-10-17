export type Special = 'rotateCW' | 'rotateCCW' | 'portalIn' | 'portalOut';

export interface PathStep {
  r: number;
  c: number;
  special?: Special;
}

export interface Level {
  index: number;
  size: number;
  path: PathStep[];
  /** Path indexes that stay faintly visible after the preview. */
  hints: number[];
  previewMs: number;
}

export interface RunEvent {
  /** ms since the start of the round's play phase */
  t: number;
  /** cell index (r * size + c) */
  cell: number;
  /** true when the player left the path */
  error: boolean;
}

export interface RoundResult {
  timeMs: number;
  errors: number;
  completed: boolean;
  events: RunEvent[];
}

export interface Run {
  seed: number;
  name: string;
  rounds: RoundResult[];
}
