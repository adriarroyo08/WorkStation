import { Composition } from 'remotion';
import { Promo, PROMO_DURATION } from './Promo';

export const FPS = 30;

export const Root = () => (
  <>
    {/* Vertical 9:16 para reels, stories y TikTok */}
    <Composition id="Promo" component={Promo} durationInFrames={PROMO_DURATION} fps={FPS} width={1080} height={1920} />
    {/* Horizontal 16:9 para YouTube o la web */}
    <Composition id="PromoWide" component={Promo} durationInFrames={PROMO_DURATION} fps={FPS} width={1920} height={1080} />
  </>
);
