import { describe, expect, it } from 'vitest';
import { mcpClientConfig, mcpEndpoint } from './mcp-clients';

describe('configuraciones MCP por cliente', () => {
  it('construye el endpoint del usuario sin barras duplicadas', () => {
    expect(mcpEndpoint('https://usuario.supabase.co///')).toBe('https://usuario.supabase.co/functions/v1/mcp');
  });
  for (const client of ['gemini', 'claude-code'] as const) {
    it(`genera JSON válido para ${client} con credenciales solo en Authorization`, () => {
      const key = 'ws_"\\\nsecreto';
      const config = JSON.parse(mcpClientConfig(client, 'https://otro.supabase.co', key)).mcpServers.workstation;
      expect(config).toEqual({
        ...(client === 'gemini' ? { httpUrl: 'https://otro.supabase.co/functions/v1/mcp' } : { type: 'http', url: 'https://otro.supabase.co/functions/v1/mcp' }),
        headers: { Authorization: `Bearer ${key}` },
      });
      expect(config.url ?? config.httpUrl).not.toContain(key);
    });
  }
});
