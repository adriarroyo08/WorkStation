import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { makeNonce } from './nonce';

describe('makeNonce', () => {
  it('raw son 32 bytes en hex', async () => expect((await makeNonce()).raw).toMatch(/^[0-9a-f]{64}$/));
  it('hashed es el SHA-256 hex de raw', async () => {
    const { raw, hashed } = await makeNonce();
    expect(hashed).toBe(createHash('sha256').update(raw).digest('hex'));
  });
  it('cada llamada da un raw distinto', async () => expect((await makeNonce()).raw).not.toBe((await makeNonce()).raw));
});
