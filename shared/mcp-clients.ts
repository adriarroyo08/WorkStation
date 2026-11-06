// Revisar las fuentes oficiales cuando cambien los clientes. Nunca incluir secretos en URLs.
export const MCP_GUIDES_CHECKED = '2026-11-02';
export const MCP_GUIDES = [
  {
    id: 'claude-remote',
    name: 'Claude remoto',
    source: 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp',
    instructions:
      'En Personalizar → Conectores, añade un conector web personalizado con la URL del servidor. Elige «No sign in» y en «Request headers» añade Authorization con el valor Bearer seguido de tu key. Actívalo en la conversación. Requiere un endpoint público HTTPS; en organizaciones, permiso del administrador.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    source: 'https://developers.openai.com/plugins/build/auth',
    instructions:
      'La conexión directa con esta API key no está soportada por la autenticación documentada de ChatGPT. Los datos privados requieren OAuth 2.1 y descubrimiento de autorización, que Workstation aún no implementa. No elijas acceso anónimo ni pegues la key en la URL. La disponibilidad de conectores depende de tu cuenta y de las políticas del espacio.',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    source: 'https://geminicli.com/docs/tools/mcp-server/',
    instructions:
      'Instala y autentica Gemini CLI. Combina la configuración copiada con tu archivo ~/.gemini/settings.json, sin sobrescribir otros servidores. Usa httpUrl para HTTP y headers para Authorization. Reinicia el cliente y comprueba el servidor con /mcp.',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    source: 'https://code.claude.com/docs/en/mcp',
    instructions:
      'Instala y autentica Claude Code. Combina la configuración copiada con .mcp.json de tu proyecto, sin sobrescribir otros servidores. Usa type: http y Authorization. Acepta el servidor del proyecto y comprueba su estado con /mcp. El archivo contiene tu key: no lo subas al repositorio.',
  },
] as const;

export function mcpEndpoint(projectUrl: string): string {
  return `${projectUrl.replace(/\/+$/, '')}/functions/v1/mcp`;
}

export function mcpClientConfig(client: 'gemini' | 'claude-code', projectUrl: string, key: string): string {
  const url = mcpEndpoint(projectUrl);
  return JSON.stringify(
    {
      mcpServers: {
        workstation: {
          ...(client === 'gemini' ? { httpUrl: url } : { type: 'http', url }),
          headers: { Authorization: `Bearer ${key}` },
        },
      },
    },
    null,
    2,
  );
}
