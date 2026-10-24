import { useEffect, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { MEASUREMENT_FIELDS, uid, type Measurement, type MeasurementField } from '../../../shared/types';
import { compressImage, deletePhoto, fmtDate, loadPhoto, savePhoto, useStore } from '../store';
import LineChart from './LineChart';
import { fromUnit, toUnit, weightUnit } from '../../../shared/units';
import { Back, Sheet } from './ui';

export const MEASURE_LABELS: Record<MeasurementField, string> = {
  // El peso corporal se muestra en la unidad elegida (se guarda en kg).
  get bodyweight() {
    return `Peso corporal (${weightUnit()})`;
  },
  bodyFat: 'Grasa corporal (%)',
  neck: 'Cuello (cm)',
  shoulders: 'Hombros (cm)',
  chest: 'Pecho (cm)',
  waist: 'Cintura (cm)',
  hips: 'Cadera (cm)',
  leftArm: 'Brazo izq. (cm)',
  rightArm: 'Brazo der. (cm)',
  leftThigh: 'Muslo izq. (cm)',
  rightThigh: 'Muslo der. (cm)',
  leftCalf: 'Gemelo izq. (cm)',
  rightCalf: 'Gemelo der. (cm)',
};

const photoIds = (m: Measurement) => m.photos ?? [];
// Valor visible de un campo: el peso corporal se convierte a la unidad elegida.
const shown = (f: MeasurementField, v: number | undefined) => (v === undefined ? undefined : f === 'bodyweight' ? toUnit(v) : v);

export default function Measurements({ onBack }: { onBack: () => void }) {
  const { data, update } = useStore();
  const [field, setField] = useState<MeasurementField>('bodyweight');
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<'charts' | 'photos'>('charts');
  const list = [...data.measurements].sort((a, b) => b.date.localeCompare(a.date));
  const withField = list.filter((m) => m[field] !== undefined).reverse();
  const latest = (f: MeasurementField) => shown(f, list.find((m) => m[f] !== undefined)?.[f]);
  const first = (f: MeasurementField) => shown(f, [...list].reverse().find((m) => m[f] !== undefined)?.[f]);

  return (
    <section>
      <Back
        onClick={onBack}
        right={
          <button className="primary" onClick={() => setAdding(true)}>
            + Registrar
          </button>
        }
      />
      <h1>Medidas</h1>
      <div className="segmented">
        <button className={tab === 'charts' ? 'on' : ''} onClick={() => setTab('charts')}>
          Gráficas
        </button>
        <button className={tab === 'photos' ? 'on' : ''} onClick={() => setTab('photos')}>
          Fotos de progreso
        </button>
      </div>
      {tab === 'charts' && (
        <>
          <div className="measure-grid">
            {MEASUREMENT_FIELDS.map((f) => {
              const l = latest(f);
              const d = l !== undefined && first(f) !== undefined ? Math.round((l - first(f)!) * 10) / 10 : 0;
              return (
                <button key={f} className={`card tile ${field === f ? 'on' : ''}`} onClick={() => setField(f)}>
                  <small className="muted">{MEASURE_LABELS[f]}</small>
                  <b>{l === undefined ? '—' : l.toLocaleString('es-ES')}</b>
                  {d !== 0 && <small className={d > 0 ? 'delta up' : 'delta down'}>{(d > 0 ? '+' : '') + d.toLocaleString('es-ES')}</small>}
                </button>
              );
            })}
          </div>
          <h3>{MEASURE_LABELS[field]}</h3>
          <LineChart points={withField.map((m) => ({ x: Date.parse(m.date), y: shown(field, m[field])! }))} />
          <h3>Registros</h3>
          {list.map((m) => (
            <div key={m.id} className="card small row">
              <div className="grow">
                <b>{fmtDate(m.date)}</b>
                <div className="muted">
                  {MEASUREMENT_FIELDS.filter((f) => m[f] !== undefined)
                    .map((f) => `${MEASURE_LABELS[f].split(' (')[0]}: ${String(shown(f, m[f])).replace('.', ',')}`)
                    .join(' · ')}
                  {photoIds(m).length ? ` · ${photoIds(m).length} ${photoIds(m).length === 1 ? 'foto' : 'fotos'}` : ''}
                </div>
              </div>
              <button
                className="ghost icon-btn"
                aria-label="Borrar registro"
                onClick={() => {
                  if (!confirm('¿Borrar registro?')) return;
                  photoIds(m).forEach(deletePhoto);
                  update((d) => void (d.measurements = d.measurements.filter((x) => x.id !== m.id)));
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!list.length && <p className="muted">Registra tu peso y medidas para ver tu evolución.</p>}
        </>
      )}
      {tab === 'photos' && <Photos list={list} />}
      {adding && <AddMeasurement onClose={() => setAdding(false)} />}
    </section>
  );
}

function AddMeasurement({ onClose }: { onClose: () => void }) {
  const { update } = useStore();
  const [vals, setVals] = useState<Partial<Record<MeasurementField, string>>>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [photos, setPhotos] = useState<File[]>([]);
  const save = async () => {
    const id = uid();
    const ids: string[] = [];
    for (const f of photos) {
      const pid = uid();
      await savePhoto(pid, await compressImage(f));
      ids.push(pid);
    }
    const m: Measurement = { id, date: new Date(`${date}T12:00:00`).toISOString(), ...(ids.length ? { photos: ids } : {}) };
    for (const [k, v] of Object.entries(vals))
      if (v && !Number.isNaN(Number(v.replace(',', '.')))) {
        const n = Number(v.replace(',', '.'));
        m[k as MeasurementField] = k === 'bodyweight' ? fromUnit(n) : n;
      }
    if (Object.keys(m).length <= 2 && !ids.length) return alert('Introduce al menos un valor');
    update((d) => void d.measurements.push(m));
    onClose();
  };
  return (
    <Sheet title="Nuevo registro" onClose={onClose}>
      <label>
        Fecha
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="grid2">
        {MEASUREMENT_FIELDS.map((f) => (
          <label key={f}>
            {MEASURE_LABELS[f]}
            <input inputMode="decimal" value={vals[f] ?? ''} onChange={(e) => setVals({ ...vals, [f]: e.target.value })} />
          </label>
        ))}
      </div>
      <label>
        <Camera size={16} className="ico" /> Fotos de progreso (se guardan solo en este dispositivo)
        <input type="file" accept="image/*" multiple onChange={(e) => setPhotos([...(e.target.files ?? [])])} />
      </label>
      <button className="primary full" onClick={save}>
        Guardar
      </button>
    </Sheet>
  );
}

function PhotoImg({ id, onClick }: { id: string; onClick?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    loadPhoto(id).then((b) => b && setUrl((u = URL.createObjectURL(b))));
    return () => void (u && URL.revokeObjectURL(u));
  }, [id]);
  return url ? <img src={url} alt="Foto de progreso" className="photo" onClick={onClick} /> : <div className="photo placeholder" />;
}

function Photos({ list }: { list: Measurement[] }) {
  const all = list.flatMap((m) => photoIds(m).map((id) => ({ id, date: m.date })));
  const [compare, setCompare] = useState<string[]>([]);
  const [big, setBig] = useState<string | null>(null);
  if (!all.length) return <p className="muted">Añade fotos al registrar medidas para ver tu transformación. Toca dos fotos para compararlas.</p>;
  const toggle = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));
  return (
    <>
      {compare.length === 2 && (
        <div className="compare">
          {compare.map((id) => (
            <div key={id}>
              <PhotoImg id={id} />
              <small className="muted">{fmtDate(all.find((p) => p.id === id)!.date)}</small>
            </div>
          ))}
        </div>
      )}
      <p className="muted small">Toca para seleccionar (2 = comparar), mantén pulsado para ampliar.</p>
      <div className="photo-grid">
        {all.map((p) => (
          <div key={p.id} className={compare.includes(p.id) ? 'sel' : ''} onContextMenu={(e) => (e.preventDefault(), setBig(p.id))}>
            <PhotoImg id={p.id} onClick={() => toggle(p.id)} />
            <small className="muted">{fmtDate(p.date)}</small>
          </div>
        ))}
      </div>
      {big && (
        <Sheet onClose={() => setBig(null)}>
          <PhotoImg id={big} />
        </Sheet>
      )}
    </>
  );
}
