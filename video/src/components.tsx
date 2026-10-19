import type { ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, GRAD } from './theme';

export const useLandscape = () => {
  const { width, height } = useVideoConfig();
  return width > height;
};

// Fondo oscuro con manchas de color que se mueven despacio.
export function Background({ hue = 0 }: { hue?: number }) {
  const f = useCurrentFrame();
  const blob = (x: number, y: number, size: number, color: string, speed: number, phase: number) => (
    <div
      style={{
        position: 'absolute',
        left: `${x + Math.sin((f + phase) / speed) * 6}%`,
        top: `${y + Math.cos((f + phase) / speed) * 5}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        filter: 'blur(120px)',
        opacity: 0.55,
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden', filter: `hue-rotate(${hue}deg)` }}>
      {blob(20, 15, 900, C.accent, 70, 0)}
      {blob(85, 70, 1000, C.accent2, 90, 40)}
      {blob(50, 110, 700, '#0ea5e9', 110, 80)}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />
    </AbsoluteFill>
  );
}

// Marco de móvil con la captura real de la app.
export function Phone({ src, width, delay = 0, tilt = 0, children }: { src?: string; width: number; delay?: number; tilt?: number; children?: ReactNode }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f - delay, fps, config: { damping: 16, mass: 0.9 } });
  const height = width * (844 / 390);
  const radius = width * 0.13;
  const float = Math.sin((f - delay) / 28) * 6;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        padding: width * 0.03,
        background: 'linear-gradient(160deg, #2a2f3a, #0d0f14)',
        boxShadow: `0 60px 120px -30px rgba(0,0,0,0.9), 0 0 0 2px rgba(255,255,255,0.08), 0 0 90px -20px ${C.accent}`,
        transform: `perspective(2200px) translateY(${interpolate(enter, [0, 1], [500, 0]) + float}px) rotateX(${interpolate(enter, [0, 1], [25, 0])}deg) rotateY(${tilt * (1 - enter * 0.6)}deg) scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
        opacity: interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
        position: 'relative',
      }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: radius * 0.8, overflow: 'hidden', position: 'relative', background: '#0b0d12' }}>
        {src && <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${interpolate(f - delay, [0, 150], [1.04, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })})` }} />}
        {children}
      </div>
      {/* isla de la cámara */}
      <div style={{ position: 'absolute', top: width * 0.045, left: '50%', width: width * 0.26, height: width * 0.065, borderRadius: 99, background: '#000', transform: 'translateX(-50%)' }} />
    </div>
  );
}

export function Headline({ kicker, title, sub, delay = 0, align = 'center' }: { kicker?: string; title: ReactNode; sub?: string; delay?: number; align?: 'center' | 'left' }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const a = (d: number) => spring({ frame: f - delay - d, fps, config: { damping: 18 } });
  const line = (d: number) => ({ opacity: a(d), transform: `translateY(${interpolate(a(d), [0, 1], [40, 0])}px)` });
  return (
    <div style={{ fontFamily: FONT, color: C.text, textAlign: align, maxWidth: land ? 760 : 940 }}>
      {kicker && (
        <div style={{ ...line(0), display: 'inline-block', padding: '10px 26px', borderRadius: 99, background: 'rgba(91,140,255,0.16)', color: '#a9c1ff', fontWeight: 700, fontSize: land ? 28 : 34, letterSpacing: 1, marginBottom: 28, textTransform: 'uppercase' }}>
          {kicker}
        </div>
      )}
      <div style={{ ...line(4), fontWeight: 850, fontSize: land ? 86 : 96, lineHeight: 1.02, letterSpacing: -3 }}>{title}</div>
      {sub && <div style={{ ...line(9), marginTop: 26, fontSize: land ? 34 : 40, lineHeight: 1.3, color: C.muted, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export const Grad = ({ children }: { children: ReactNode }) => <span style={{ background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{children}</span>;

// Escena tipo: titular + móvil. En vertical el texto va arriba; en horizontal, a la izquierda.
export function FeatureScene({ kicker, title, sub, shot, badge, tilt = -8 }: { kicker: string; title: ReactNode; sub: string; shot: string; badge?: ReactNode; tilt?: number }) {
  const land = useLandscape();
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={land ? { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 120, padding: '0 120px' } : { alignItems: 'center', paddingTop: 170 }}>
        <div style={{ flex: land ? 1 : undefined }}>
          <Headline kicker={kicker} title={title} sub={sub} align={land ? 'left' : 'center'} />
        </div>
        <div style={{ marginTop: land ? 0 : 70, position: 'relative' }}>
          <Phone src={shot} width={land ? 400 : 560} delay={6} tilt={tilt} />
          {badge}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// Tarjeta flotante que aparece junto al móvil (p. ej. "🏆 Nuevo récord").
export function Floating({ children, left = '-12%', top = '58%', delay = 18 }: { children: ReactNode; left?: string; top?: string; delay?: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 12, stiffness: 140 } });
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        transform: `scale(${s}) translateY(${Math.sin(f / 20) * 6}px)`,
        transformOrigin: 'left center',
        background: 'rgba(21,25,33,0.92)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 28,
        padding: '22px 30px',
        fontFamily: FONT,
        color: C.text,
        fontWeight: 750,
        fontSize: 34,
        whiteSpace: 'nowrap',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {children}
    </div>
  );
}
