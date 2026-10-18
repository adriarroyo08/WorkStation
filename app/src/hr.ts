// Frecuencia cardiaca en directo: llega del reloj Wear OS (vía app Android) o de un pulsómetro Bluetooth
// (perfil estándar Heart Rate, p. ej. bandas Polar/Garmin o relojes que lo emiten) usando Web Bluetooth.
import { useSyncExternalStore } from 'react';

interface HrState {
  bpm: number | null;
  at: number;
  source: 'watch' | 'ble' | null;
  bleName: string | null;
}

let state: HrState = { bpm: null, at: 0, source: null, bleName: null };
const subs = new Set<() => void>();
const emit = (p: Partial<HrState>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};

// Muestras del entrenamiento en curso (persisten por si se recarga la página).
const KEY = 'hr-samples';
let samples: { t: number; bpm: number }[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
})();

export function pushHeartRate(bpm: number, source: 'watch' | 'ble') {
  if (!Number.isFinite(bpm) || bpm <= 0) return;
  const t = Date.now();
  emit({ bpm: Math.round(bpm), at: t, source });
  // Como mucho una muestra cada 5 s.
  if (!samples.length || t - samples[samples.length - 1].t >= 5000) {
    samples.push({ t, bpm: Math.round(bpm) });
    try {
      localStorage.setItem(KEY, JSON.stringify(samples.slice(-5000)));
    } catch {
      /* sin almacenamiento */
    }
  }
}

export const takeSamples = () => {
  const out = samples;
  samples = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
  return out;
};
export const clearSamples = () => void takeSamples();

export function useHeartRate(): HrState & { live: boolean } {
  const s = useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
  );
  return { ...s, live: !!s.bpm && Date.now() - s.at < 15000 };
}

// ---- Web Bluetooth ----
type BtChar = EventTarget & { value?: DataView; startNotifications(): Promise<unknown> };
type BtDevice = EventTarget & { name?: string; gatt?: { connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BtChar> }> }>; disconnect(): void } };
let device: BtDevice | null = null;

export const bleSupported = () => typeof navigator !== 'undefined' && 'bluetooth' in navigator;

export async function connectBleHeartRate(): Promise<string> {
  const bt = (navigator as unknown as { bluetooth: { requestDevice(o: unknown): Promise<BtDevice> } }).bluetooth;
  device = await bt.requestDevice({ filters: [{ services: ['heart_rate'] }] });
  const server = await device.gatt!.connect();
  const svc = await server.getPrimaryService('heart_rate');
  const ch = await svc.getCharacteristic('heart_rate_measurement');
  ch.addEventListener('characteristicvaluechanged', () => {
    const v = ch.value!;
    // Flags bit0: formato 16 bits.
    const bpm = v.getUint8(0) & 1 ? v.getUint16(1, true) : v.getUint8(1);
    pushHeartRate(bpm, 'ble');
  });
  device.addEventListener('gattserverdisconnected', () => emit({ bleName: null }));
  await ch.startNotifications();
  emit({ bleName: device.name ?? 'Pulsómetro' });
  return device.name ?? 'Pulsómetro';
}

export function disconnectBle() {
  device?.gatt?.disconnect();
  device = null;
  emit({ bleName: null });
}
