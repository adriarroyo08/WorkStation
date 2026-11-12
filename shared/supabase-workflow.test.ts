import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../.github/workflows/supabase.yml', import.meta.url), 'utf8');
const steps = workflow.split(/\n {6}- /).slice(1);
const check = steps.find(step => step.startsWith('name: Comprobar secrets'))!;

describe('workflow de Supabase', () => {
  it('expone el token únicamente al desplegar y limita los permisos', () => {
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).not.toMatch(/\n {4}env:/);
    for (const step of steps) {
      if (step.startsWith('name: Desplegar')) {
        expect(step).toContain('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}');
        expect(step).toContain('supabase functions deploy mcp');
        expect(step).toContain('supabase functions deploy welcome');
        expect(step).toContain('supabase functions deploy delete-account');
      } else {
        expect(step).not.toMatch(/SUPABASE_ACCESS_TOKEN:\s/);
      }
    }
    expect(check).toContain("${{ secrets.SUPABASE_ACCESS_TOKEN != '' && secrets.SUPABASE_PROJECT_REF != '' }}");
  });

  it.each(['false', 'true'])('comprueba secrets disponibles=%s sin recibir sus valores', available => {
    const directory = mkdtempSync(join(tmpdir(), 'supabase-workflow-'));
    const output = join(directory, 'output');
    const script = check.split('        run: |\n')[1].split('\n').map(line => line.slice(10)).join('\n');
    try {
      const result = spawnSync('bash', ['-e', '-c', script], {
        env: { PATH: process.env.PATH, HAS_DEPLOY_SECRETS: available, GITHUB_OUTPUT: output },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      if (available === 'false') {
        expect(readFileSync(output, 'utf8')).toBe('skip=true\n');
        expect(result.stdout).toContain('se omite el despliegue');
      } else {
        expect(result.stdout).toBe('');
      }
      for (const step of steps.slice(2)) expect(step).toContain("if: steps.check.outputs.skip != 'true'");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fija las acciones por SHA e instala sin scripts antes de empaquetar', () => {
    const actions = [...workflow.matchAll(/uses: (\S+)/g)].map(match => match[1]);
    expect(actions).toHaveLength(3);
    for (const action of actions) expect(action).toMatch(/@[a-f0-9]{40}$/);
    expect(workflow).toContain('npm --prefix mcp ci --ignore-scripts && npm --prefix mcp run build:edge');
  });
});
