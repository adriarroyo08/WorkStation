import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const requestOptions = { timeout: 5_000 };

async function withServer(dataPath, run) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { WORKSTATION_DATA: dataPath },
    stderr: 'pipe',
  });
  let diagnostics = '';
  transport.stderr.setEncoding('utf8').on('data', (chunk) => {
    diagnostics += chunk;
  });
  const client = new Client({ name: 'workstation-stdio-test', version: '1.0.0' });
  const protocolErrors = [];
  client.onerror = (error) => protocolErrors.push(error);

  try {
    await client.connect(transport, requestOptions);
    assert.equal(client.getServerVersion()?.name, 'workstation');
    await run(client);
  } finally {
    await transport.close();
  }

  assert.deepEqual(protocolErrors, [], 'stdout debe contener solo mensajes MCP válidos');
  assert.ok(diagnostics.includes(`workstation-mcp listo. Datos: ${dataPath}`), diagnostics);
}

async function listWorkouts(client) {
  const result = await client.callTool({ name: 'list_workouts' }, undefined, requestOptions);
  assert.ok(!result.isError, JSON.stringify(result.content));
  assert.equal(result.content?.[0]?.type, 'text');
  return JSON.parse(result.content[0].text);
}

test('el MCP local negocia por stdio y conserva las escrituras al reiniciar', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'workstation-mcp-'));
  const dataPath = join(directory, 'backup.json');
  const name = 'Entrenamiento sintético de sentadilla';
  const date = '2026-01-15T10:00:00.000Z';
  const existingWorkout = {
    id: 'entreno-de-prueba',
    name: 'Entrenamiento del backup sintético',
    startedAt: '2026-01-12T10:00:00.000Z',
    exercises: [],
  };

  try {
    await writeFile(dataPath, JSON.stringify({ version: 1, workouts: [existingWorkout] }));

    await withServer(dataPath, async (client) => {
      const { tools } = await client.listTools(undefined, requestOptions);
      const names = tools.map((tool) => tool.name);
      assert.ok(names.includes('log_workout'));
      assert.ok(names.includes('list_workouts'));
      const { resources } = await client.listResources(undefined, requestOptions);
      assert.ok(resources.some((resource) => resource.name === 'articles' && resource.uri === 'workstation://articles/library'));
      const workouts = await listWorkouts(client);
      assert.deepEqual(workouts.map((workout) => workout.id), [existingWorkout.id]);

      const result = await client.callTool(
        { name: 'log_workout', arguments: { name, date, exercises: [{ name: 'Sentadilla (barra)', sets: [{ weight: 100, reps: 5 }] }] } },
        undefined,
        requestOptions,
      );
      assert.ok(!result.isError, JSON.stringify(result.content));
    });

    await withServer(dataPath, async (client) => {
      const workouts = await listWorkouts(client);
      assert.equal(workouts.length, 2);
      assert.equal(workouts[0].name, name);
      assert.equal(workouts[0].date, date);
      assert.equal(workouts[1].id, existingWorkout.id);
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
