import { Capacitor } from '@capacitor/core';
import { load, save } from './storage';

/** A full-screen ad is shown after every Nth finished match. */
export const ADS_EVERY = 3;
/** Seconds before the web placeholder ad can be closed. */
export const AD_CLOSE_DELAY_S = 5;

const KEY = 'rastro.ads.matches.v1';

// Google's official test units: safe to use in development, never pay out.
const TEST_UNITS = {
  android: 'ca-app-pub-3940256099942544/1033173712',
  ios: 'ca-app-pub-3940256099942544/4411468910',
};
const UNITS = {
  android: (import.meta.env.VITE_ADMOB_INTERSTITIAL_ANDROID as string | undefined) || TEST_UNITS.android,
  ios: (import.meta.env.VITE_ADMOB_INTERSTITIAL_IOS as string | undefined) || TEST_UNITS.ios,
};

export function isAdTurn(finishedMatches: number): boolean {
  return finishedMatches > 0 && finishedMatches % ADS_EVERY === 0;
}

/** Counts a finished match and tells whether an interstitial is due now. */
export function countMatch(): boolean {
  const n = load<number>(KEY, 0) + 1;
  save(KEY, n);
  return isAdTurn(n);
}

/**
 * Ad layer. Native apps show AdMob interstitials; the web build renders an
 * in-app placeholder (`<Interstitial />`) until a web ad network is wired.
 */
export interface AdService {
  readonly native: boolean;
  init(): Promise<void>;
  /** Shows a native interstitial and resolves when it is closed. False if none was available. */
  showInterstitial(): Promise<boolean>;
}

class WebAdService implements AdService {
  readonly native = false;
  async init() {}
  async showInterstitial() {
    return false;
  }
}

class AdMobService implements AdService {
  readonly native = true;
  private ready = false;
  private started: Promise<void> | null = null;

  private unit() {
    return Capacitor.getPlatform() === 'ios' ? UNITS.ios : UNITS.android;
  }

  private isTest() {
    return Object.values(TEST_UNITS).includes(this.unit());
  }

  init() {
    this.started ??= (async () => {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.initialize();
      await this.preload();
    })().catch(() => {});
    return this.started;
  }

  private async preload() {
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareInterstitial({ adId: this.unit(), isTesting: this.isTest() });
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  async showInterstitial() {
    await this.init();
    if (!this.ready) {
      void this.preload();
      return false;
    }
    this.ready = false;
    const { AdMob, InterstitialAdPluginEvents } = await import('@capacitor-community/admob');
    let onClosed!: () => void;
    let onFailed!: (e: unknown) => void;
    const closed = new Promise<void>((resolve, reject) => {
      onClosed = resolve;
      onFailed = reject;
    });
    const handles = await Promise.all([
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => onClosed()),
      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (e) => onFailed(e)),
    ]);
    let shown = false;
    try {
      await AdMob.showInterstitial();
      await closed;
      shown = true;
    } catch {
      /* no ad: just continue the game */
    } finally {
      await Promise.all(handles.map((h) => h.remove()));
    }
    void this.preload();
    return shown;
  }
}

export const ads: AdService = Capacitor.isNativePlatform() ? new AdMobService() : new WebAdService();
