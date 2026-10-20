import { TransitionSeries, springTiming, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { Dumbbell } from 'lucide-react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background, FeatureScene, Floating, Grad, Headline, Phone, useLandscape } from './components';
import { C, ensureFont, FONT, GRAD } from './theme';

const T = 18; // duración de cada transición (frames)
const timing = springTiming({ config: { damping: 200 }, durationInFrames: T });

const SCENES = {
  intro: 96,
  feature: 108,
  theme: 132,
  watch: 132,
  outro: 150,
};
const FEATURES = 7;
const COUNT = 1 + FEATURES + 3;
export const PROMO_DURATION = SCENES.intro + SCENES.feature * FEATURES + SCENES.theme + SCENES.watch + SCENES.outro - T * (COUNT - 1);

function Logo({ size = 220, delay = 0 }: { size?: number; delay?: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 11, stiffness: 120 } });
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: GRAD,
        display: 'grid',
        placeItems: 'center',
        transform: `scale(${s}) rotate(${interpolate(s, [0, 1], [-30, 0])}deg)`,
        boxShadow: `0 40px 120px -20px ${C.accent}`,
      }}
    >
      <Dumbbell size={size * 0.55} color="#fff" strokeWidth={2.2} />
    </div>
  );
}

function Intro() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: f - 16, fps, config: { damping: 18 } });
  const sub = spring({ frame: f - 30, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 50, fontFamily: FONT }}>
        <Logo />
        <div style={{ color: C.text, fontWeight: 850, fontSize: 130, letterSpacing: -5, opacity: t, transform: `translateY(${interpolate(t, [0, 1], [50, 0])}px)` }}>
          Work<Grad>station</Grad>
        </div>
        <div style={{ color: C.muted, fontSize: 46, fontWeight: 500, opacity: sub, transform: `translateY(${interpolate(sub, [0, 1], [30, 0])}px)` }}>Tu entrenamiento, a otro nivel.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function ThemeScene() {
  const f = useCurrentFrame();
  const land = useLandscape();
  // Barrido de oscuro a claro y vuelta.
  const p = interpolate(f, [30, 60, 90, 112], [0, 1, 1, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const w = land ? 400 : 560;
  return (
    <AbsoluteFill>
      <Background hue={interpolate(p, [0, 1], [0, 30])} />
      <AbsoluteFill style={land ? { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 120, padding: '0 120px' } : { alignItems: 'center', paddingTop: 170 }}>
        <div style={{ flex: land ? 1 : undefined }}>
          <Headline
            kicker="Modo claro y oscuro"
            title={
              <>
                Bonita <Grad>de día y de noche</Grad>
              </>
            }
            sub="Se adapta a tu sistema o elige tú. Con transiciones suaves en toda la app."
            align={land ? 'left' : 'center'}
          />
        </div>
        <div style={{ marginTop: land ? 0 : 70 }}>
          <Phone src="shots/dark-home.png" width={w} delay={4}>
            <Img src={staticFile('shots/light-home.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: `inset(0 ${100 - p * 100}% 0 0)` }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${p * 100}%`, width: 4, background: '#fff', boxShadow: '0 0 30px #fff', opacity: p > 0.02 && p < 0.98 ? 1 : 0 }} />
          </Phone>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Watch() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 10, fps, config: { damping: 14 } });
  const total = 90;
  const left = Math.max(0, total - Math.floor(f / 1.2));
  const pct = left / total;
  const size = 380;
  const r = 165;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ transform: `scale(${s}) rotate(${interpolate(s, [0, 1], [12, 0])}deg)`, position: 'relative', width: size + 60, height: size + 300 }}>
      {/* correa */}
      <div style={{ position: 'absolute', left: 105, right: 105, top: 0, bottom: 0, borderRadius: 60, background: 'linear-gradient(180deg,#1f1a17,#302823,#1f1a17)' }} />
      {/* caja */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          top: 150,
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#000',
          boxShadow: `0 0 0 14px #2e2622, 0 0 0 16px #4a3f39, 0 40px 100px -20px rgba(0,0,0,.9), 0 0 100px -30px ${C.accent}`,
          display: 'grid',
          placeItems: 'center',
          fontFamily: FONT,
        }}
      >
        <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#2a221e" strokeWidth={14} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={C.accent}
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 26, color: '#bfb1a8' }}>Descanso</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3 }}>
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 22, color: '#888' }}>Sig.: Press banca</div>
          <div style={{ fontSize: 28, color: C.danger, marginTop: 8 }}>♥ {128 + Math.round(Math.sin(f / 8) * 4)}</div>
        </div>
      </div>
    </div>
  );
}

function WatchScene() {
  const land = useLandscape();
  return (
    <AbsoluteFill>
      <Background hue={-20} />
      <AbsoluteFill style={land ? { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 140, padding: '0 140px' } : { alignItems: 'center', paddingTop: 170, gap: 60 }}>
        <div style={{ flex: land ? 1 : undefined }}>
          <Headline
            kicker="Wear OS"
            title={
              <>
                Tu reloj, <Grad>tu mando</Grad>
              </>
            }
            sub="Completa series, controla el descanso y registra tu pulso sin tocar el móvil."
            align={land ? 'left' : 'center'}
          />
        </div>
        <Watch />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Outro() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = useLandscape();
  const pills = ['Gratis', 'Sin anuncios', 'Tus datos son tuyos', 'Coach IA', 'Wear OS'];
  const cta = spring({ frame: f - 50, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 44, fontFamily: FONT, padding: 80 }}>
        <Logo size={land ? 170 : 200} />
        <Headline
          title={
            <>
              Entrena con <Grad>Workstation</Grad>
            </>
          }
          delay={8}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center', maxWidth: 950 }}>
          {pills.map((p, i) => {
            const s = spring({ frame: f - 22 - i * 5, fps, config: { damping: 14 } });
            return (
              <div
                key={p}
                style={{
                  transform: `scale(${s})`,
                  padding: '16px 30px',
                  borderRadius: 99,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: C.text,
                  fontSize: land ? 30 : 36,
                  fontWeight: 650,
                }}
              >
                {p}
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 20,
            transform: `scale(${cta})`,
            padding: '26px 54px',
            borderRadius: 30,
            background: GRAD,
            color: '#fff',
            fontSize: land ? 36 : 42,
            fontWeight: 800,
            boxShadow: `0 30px 80px -20px ${C.accent}`,
          }}
        >
          github.com/adriarroyo08/WorkStation
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Promo() {
  ensureFont();
  const features = [
    {
      kicker: 'Entrena',
      title: (
        <>
          Cada serie, <Grad>al instante</Grad>
        </>
      ),
      sub: 'Peso, reps, RPE y la marca de tu última sesión siempre a la vista.',
      shot: 'shots/dark-active.png',
      badge: <Floating>🏆 ¡Nuevo récord!</Floating>,
    },
    {
      kicker: 'Progresa',
      title: (
        <>
          Sabe qué <Grad>levantar hoy</Grad>
        </>
      ),
      sub: 'Sugerencias de sobrecarga progresiva y calculadora de discos.',
      shot: 'shots/dark-plates.png',
      badge: <Floating>📈 Hoy: 90 kg × 8</Floating>,
      tilt: 8,
    },
    {
      kicker: 'Analiza',
      title: (
        <>
          Tu progreso, <Grad>en gráficas</Grad>
        </>
      ),
      sub: '1RM estimado, mejores series y récords por repeticiones de cada ejercicio.',
      shot: 'shots/dark-exercise-detail.png',
    },
    {
      kicker: 'Resume',
      title: (
        <>
          Cada entreno <Grad>cuenta</Grad>
        </>
      ),
      sub: 'Resumen con récords, mapa corporal e imagen para compartir.',
      shot: 'shots/dark-summary.png',
      tilt: 8,
    },
    {
      kicker: 'Informes',
      title: (
        <>
          Semanal, mensual <Grad>y anual</Grad>
        </>
      ),
      sub: 'Compara periodos, vigila tu volumen por músculo y deja que la IA te lo analice.',
      shot: 'shots/dark-report.png',
    },
    {
      kicker: 'Motívate',
      title: (
        <>
          Rachas y <Grad>logros</Grad>
        </>
      ),
      sub: '21 logros que desbloquear, racha semanal y mapa de actividad del año.',
      shot: 'shots/dark-achievements.png',
      badge: <Floating>🔥 6 semanas seguidas</Floating>,
      tilt: 8,
    },
    {
      kicker: 'Coach IA',
      title: (
        <>
          Un entrenador <Grad>gratis</Grad>
        </>
      ),
      sub: 'Conecta Gemini, Groq, OpenRouter u Ollama y pídele rutinas a tu medida.',
      shot: 'shots/dark-coach.png',
    },
  ];
  // Las presentaciones tienen props distintas; se tratan como genéricas para alternarlas.
  const transitions = [slide({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), fade(), wipe({ direction: 'from-left' })] as TransitionPresentation<Record<string, unknown>>[];
  let k = 0;
  const next = () => transitions[k++ % transitions.length];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES.intro}>
          <Intro />
        </TransitionSeries.Sequence>
        {features.map((s, i) => [
          <TransitionSeries.Transition key={`t${i}`} presentation={next()} timing={timing} />,
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={SCENES.feature}>
            <FeatureScene {...s} />
          </TransitionSeries.Sequence>,
        ])}
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES.theme}>
          <ThemeScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES.watch}>
          <WatchScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES.outro}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}
