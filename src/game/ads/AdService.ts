/**
 * Ad interface for the free browser build only.
 *
 * **Never active in the paid desktop build.** `ADS_ENABLED` is false unless the
 * bundle is explicitly built for a web portal, so the packaged Steam build has
 * no ad path at all — not merely a NoOp one that a later edit could switch on.
 */

/**
 * True only for a web-portal build. Vite statically replaces
 * `import.meta.env.VITE_ADS` at build time, so when this is false the whole
 * ad path is dropped by tree-shaking.
 */
export const ADS_ENABLED =
  import.meta.env.VITE_ADS === 'true' && !import.meta.env.VITE_DESKTOP;

export type InterstitialReason = 'day_end' | 'travel' | 'menu';
export type RewardKind = 'coin' | 'supplies';

export interface AdService {
  showInterstitial(reason: InterstitialReason): Promise<void>;
  showRewarded(reward: RewardKind): Promise<boolean>;
}

/** Safe local implementation — no ads, instant resolve */
export class NoOpAdService implements AdService {
  async showInterstitial(_reason: InterstitialReason): Promise<void> {
    /* no-op */
  }

  async showRewarded(_reward: RewardKind): Promise<boolean> {
    return false;
  }
}

/**
 * Placeholder for portal SDKs (GameDistribution, Wortal, etc.)
 * Replace body when integrating a real network.
 */
export class PortalAdService implements AdService {
  async showInterstitial(reason: InterstitialReason): Promise<void> {
    // Example: window.gdsdk?.showAd()
    console.info('[ads] interstitial', reason);
  }

  async showRewarded(reward: RewardKind): Promise<boolean> {
    console.info('[ads] rewarded', reward);
    return false;
  }
}

export const ads: AdService = new NoOpAdService();
