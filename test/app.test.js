'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function withServer(fn) {
  const logs = [];
  const app = createApp({ fleet: null, log: (l) => logs.push(l) });
  const server = app.listen(0);
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`, logs);
  } finally {
    server.close();
  }
}

test('GET /healthz', async () => {
  await withServer(async (base) => {
    const r = await fetch(`${base}/healthz`);
    assert.equal(r.status, 200);
  });
});

test('POST /api/reports refuse un corps invalide', async () => {
  await withServer(async (base) => {
    const r = await fetch(`${base}/api/reports`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(r.status, 400);
  });
});

test('POST /api/reports accepte un rapport valide et le journalise', async () => {
  await withServer(async (base, logs) => {
    const body = { report: { id: 'P-0123abcd-1' }, server: { id: 'x' } };
    const r = await fetch(`${base}/api/reports`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(r.status, 202);
    assert.ok(logs.some((l) => l.event === 'perf_spike'));
  });
});
