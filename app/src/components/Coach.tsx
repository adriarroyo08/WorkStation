import { useRef, useState } from 'react';
import { ask } from '../dialog';
import { Save } from 'lucide-react';
import { chat, COACH_SYSTEM_PROMPT, extractJsonBlock, type ChatMessage } from '../../../shared/ai';
import { articleCitationParts, coachArticleContext } from '../../../shared/article-search';
import { routineFromDraft, type RoutineDraft } from '../../../shared/data';
import { period, periodReport, reportToText } from '../../../shared/reports';
import { trainingSummary } from '../../../shared/stats';
import { uid } from '../../../shared/types';
import { useStore } from '../store';
import { Back } from './ui';

const QUICK = [
  'Analiza mis últimas semanas: ¿qué estoy haciendo bien y qué debería mejorar?',
  'Hazme el resumen de esta semana y dime qué priorizar en la siguiente.',
  'Crea una rutina Torso/Pierna de 4 días adaptada a mis marcas actuales.',
  '¿Qué pesos debería usar en mi próximo entrenamiento para progresar?',
  '¿Tengo algún grupo muscular descompensado por volumen?',
];

export default function Coach({ goSettings, onBack }: { goSettings: () => void; onBack: () => void }) {
  const { data, ai, update, settings } = useStore();
  const [msgs, setMsgs] = useState<(ChatMessage & { articles?: ReturnType<typeof coachArticleContext>['articles'] })[]>([]);
  const [pending, setPending] = useState<ChatMessage>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const abort = useRef<AbortController | null>(null);

  const configured = ai.baseUrl && ai.model;

  const request = async (question: ChatMessage) => {
    if (abort.current) return;
    const next = [...msgs, question];
    const controller = new AbortController();
    abort.current = controller;
    setPending(question);
    setBusy(true);
    setErr('');
    try {
      const context = coachArticleContext(question.content);
      const system: ChatMessage = {
        role: 'system',
        content: `${COACH_SYSTEM_PROMPT}\n\nFecha de hoy: ${new Date().toISOString().slice(0, 10)}\n\nDATOS DEL USUARIO:\n${trainingSummary(data, 15)}\n\n${reportToText(periodReport(data, period('week', 0, settings.weekStartsMonday)))}\n\n${reportToText(periodReport(data, period('month', 0, settings.weekStartsMonday)))}\n\nEjercicios disponibles en su biblioteca: ${data.exercises
          .filter((e) => !e.id.startsWith('db-'))
          .map((e) => e.name)
          .join(', ')}`,
      };
      system.content += `\n\n${context.prompt}`;
      const reply = await chat(ai, [system, ...next.map(({ role, content }) => ({ role, content }))], controller.signal);
      controller.signal.throwIfAborted();
      setMsgs([...next, { role: 'assistant', content: reply, articles: context.articles }]);
      setPending(undefined);
    } catch (e) {
      if (controller.signal.aborted) setPending(undefined);
      else setErr((e as Error).message);
    } finally {
      abort.current = null;
      setBusy(false);
    }
  };

  const send = (text: string) => {
    if (!text.trim() || abort.current) return;
    setInput('');
    void request({ role: 'user', content: text });
  };

  const visibleMsgs: typeof msgs = pending ? [...msgs, pending] : msgs;

  const saveRoutines = (drafts: RoutineDraft[], program?: string) => {
    try {
      update((d) => {
        const folderId = program ? uid() : undefined;
        if (program && folderId) d.folders.push({ id: folderId, name: program });
        for (const dr of drafts) d.routines.push(routineFromDraft(d, dr, folderId));
      });
      ask.notice(program ? `Programa "${program}" guardado (${drafts.length} rutinas).` : `Rutina "${drafts[0].name}" guardada en Entrenar.`);
    } catch (e) {
      ask.error((e as Error).message);
    }
  };

  if (!configured)
    return (
      <section>
        <Back onClick={onBack} />
        <h1>Coach IA</h1>
        <p>Conecta una IA gratuita (Gemini, Groq, OpenRouter u Ollama) con tu API key en Ajustes.</p>
        <button className="primary" onClick={goSettings}>
          Ir a Ajustes
        </button>
      </section>
    );

  return (
    <section className="coach">
      <Back onClick={onBack} />
      <h1>Coach IA</h1>
      <p className="muted small">
        {ai.model} · tus datos se envían solo al proveedor que configuraste.
        {visibleMsgs.length > 0 && (
          <button
            className="ghost small"
            disabled={busy}
            onClick={() => {
              setMsgs([]);
              setPending(undefined);
              setErr('');
            }}
          >
            Nueva conversación
          </button>
        )}
      </p>
      {!visibleMsgs.length && <h2 className="sec">Prueba con</h2>}
      {!visibleMsgs.length && (
        <div className="list flush">
          {QUICK.map((q) => (
            <button key={q} className="item" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      {visibleMsgs.map((m, i) => {
        const json = m.role === 'assistant' ? (extractJsonBlock(m.content) as (RoutineDraft & { program?: string; routines?: RoutineDraft[] }) | undefined) : undefined;
        const text = m.content.replace(/```json[\s\S]*?```/g, '').trim();
        const parts = m.role === 'assistant' ? articleCitationParts(text, m.articles ?? []) : [{ text, href: undefined }];
        return (
          <div key={i} className={`bubble ${m.role}`}>
            <div className="pre">
              {parts.map((part, j) =>
                part.href ? (
                  <a key={j} href={part.href}>
                    {part.text}
                  </a>
                ) : (
                  part.text
                ),
              )}
            </div>
            {json?.exercises && (
              <button className="primary icon-btn" onClick={() => saveRoutines([json])}>
                <Save size={16} /> Guardar rutina “{json.name}”
              </button>
            )}
            {Array.isArray(json?.routines) && (
              <button className="primary icon-btn" onClick={() => saveRoutines(json.routines!, json.program ?? 'Programa del coach')}>
                <Save size={16} /> Guardar programa “{json.program}” ({json.routines.length} rutinas)
              </button>
            )}
          </div>
        );
      })}
      {busy && (
        <div className="bubble assistant muted">
          Pensando…{' '}
          <button className="ghost small" onClick={() => abort.current?.abort()}>
            Cancelar
          </button>
        </div>
      )}
      {pending && err && (
        <div>
          <p className="error" role="alert">
            {err}
          </p>
          <button className="ghost" onClick={() => request(pending)}>
            Reintentar
          </button>
        </div>
      )}
      <form
        className="row composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input aria-label="Pregunta a tu coach" placeholder="Pregunta a tu coach…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="primary" disabled={busy}>
          Enviar
        </button>
      </form>
    </section>
  );
}
