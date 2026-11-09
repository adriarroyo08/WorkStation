// Prueba la función delete-account con Auth simulado: quién puede borrar y qué usuario se borra.
import { describe, expect, it, vi } from 'vitest';
import { deleteAccountHandler } from './functions/delete-account/handler';

const URL_ = 'https://proyecto.supabase.co';
const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function setup({ user = new Response(JSON.stringify({ id: USER })), removed = new Response('{}') }: { user?: Response; removed?: Response } = {}) {
  const http = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    return String(input).endsWith('/auth/v1/user') ? user.clone() : removed.clone();
  });
  const handle = deleteAccountHandler({ url: URL_, anonKey: 'anon', serviceKey: 'service', fetch: http as typeof fetch });
  return { http, handle };
}
const call = (handle: (r: Request) => Promise<Response>, headers: Record<string, string> = { authorization: 'Bearer token-usuario' }, body?: string, method = 'POST') =>
  handle(new Request(`${URL_}/functions/v1/delete-account`, { method, headers, body }));
const deletes = (http: ReturnType<typeof setup>['http']) => http.mock.calls.filter(([, init]) => init?.method === 'DELETE');

describe('función delete-account', () => {
  it('borra el usuario de la sesión con la clave de servicio', async () => {
    const { http, handle } = setup();
    const res = await call(handle);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(http.mock.calls[0][1]?.headers).toMatchObject({ authorization: 'Bearer token-usuario', apikey: 'anon' });
    const [[url, init]] = deletes(http);
    expect(url).toBe(`${URL_}/auth/v1/admin/users/${USER}`);
    expect(init?.headers).toMatchObject({ authorization: 'Bearer service', apikey: 'service' });
  });

  it('ignora cualquier usuario indicado en la petición', async () => {
    const { http, handle } = setup();
    await call(handle, { authorization: 'Bearer token-usuario', 'content-type': 'application/json' }, JSON.stringify({ user_id: OTHER, id: OTHER }));
    expect(deletes(http)).toHaveLength(1);
    expect(deletes(http)[0][0]).toBe(`${URL_}/auth/v1/admin/users/${USER}`);
  });

  it.each([
    ['sin cabecera', {}],
    ['sin Bearer', { authorization: 'token-usuario' }],
    ['Bearer vacío', { authorization: 'Bearer ' }],
  ])('exige la sesión: %s', async (_name, headers) => {
    const { http, handle } = setup();
    expect((await call(handle, headers as Record<string, string>)).status).toBe(401);
    expect(http).not.toHaveBeenCalled();
  });

  it.each([401, 403])('rechaza un token que Auth no acepta (%i), sin intentar borrar', async (status) => {
    const { http, handle } = setup({ user: new Response('{}', { status }) });
    expect((await call(handle)).status).toBe(401);
    expect(deletes(http)).toHaveLength(0);
  });

  it('rechaza una respuesta de Auth sin un id válido', async () => {
    const { http, handle } = setup({ user: new Response(JSON.stringify({ id: '../otro' })) });
    expect((await call(handle)).status).toBe(401);
    expect(deletes(http)).toHaveLength(0);
  });

  it('distingue un fallo de Auth de una sesión inválida y no borra', async () => {
    const { http, handle } = setup({ user: new Response('', { status: 503 }) });
    expect((await call(handle)).status).toBe(502);
    expect(deletes(http)).toHaveLength(0);
  });

  it('informa del fallo al borrar sin dar detalles internos', async () => {
    const { handle } = setup({ removed: new Response('detalle interno', { status: 500 }) });
    const res = await call(handle);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('detalle interno');
  });

  it('un error de red responde 502 y no revela el motivo', async () => {
    const handle = deleteAccountHandler({
      url: URL_,
      anonKey: 'anon',
      serviceKey: 'service',
      fetch: (async () => {
        throw new Error('detalle interno');
      }) as typeof fetch,
    });
    const res = await call(handle);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('detalle interno');
  });

  it('si el usuario ya no existe, el borrado se da por hecho', async () => {
    const { handle } = setup({ removed: new Response('{}', { status: 404 }) });
    expect((await call(handle)).status).toBe(200);
  });

  it('solo acepta POST y responde al preflight sin tocar Auth', async () => {
    const { http, handle } = setup();
    expect((await call(handle, undefined, undefined, 'GET')).status).toBe(405);
    const preflight = await call(handle, {}, undefined, 'OPTIONS');
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-headers')).toContain('authorization');
    expect(http).not.toHaveBeenCalled();
  });
});
