# Verificación de las guías MCP (#41)

Fecha: 2026-11-02. Chromium de Playwright en este PC Windows, build de producción,
Supabase simulado y sin cuentas de clientes externos.

- `api-keys-before-light.png` y `api-keys-before-dark.png`: pantalla anterior,
  capturada desde `origin/main` antes de implementar. La ayuda anterior solo
  aparecía mientras se mostraba una key recién creada.
- `mcp-guides-light.png` y `mcp-guides-dark.png`: las cuatro guías desplegadas,
  con movimiento reducido y foco de teclado en la copia de Claude Code.

`e2e/account.spec.ts` comprueba en ambos temas:

- Apertura de cada guía con Enter, foco y activación de los botones por teclado.
- Copia exacta del endpoint, cabecera Bearer y JSON específico de cada CLI mediante
  un portapapeles simulado. La configuración contiene el endpoint del usuario.
- ChatGPT muestra la incompatibilidad con la autenticación del servidor actual y
  no ofrece copiar una configuración que prometa conectarlo.
- Enlaces oficiales HTTPS con `noopener noreferrer`; auditoría axe AA sin infracciones
  con todas las guías abiertas, además de la auditoría de la suite general.
- La key no aparece en las peticiones del mock ni se guarda en texto plano; las
  copias con credenciales desaparecen al pulsar «Ya la he guardado» y la key no
  reaparece al recargar.

Las fuentes oficiales y su fecha de comprobación se mantienen en
`shared/mcp-clients.ts` y README. Los tests no afirman haber conectado cuentas
reales: verifican el flujo y el contenido de configuración con mocks, como pide
la issue.
