'use strict';

// Generateur de charge : envoie des rapports a POST /api/reports.
// node scripts/loadgen.js --url http://localhost:8080 --rps 5 --burst-every 120 --burst-rps 80
const { parseArgs } = require('node:util');
const { createRng } = require('../src/prng');
const T = require('../src/telemetry');

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:8080' },
    rps: { type: 'string', default: '5' },
    'burst-every': { type: 'string', default: '120' },
    'burst-rps': { type: 'string', default: '80' },
    'burst-duration': { type: 'string', default: '20' },
  },
});

const rng = createRng(Date.now() % 1e9);
const clients = Array.from({ length: 40 }, () => T.makeClient(rng));
const start = Date.now();

async function sendOne() {
  const c = rng.pick(clients);
  const s = T.makeServer(rng, { createdAt: Date.now() - rng.int(10, 600) * 1000 });
  s.phase = 'play';
  const cause = rng.pick(['generic', 'generic', 'hidden', 'network', 'overlay']);
  const e = T.spikeReport(rng, c, s, { cause, build: 'beta-20260926-6', now: Date.now(), version: 2 });
  const body = rng.chance(0.03) ? { report: { id: 'garbage' } } : { report: e.report, server: e.server };
  try {
    await fetch(`${values.url}/api/reports`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    // service indisponible : on continue
  }
}

setInterval(() => {
  const t = (Date.now() - start) / 1000;
  const every = Number(values['burst-every']);
  const inBurst = every > 0 && t % every < Number(values['burst-duration']);
  const rps = inBurst ? Number(values['burst-rps']) : Number(values.rps);
  for (let i = 0; i < rps; i++) setTimeout(sendOne, rng.int(0, 999));
}, 1000);
