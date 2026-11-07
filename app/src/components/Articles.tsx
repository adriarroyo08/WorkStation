import { createElement, Fragment, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { ArticleBlock, ArticleInline, ArticleLibrary, EvidenceLevel } from '../../../shared/articles';
import { filterArticles } from '../../../shared/article-filter';
import { loadArticles, parseArticleMarkdown, safeArticleUrl } from '../articles';
import { Back, Sheet } from './ui';
import './Articles.css';

const EVIDENCE: Record<EvidenceLevel, string> = { metaanalisis: 'Metaanálisis', revision: 'Revisión', ensayo: 'Ensayo', observacional: 'Observacional', consenso: 'Consenso' };

function Inline({ nodes }: { nodes: ArticleInline[] }) {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'code':
        return <code key={i}>{node.text}</code>;
      case 'strong':
        return <strong key={i}>{node.text}</strong>;
      case 'emphasis':
        return <em key={i}>{node.text}</em>;
      case 'link':
        return (
          <a key={i} href={safeArticleUrl(node.href)} target="_blank" rel="noopener noreferrer">
            {node.text}
          </a>
        );
      default:
        return <Fragment key={i}>{node.text}</Fragment>;
    }
  });
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'heading':
      return createElement(`h${Math.min(6, Math.max(2, block.level))}`, null, <Inline nodes={block.children} />);
    case 'paragraph':
      return (
        <p>
          <Inline nodes={block.children} />
        </p>
      );
    case 'quote':
      return (
        <blockquote>
          <Inline nodes={block.children} />
        </blockquote>
      );
    case 'code':
      return (
        <pre>
          <code>{block.text}</code>
        </pre>
      );
    case 'list':
      return createElement(
        block.ordered ? 'ol' : 'ul',
        null,
        block.items.map((nodes, i) => (
          <li key={i}>
            <Inline nodes={nodes} />
          </li>
        )),
      );
  }
}

function useArticles() {
  const [library, setLibrary] = useState<ArticleLibrary | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadArticles().then(
      (value) => {
        if (live) {
          setLibrary(value);
          setError(false);
        }
      },
      () => {
        if (live) setError(true);
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  return {
    library,
    error,
    retry: () => {
      setError(false);
      setAttempt((n) => n + 1);
    },
  };
}

export function RelatedArticles({ exerciseId }: { exerciseId: string }) {
  const { library } = useArticles();
  const [open, setOpen] = useState(false);
  if (!library || !filterArticles(library.index, '', [], exerciseId).length) return null;
  return open ? (
    <Sheet title="Artículos relacionados" onClose={() => setOpen(false)}>
      <Articles exerciseId={exerciseId} onBack={() => setOpen(false)} />
    </Sheet>
  ) : (
    <button className="line" onClick={() => setOpen(true)}>
      <BookOpen size={18} />
      <span className="grow">Artículos relacionados</span>
      <ChevronRight size={16} />
    </button>
  );
}

export default function Articles({ onBack, exerciseId, initialSlug }: { onBack: () => void; exerciseId?: string; initialSlug?: string }) {
  const { library, error, retry } = useArticles();
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [slug, setSlug] = useState<string | null>(initialSlug ?? null);
  const heading = useRef<HTMLHeadingElement>(null);
  const listScroll = useRef(0);
  const article = library?.articles.find((item) => item.slug === slug);
  useEffect(() => {
    heading.current?.focus();
  }, [slug]);
  const backToList = () => {
    setSlug(null);
    requestAnimationFrame(() => {
      window.scrollTo(0, listScroll.current);
      document.getElementById(`article-${slug}`)?.focus({ preventScroll: true });
    });
  };
  const list = filterArticles(library?.index ?? [], query, tags, exerciseId);
  const availableTags = [...new Set(filterArticles(library?.index ?? [], '', [], exerciseId).flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b, 'es'));
  return (
    <section className="articles">
      <Back onClick={article && !initialSlug ? backToList : onBack} />
      <h1 ref={heading} tabIndex={-1}>
        {article ? article.title : exerciseId ? 'Artículos relacionados' : 'Biblioteca de artículos'}
      </h1>
      {initialSlug && library && !article ? (
        <p role="status">No se encontró este artículo en la biblioteca incluida en la app.</p>
      ) : article ? (
        <>
          <p className="muted">
            <time dateTime={article.date}>{new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(article.date))}</time> · Evidencia: {EVIDENCE[article.evidence]}
          </p>
          <p className="article-summary">{article.summary}</p>
          <div className="article-tags">
            {article.tags.map((tag) => (
              <span className="muted small" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
          <article className="article-body">
            {parseArticleMarkdown(article.markdown).map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </article>
          <section aria-label="Referencias">
            <h2>Referencias</h2>
            <p className="muted small">Los enlaces externos requieren conexión.</p>
            <ul>
              {article.sources.map((source) => (
                <li key={source.doi}>
                  <a href={`https://doi.org/${source.doi}`} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                  <small className="muted"> · {EVIDENCE[source.level]}</small>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          <p className="muted">Guías de entrenamiento incluidas en la app para leer sin conexión.</p>
          <input aria-label="Buscar artículos" placeholder="Buscar por título, resumen o etiqueta…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="article-tags" role="group" aria-label="Filtrar por etiquetas">
            {availableTags.map((tag) => (
              <button
                key={tag}
                className={tags.includes(tag) ? 'primary' : 'ghost'}
                aria-pressed={tags.includes(tag)}
                onClick={() => setTags((selected) => (selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag]))}
              >
                {tag}
              </button>
            ))}
          </div>
          {(query || tags.length > 0) && (
            <button
              className="ghost"
              onClick={() => {
                setQuery('');
                setTags([]);
              }}
            >
              Limpiar filtros
            </button>
          )}
          {error ? (
            <div role="alert">
              <p>No se pudieron cargar los artículos incluidos en la app.</p>
              <button onClick={retry}>Reintentar</button>
            </div>
          ) : !library ? (
            <p role="status">Cargando artículos…</p>
          ) : (
            <>
              <p role="status" className="muted small">
                {list.length} {list.length === 1 ? 'artículo' : 'artículos'}
              </p>
              {!list.length && <p>{library.index.length ? 'No hay artículos que coincidan con estos filtros.' : 'Todavía no hay artículos disponibles.'}</p>}
              <div className="list">
                {list.map((item) => (
                  <button
                    id={`article-${item.slug}`}
                    className="item article-card"
                    key={item.slug}
                    onClick={() => {
                      listScroll.current = window.scrollY;
                      setSlug(item.slug);
                      window.scrollTo(0, 0);
                    }}
                  >
                    <b>{item.title}</b>
                    <span className="muted">{item.summary}</span>
                    <small className="muted">
                      {item.tags.join(' · ')} · {EVIDENCE[item.evidence]}
                    </small>
                    <span className="accent small">Leer artículo →</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
