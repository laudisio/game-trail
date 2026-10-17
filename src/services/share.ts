import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/** Public site used in links shared from the native app (set on Amplify / .env). */
const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, '');

export function challengeUrl(code: string): string | null {
  if (PUBLIC_URL) return `${PUBLIC_URL}/?d=${code}`;
  if (Capacitor.isNativePlatform()) return null;
  return `${location.origin}${location.pathname}?d=${code}`;
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareText(title: string, text: string, url?: string | null): Promise<ShareOutcome> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, url: url ?? undefined, dialogTitle: title });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, text, url: url ?? undefined });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'shared';
  }
  try {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
