'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRng } = require('../src/prng');
const T = require('../src/telemetry');

test('un rapport v1 contient les champs attendus', () => {
  const rng = createRng(1);
  const c = T.makeClient(rng);
  const s = T.makeServer(rng, { createdAt: Date.now() });
  const { report, server } = T.spikeReport(rng, c, s, { build: 'beta-test', now: Date.now() });
  assert.equal(report.version, 1);
  assert.match(report.id, /^P-[0-9a-f]{8}-\d+$/);
  assert.equal(typeof report.rttMs, 'number');
  assert.equal(server.id, s.id);
});

test('un rapport v2 deplace rttMs dans network', () => {
  const rng = createRng(2);
  const c = T.makeClient(rng);
  const s = T.makeServer(rng, { createdAt: Date.now() });
  const { report } = T.spikeReport(rng, c, s, { build: 'beta-test', now: Date.now(), version: 2 });
  assert.equal(report.rttMs, undefined);
  assert.equal(typeof report.network.rttMs, 'number');
});

test("l'export texte commence par l'en-tete console", () => {
  const rng = createRng(3);
  const c = T.makeClient(rng);
  const s = T.makeServer(rng, { createdAt: Date.UTC(2026, 8, 26, 20, 2) });
  const e = T.spikeReport(rng, c, s, { build: 'b', now: Date.UTC(2026, 8, 26, 20, 23, 4) });
  const txt = T.exportSpike(e);
  assert.ok(txt.startsWith(`Performance spike ${s.id} · 9/26/2026, 10:23:04 PM`));
});
