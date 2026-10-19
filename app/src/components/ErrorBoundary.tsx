import { get } from 'idb-keyval';
import { Component, type ErrorInfo, type ReactNode } from 'react';

// Si algo revienta, nunca se pierden los datos: se puede descargar el backup y recargar.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Workstation error', error, info.componentStack);
  }

  private async downloadBackup() {
    const data = await get('data');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `workstation-rescate-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="center" style={{ padding: 24, textAlign: 'center' }}>
        <div>
          <div className="big-emoji">🛠️</div>
          <h1>Algo ha fallado</h1>
          <p className="muted">Tus datos están a salvo en este dispositivo. Descarga una copia y recarga la app.</p>
          <pre className="small muted" style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button className="primary full" onClick={() => this.downloadBackup()}>
            Descargar mis datos (JSON)
          </button>
          <button className="ghost full" onClick={() => location.reload()}>
            Recargar
          </button>
        </div>
      </section>
    );
  }
}
