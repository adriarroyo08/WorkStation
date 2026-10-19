// Servidor MCP (stdio) de Workstation para Claude Desktop, Claude Code, Cursor, LM Studio…
// Origen de datos:
//   - Nube (recomendado): WORKSTATION_API_KEY (ws_… generada en la app) + WORKSTATION_SUPABASE_URL + WORKSTATION_SUPABASE_ANON_KEY.
//   - Fichero: WORKSTATION_DATA (backup JSON exportado desde la app). Por defecto ~/.workstation/data.json.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { cloudSource } from '../../shared/cloud-source';
import { TOOLS, callTool, type DataSource } from '../../shared/mcp-tools';
import { dataPath, loadData, saveData } from './store';

const env = (n: string) => process.env[n];

function source(): DataSource {
  const apiKey = env('WORKSTATION_API_KEY');
  if (apiKey) {
    const url = env('WORKSTATION_SUPABASE_URL');
    const anonKey = env('WORKSTATION_SUPABASE_ANON_KEY');
    if (!url || !anonKey) throw new Error('Con WORKSTATION_API_KEY también hacen falta WORKSTATION_SUPABASE_URL y WORKSTATION_SUPABASE_ANON_KEY');
    return cloudSource({ url, anonKey, apiKey, env });
  }
  return {
    label: dataPath(),
    load: async () => loadData(),
    save: async (d) => saveData(d),
    afterWrite: `Importa ${dataPath()} en la app para verlo.`,
    env,
  };
}

const src = source();
const server = new McpServer({ name: 'workstation', version: '0.4.0' });

for (const t of TOOLS) {
  server.registerTool(t.name, { description: t.description, inputSchema: t.shape, annotations: { readOnlyHint: !t.write } }, async (args: unknown) => {
    const r = await callTool(src, t.name, args);
    return { content: [{ type: 'text' as const, text: r.text }], isError: r.isError };
  });
}

await server.connect(new StdioServerTransport());
console.error(`workstation-mcp listo. Datos: ${src.label}`);
