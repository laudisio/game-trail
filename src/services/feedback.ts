import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { load, save } from './storage';

let ctx: AudioContext | null = null;
let muted = load<boolean>('rastro.muted', false);

export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  save('rastro.muted', v);
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, slideTo?: number, delay = 0) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const haptic = (fn: () => Promise<void>) => {
  fn().catch(() => undefined);
};

export const sfx = {
  unlock() {
    audio();
  },
  step(i: number) {
    tone(420 + i * 45, 0.08, 'triangle', 0.1);
    haptic(() => Haptics.impact({ style: ImpactStyle.Light }));
  },
  error() {
    tone(160, 0.22, 'sawtooth', 0.09, 90);
    haptic(() => Haptics.notification({ type: NotificationType.Error }));
  },
  rotate() {
    tone(300, 0.35, 'sine', 0.12, 900);
    haptic(() => Haptics.impact({ style: ImpactStyle.Medium }));
  },
  teleport() {
    tone(1200, 0.18, 'square', 0.05, 200);
    tone(200, 0.18, 'square', 0.05, 1400, 0.12);
    haptic(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  },
  hide() {
    tone(700, 0.25, 'sine', 0.06, 250);
  },
  roundDone() {
    [660, 880, 1100].forEach((f, i) => tone(f, 0.14, 'triangle', 0.09, undefined, i * 0.07));
    haptic(() => Haptics.notification({ type: NotificationType.Success }));
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, undefined, i * 0.09));
  },
};
