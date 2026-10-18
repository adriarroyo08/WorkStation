// Cliente mínimo para APIs compatibles con OpenAI (chat completions).
// Todos estos proveedores tienen nivel gratuito o son locales.

export interface AiProvider {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  keyUrl?: string;
  needsKey: boolean;
}

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'gemini', label: 'Google Gemini (gratis con límites)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/apikey', needsKey: true },
  { id: 'groq', label: 'Groq (gratis con límites)', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', keyUrl: 'https://console.groq.com/keys', needsKey: true },
  { id: 'openrouter', label: 'OpenRouter (modelos :free)', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free', keyUrl: 'https://openrouter.ai/keys', needsKey: true },
  { id: 'ollama', label: 'Ollama (local, 100% gratis)', baseUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.2', needsKey: false },
  { id: 'custom', label: 'Otro (compatible OpenAI)', baseUrl: '', defaultModel: '', needsKey: false },
];

export interface AiConfig {
  providerId: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chat(cfg: AiConfig, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  if (!cfg.baseUrl || !cfg.model) throw new Error('Configura proveedor y modelo de IA en Ajustes.');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`;
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({ model: cfg.model, messages, temperature: 0.5 }),
  });
  if (!res.ok) throw new Error(`Error ${res.status} del proveedor de IA: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content ?? '';
}

export const COACH_SYSTEM_PROMPT = `Eres un entrenador personal experto en fuerza e hipertrofia. Respondes en español, de forma concisa y práctica.
Basas tus consejos en el historial de entrenamiento del usuario que se te proporciona. Usa principios de sobrecarga progresiva, volumen semanal por grupo muscular y gestión de fatiga.
Si el usuario pide una rutina, además de explicarla incluye al final UN bloque de código \`\`\`json con este formato exacto:
{"name": "...", "notes": "...", "exercises": [{"name": "Press de banca (barra)", "sets": 4, "reps": 8, "weight": 60, "restSec": 120}]}
Usa nombres de ejercicio en español. "weight" es opcional (kg).`;

// Extrae el primer bloque ```json ... ``` de una respuesta.
export function extractJsonBlock(text: string): unknown | undefined {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (!m) return undefined;
  try {
    return JSON.parse(m[1]);
  } catch {
    return undefined;
  }
}
