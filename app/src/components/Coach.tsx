import { useRef, useState } from 'react';
import { chat, COACH_SYSTEM_PROMPT, extractJsonBlock, type ChatMessage } from '../../../shared/ai';
import { routineFromDraft, type RoutineDraft } from '../../../shared/data';
import { trainingSummary } from '../../../shared/stats';
import { useStore } from '../store';

const QUICK = [
  'Analiza mis últimas semanas: ¿qué estoy haciendo bien y qué debería mejorar?',
  'Crea una rutina Torso/Pierna de 4 días adaptada a mis marcas actuales.',
  '¿Qué pesos debería usar en mi próximo entrenamiento para progresar?',
  '¿Tengo algún grupo muscular descompensado por volumen?',
];

export default function Coach({ goSettings }: { goSettings: () => void }) {
  const { data, ai, update } = useStore();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const abort = useRef<AbortController | null>(null);

  const configured = ai.baseUrl && ai.model;

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: ChatMessage[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    setErr('');
    abort.current = new AbortController();
    try {
      const system: ChatMessage = { role: 'system', content: `${COACH_SYSTEM_PROMPT}\n\nFecha de hoy: ${new Date().toISOString().slice(0, 10)}\n\nDATOS DEL USUARIO:\n${trainingSummary(data, 15)}` };
      const reply = await chat(ai, [system, ...next], abort.current.signal);
      setMsgs([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveRoutine = (draft: RoutineDraft) => {
    try {
      update((d) => void d.routines.push(routineFromDraft(d, draft)));
      alert(`Rutina "${draft.name}" guardada en Rutinas.`);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (!configured)
    return (
      <section>
        <h1>Coach IA</h1>
        <p>Conecta una IA gratuita (Gemini, Groq, OpenRouter u Ollama) con tu API key en Ajustes.</p>
        <button className="primary" onClick={goSettings}>
          Ir a Ajustes
        </button>
      </section>
    );

  return (
    <section className="coach">
      <h1>Coach IA</h1>
      <p className="muted small">
        {ai.model} · tus datos se envían solo al proveedor que configuraste.
        {msgs.length > 0 && (
          <button className="ghost small" onClick={() => setMsgs([])}>
            Nueva conversación
          </button>
        )}
      </p>
      {!msgs.length && (
        <div className="list">
          {QUICK.map((q) => (
            <button key={q} className="item" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      {msgs.map((m, i) => {
        const json = m.role === 'assistant' ? (extractJsonBlock(m.content) as RoutineDraft | undefined) : undefined;
        return (
          <div key={i} className={`bubble ${m.role}`}>
            <div className="pre">{m.content.replace(/```json[\s\S]*?```/g, '').trim()}</div>
            {json?.exercises && (
              <button className="primary" onClick={() => saveRoutine(json)}>
                💾 Guardar rutina “{json.name}”
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
      {err && <p className="error">{err}</p>}
      <form
        className="row composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input placeholder="Pregunta a tu coach…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="primary" disabled={busy}>
          Enviar
        </button>
      </form>
    </section>
  );
}
