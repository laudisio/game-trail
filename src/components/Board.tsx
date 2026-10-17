import { useRef, type CSSProperties, type PointerEvent } from 'react';
import type { Level, PathStep } from '../game/types';

export type BoardMode = 'preview' | 'hide' | 'play' | 'done' | 'fail' | 'replay';

interface Props {
  level: Level;
  mode: BoardMode;
  progress: number;
  quarterTurns: number;
  armed?: boolean;
  errorFlash?: { cell: number; n: number } | null;
  ghost?: { progress: number } | null;
  hesitating?: boolean;
  onCell?: (r: number, c: number) => void;
  onLift?: () => void;
  className?: string;
  playerColor?: 'cyan' | 'magenta';
}

const ICON: Record<NonNullable<PathStep['special']>, string> = {
  rotateCW: '↻',
  rotateCCW: '↺',
  portalIn: '◉',
  portalOut: '◎',
};

function segments(path: PathStep[], upto: number): string[] {
  const segs: string[] = [];
  let cur: string[] = [];
  for (let i = 0; i <= upto && i < path.length; i++) {
    const p = path[i];
    if (p.special === 'portalOut' && cur.length) {
      segs.push(cur.join(' '));
      cur = [];
    }
    cur.push(`${p.c + 0.5},${p.r + 0.5}`);
  }
  if (cur.length) segs.push(cur.join(' '));
  return segs;
}

export default function Board({
  level,
  mode,
  progress,
  quarterTurns,
  armed,
  errorFlash,
  ghost,
  hesitating,
  onCell,
  onLift,
  className = '',
  playerColor = 'cyan',
}: Props) {
  const { size, path } = level;
  const last = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const indexOf = new Map(path.map((p, i) => [p.r * size + p.c, i]));
  const hintSet = new Set(level.hints);
  const showAll = mode === 'preview' || mode === 'fail';
  const angle = quarterTurns * 90;

  const sample = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const tile = el?.closest<HTMLElement>('[data-cell]');
    if (!tile || !rootRef.current?.contains(tile)) return;
    const idx = Number(tile.dataset.cell);
    onCell?.(Math.floor(idx / size), idx % size);
  };

  const handleMove = (x: number, y: number) => {
    const prev = last.current;
    const rect = rootRef.current?.getBoundingClientRect();
    const step = rect ? rect.width / size / 4 : 10;
    if (prev) {
      const dist = Math.hypot(x - prev.x, y - prev.y);
      const n = Math.ceil(dist / step);
      for (let i = 1; i < n; i++) sample(prev.x + ((x - prev.x) * i) / n, prev.y + ((y - prev.y) * i) / n);
    }
    sample(x, y);
    last.current = { x, y };
  };

  const interactive = !!onCell;
  const handlers = interactive
    ? {
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          last.current = null;
          handleMove(e.clientX, e.clientY);
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          if (e.buttons === 0 && e.pointerType === 'mouse') return;
          handleMove(e.clientX, e.clientY);
        },
        onPointerUp: () => {
          last.current = null;
          onLift?.();
        },
        onPointerCancel: () => {
          last.current = null;
          onLift?.();
        },
      }
    : {};

  const cells = [];
  const labels = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = r * size + c;
      const i = indexOf.get(cell);
      const step = i !== undefined ? path[i] : undefined;
      const cls = ['tile'];
      let label = '';
      if (i !== undefined) {
        const isEntry = i === 0;
        const isExit = i === path.length - 1;
        if (isEntry) cls.push('entry');
        if (isExit) cls.push('exit');
        if (showAll) cls.push('lit');
        if (mode === 'hide' && !isEntry && !isExit) cls.push(hintSet.has(i) ? 'hint' : 'vanish');
        if ((mode === 'play' || mode === 'replay' || mode === 'done') && hintSet.has(i) && i > progress) cls.push('hint');
        if (mode !== 'preview' && i <= progress) cls.push('visited');
        if (mode === 'done') cls.push('lit');
        if (step?.special) {
          const visible = showAll || i <= progress || mode === 'done';
          if (visible) {
            cls.push(step.special.startsWith('rotate') ? 'sp-rotate' : 'sp-portal');
            label = ICON[step.special];
          }
        }
        if (!label && isEntry) label = '▶';
        if (!label && isExit) label = '★';
      }
      if (mode === 'fail' && i !== undefined) cls.push('fail');
      if (errorFlash && errorFlash.cell === cell) cls.push(errorFlash.n % 2 ? 'err-a' : 'err-b');
      const style = { '--i': i ?? 0 } as CSSProperties;
      cells.push(
        <div
          key={cell}
          className="tile-slot"
          style={{ left: `${(c / size) * 100}%`, top: `${(r / size) * 100}%`, width: `${100 / size}%`, height: `${100 / size}%` }}
        >
          <div className={cls.join(' ')} data-cell={cell} style={style} />
        </div>,
      );
      if (label) {
        labels.push(
          <span
            key={`l${cell}`}
            className={`tile-label ${cls.filter((x) => /^(sp-|entry|exit)/.test(x)).join(' ')}`}
            style={{
              left: `${((c + 0.5) / size) * 100}%`,
              top: `${((r + 0.5) / size) * 100}%`,
              width: `${(100 / size) * 0.5}%`,
              transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
            }}
          >
            {label}
          </span>,
        );
      }
    }
  }

  const dot = (p: { r: number; c: number }) => ({
    left: `${((p.c + 0.5) / size) * 100}%`,
    top: `${((p.r + 0.5) / size) * 100}%`,
  });
  const cur = path[Math.min(progress, path.length - 1)];
  const ghostPos = ghost ? path[Math.min(ghost.progress, path.length - 1)] : null;
  const portalIn = path.findIndex((p) => p.special === 'portalIn');
  const trailUpto = mode === 'preview' || mode === 'fail' || mode === 'done' ? path.length - 1 : progress;
  const showTrail = mode !== 'hide';

  return (
    <div
      ref={rootRef}
      className={`board ${className} mode-${mode}`}
      style={{ touchAction: 'none' }}
      {...handlers}
    >
      <div className="board-inner" style={{ transform: `rotate(${angle}deg)` }}>
        {cells}
        <svg className="trail" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="none">
          {showTrail &&
            segments(path, trailUpto).map((pts, k) => (
              <polyline
                key={`${mode}-${k}`}
                points={pts}
                className={`trail-line ${mode === 'preview' ? 'draw' : ''} ${mode === 'fail' ? 'fail' : ''} ${playerColor}`}
                pathLength={1}
              />
            ))}
          {showAll && portalIn >= 0 && (
            <line
              className="portal-link"
              x1={path[portalIn].c + 0.5}
              y1={path[portalIn].r + 0.5}
              x2={path[portalIn + 1].c + 0.5}
              y2={path[portalIn + 1].r + 0.5}
            />
          )}
        </svg>
        {labels}
        {ghostPos && mode !== 'preview' && <div className="ghost-dot" style={dot(ghostPos)} />}
        {(mode === 'play' || mode === 'replay' || mode === 'done') && (
          <div className={`player-dot ${playerColor} ${armed ? 'armed' : ''}`} style={dot(cur)}>
            {hesitating && (
              <span className="hesitate" style={{ transform: `translate(-50%, 0) rotate(${-angle}deg)` }}>
                …
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
