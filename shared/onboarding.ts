export const ONBOARDED_KEY = 'ws:onboarded';

/** El tour sale solo en la primera visita: no si ya se vio, si venimos de una versión anterior o si ya hay datos. */
export function shouldShowOnboarding(i: { onboarded: boolean; seenVersion: string | undefined; hasData: boolean }): boolean {
  return !i.onboarded && i.seenVersion === undefined && !i.hasData;
}
