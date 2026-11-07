import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { cloud } from '../cloud';
import { Back, useScrollTop } from './ui';
import { filterNews, NEWS_CACHE_KEY, NEWS_TOPICS, newsUnavailable, parseNewsResult } from '../../../shared/news-reader';
import type { NewsResult } from '../../../shared/news-collector';
import './News.css';

function cached(): NewsResult | undefined {
  try {
    return parseNewsResult(JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) ?? 'null'));
  } catch {
    return;
  }
}
const date = (value: string) => new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

export default function News({ onBack }: { onBack: () => void }) {
  const [result, setResult] = useState(cached);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [source, setSource] = useState('');
  const [topic, setTopic] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const controller = useRef<AbortController | null>(null);
  useScrollTop();

  async function refresh() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError(false);
    const timer = setTimeout(() => request.abort(), 15000);
    try {
      const url = cloud.config().url;
      if (!url) throw new Error('Sin endpoint');
      const response = await fetch(`${url.replace(/\/$/, '')}/functions/v1/mcp/news`, { signal: request.signal, redirect: 'error', credentials: 'omit' });
      if (!response.ok) throw new Error('Noticias no disponibles');
      const next = parseNewsResult(await response.json());
      if (!next || newsUnavailable(next)) throw new Error('Respuesta no disponible');
      if (controller.current !== request) return;
      setResult(next);
      try {
        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(next));
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    } catch {
      if (controller.current === request) setError(true);
    } finally {
      clearTimeout(timer);
      if (controller.current === request) setBusy(false);
    }
  }

  useEffect(() => {
    heading.current?.focus();
    void refresh();
    const connection = () => setOffline(!navigator.onLine);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    return () => {
      controller.current?.abort();
      controller.current = null;
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
    };
  }, []);

  const items = filterNews(result?.items ?? [], source, topic);
  const sources = [...new Map((result?.items ?? []).map((a) => [a.sourceId, a.journalOrSource || a.sourceId])).entries()];
  return (
    <section className="news">
      <Back
        onClick={onBack}
        right={
          <button className="ghost icon-btn" onClick={() => void refresh()} disabled={busy}>
            <RefreshCw size={18} aria-hidden />
            {busy ? 'Actualizando…' : 'Actualizar'}
          </button>
        }
      />
      <h1 tabIndex={-1} ref={heading}>
        Noticias
      </h1>
      <p className="muted">Ciencia y entrenamiento, desde sus fuentes originales.</p>
      <div role="status" aria-live="polite">
        <p className="small muted">{result?.updatedAt ? `Última actualización: ${date(result.updatedAt)}` : 'Todavía sin actualización'}</p>
        {offline && <p>Sin conexión. {result ? 'Estás leyendo la última copia guardada.' : 'Conéctate para descargar noticias.'}</p>}
        {error && <p>{result ? 'No se pudo actualizar. Conservamos las noticias anteriores.' : 'No se pudieron cargar las noticias y no hay copia guardada. Vuelve a intentarlo.'}</p>}
        {storageError && <p>No se pudo guardar la copia para leer sin conexión.</p>}
        {result?.sources.some((s) => s.stale || s.error) && <p className="small muted">Algunas fuentes no se han podido actualizar; sus noticias pueden estar desactualizadas.</p>}
      </div>
      <div className="news-filters">
        <label>
          Fuente
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Todas las fuentes</option>
            {sources.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tema
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Todos los temas</option>
            {Object.entries(NEWS_TOPICS).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(source || topic) && (
        <button
          className="link"
          onClick={() => {
            setSource('');
            setTopic('');
          }}
        >
          Limpiar filtros
        </button>
      )}
      <p className="small muted" role="status">
        {items.length} noticias
      </p>
      {result && !items.length && (
        <div className="card">
          <p>{result.items.length ? 'No hay noticias con estos filtros.' : 'Todavía no hay noticias disponibles.'}</p>
        </div>
      )}
      <div className="news-list" aria-busy={busy}>
        {items.map((a) => (
          <article key={a.id} className="card">
            <p className="small muted">
              {a.journalOrSource || a.sourceId} · {a.publishedAt ? <time dateTime={a.publishedAt}>{date(a.publishedAt)}</time> : 'Fecha desconocida'}
            </p>
            <h2>{a.title}</h2>
            {a.shortSummary && <p>{a.shortSummary}</p>}
            <div className="news-footer">
              <ul className="exinfo-chips" aria-label="Temas">
                {a.topics.map((t) => (
                  <li key={t}>{NEWS_TOPICS[t]}</li>
                ))}
              </ul>
              {!!a.authors?.length && (
                <span className="news-authors muted small" title={a.authors.join(', ')}>
                  {a.authors.join(', ')}
                </span>
              )}
              <a className="icon-btn small" href={a.url} target="_blank" rel="noopener noreferrer">
                Leer original<span className="sr-only">: {a.title} (abre en otra pestaña)</span>
                <ExternalLink size={16} aria-hidden />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
