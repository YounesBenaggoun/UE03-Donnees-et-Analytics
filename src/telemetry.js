'use strict';

// Fabrique des objets de telemetrie au format de production :
//  - rapport "Performance spike" envoye par le client de jeu (navigateur)
//  - bloc "server" (etat de la partie cote serveur)

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const HEX = '0123456789abcdef';

const MAPS = ['research', 'harbor', 'foundry', 'canopy', 'vault'];
const MAP_WEIGHT = { research: 1.0, harbor: 1.15, foundry: 1.3, canopy: 1.45, vault: 0.9 };

const PLATFORMS = [
  { w: 0.28, browser: 'Chrome · Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', renderers: ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)'] },
  { w: 0.14, browser: 'Edge · Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', renderers: ['ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'] },
  { w: 0.16, browser: 'Firefox · Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', renderers: ['Mozilla'] },
  { w: 0.14, browser: 'Safari · Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15', renderers: ['Apple GPU'] },
  { w: 0.12, browser: 'Chrome · Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', renderers: ['ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)'] },
  { w: 0.10, browser: 'Brave · Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', renderers: ['WebKit WebGL'] },
  { w: 0.06, browser: 'Chrome · Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', renderers: ['ANGLE (Mesa, AMD Radeon Graphics (radeonsi, renoir), OpenGL 4.6)', 'WebKit WebGL'] },
];

const RESOLUTIONS = [
  [1920, 961], [1920, 969], [2560, 1277], [2560, 1329], [1440, 789], [1536, 730], [3440, 1335], [1366, 633], [3840, 1916],
];

function id(rng, n, alphabet = ALNUM) {
  let s = '';
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(rng.next() * alphabet.length)];
  return s;
}

function weighted(rng, items) {
  const total = items.reduce((a, b) => a + b.w, 0);
  let r = rng.next() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

const r1 = (v) => Math.round(v * 10) / 10;

function makeClient(rng) {
  const p = weighted(rng, PLATFORMS);
  const [width, height] = rng.pick(RESOLUTIONS);
  return {
    id: id(rng, 8, HEX),
    seq: 0,
    browser: p.browser,
    renderer: rng.pick(p.renderers),
    width,
    height,
    dpr: rng.chance(0.2) ? 2 : 1,
    tier: rng.range(0.6, 2.2), // >1 = machine plus lente
    gpuTimerSupported: !p.browser.startsWith('Safari') && !p.browser.startsWith('Firefox'),
    shadows: rng.chance(0.7),
    bloom: rng.chance(0.55),
  };
}

function makeServer(rng, { createdAt, map, players = 1, bots = 3, format = 'one-side' }) {
  return {
    id: id(rng, 9),
    map: map ?? rng.pick(MAPS),
    phase: 'warmup',
    createdAt,
    players,
    bots,
    capacity: 4,
    score: [0, 0],
    format,
    half: 1,
    tickMs: rng.range(1.6, 2.6),
    tickMaxMs: rng.range(3.2, 5.5),
    tickGapMaxMs: rng.range(50.2, 52.5),
    patchMs: rng.range(2.2, 3.1),
    botsServed: bots > 0,
    botStaleCount: 0,
    botDecisionAgeMs: rng.int(18, 45),
    quarantined: false,
  };
}

function serverBlock(s, withBots = true) {
  const b = {
    id: s.id,
    map: s.map,
    phase: s.phase,
    createdAt: s.createdAt,
    players: s.players,
    bots: s.bots,
    capacity: s.capacity,
    score: [...s.score],
    format: s.format,
    half: s.half,
    tickMs: s.tickMs,
    tickMaxMs: s.tickMaxMs,
    tickGapMaxMs: s.tickGapMaxMs,
    patchMs: s.patchMs,
  };
  if (withBots) {
    b.botsServed = s.botsServed;
    b.botStaleCount = s.botStaleCount;
    b.botDecisionAgeMs = s.botDecisionAgeMs;
  }
  b.quarantined = s.quarantined;
  return b;
}

/**
 * Construit un rapport de spike.
 * cause : generic | overlay | shader | hidden | world | network
 */
function spikeReport(rng, client, server, { cause = 'generic', build, now, version = 1, extra = {} }) {
  const tier = client.tier * (MAP_WEIGHT[server.map] ?? 1);
  const st = { input: r1(rng.range(0.1, 0.5)), actors: r1(rng.range(0.1, 0.6)), world: r1(rng.range(1.5, 5) * tier), render: 0, hud: r1(rng.range(0.6, 2.2)), cameras: r1(rng.range(0.1, 0.4)) };
  const det = {
    inputState: 0, inputInventory: 0, inputPoll: r1(rng.range(0, 0.3)), inputPlacement: 0, inputInteractions: r1(rng.range(0, 0.2)),
    inputDoors: 0, inputAim: 0, inputDetector: 0, inputControls: r1(rng.range(0.1, 0.4)), inputPrediction: 0,
    worldDynamics: r1(rng.range(0, 0.4)), worldVisibility: r1(rng.range(0, 0.3)), worldWalls: r1(rng.range(0, 0.3)), worldEffects: r1(rng.range(0, 0.4)), worldBindings: 0,
    renderShadows: client.shadows ? r1(rng.range(0.8, 3) * tier) : 0,
    renderWorld: r1(rng.range(5, 14) * tier),
    renderPostprocess: client.bloom ? r1(rng.range(6, 16) * tier) : r1(rng.range(0.5, 2)),
    renderOverlay: r1(rng.range(0.4, 3)),
    hudSnapshot: 0, radar: r1(rng.range(0.3, 1.1)), eventArrows: r1(rng.range(0, 0.3)), hudStatus: r1(rng.range(0, 0.2)), ventGuidance: 0,
  };
  const activities = [];
  let browserDelay = r1(rng.range(0, 6));
  let reason = 'frame';
  const g = { newPrograms: rng.int(0, 2), newGeometries: rng.int(0, 40), newTextures: rng.int(0, 3), firstCapture: false };

  switch (cause) {
    case 'overlay':
      det.renderOverlay = r1(rng.range(220, 620));
      break;
    case 'shader':
      g.firstCapture = true;
      g.newPrograms = rng.int(40, 140);
      g.newGeometries = rng.int(900, 4000);
      g.newTextures = rng.int(40, 180);
      det.renderWorld = r1(rng.range(120, 480) * tier);
      break;
    case 'hidden':
      activities.push({ name: 'visibilityHidden', durationMs: rng.int(800, 6000), ageMs: r1(rng.range(20, 200)) });
      browserDelay = r1(rng.range(900, 6200));
      break;
    case 'world':
      det.worldDynamics = r1(rng.range(60, 180));
      st.world = r1(det.worldDynamics + rng.range(2, 6));
      break;
    case 'network':
      reason = 'network';
      break;
    default:
      det.renderWorld = r1(det.renderWorld * rng.range(2, 6));
      det.renderPostprocess = r1(det.renderPostprocess * rng.range(1, 3));
  }

  st.render = r1(det.renderShadows + det.renderWorld + det.renderPostprocess + det.renderOverlay);
  const totalMs = r1(st.input + st.actors + st.world + st.render + st.hud + st.cameras);
  const frameMs = cause === 'hidden' ? Math.round(browserDelay + totalMs) : Math.round(totalMs + rng.range(3, 14));
  if (frameMs > 50 && cause !== 'hidden') activities.push({ name: 'longTask', durationMs: frameMs - rng.int(0, 3), ageMs: r1(rng.range(20, 120)) });

  const rtt = cause === 'network' ? r1(rng.range(180, 1400)) : r1(rng.range(8, 60));
  client.seq += 1;

  const report = {
    version,
    id: `P-${client.id}-${client.seq}`,
    build,
    reason,
    phase: server.phase,
    frameMs,
    rttMs: rtt,
    stateAgeMs: r1(frameMs + rng.range(10, 40) + (cause === 'network' ? rtt : 0)),
    fps: r1(Math.min(144, Math.max(1, 1000 / Math.max(frameMs, 1) + rng.range(8, 30)))),
    work: {
      source: 'match',
      totalMs,
      stages: st,
      details: det,
      context: { camera: rng.chance(0.85) ? 'off' : 'spectate' },
      ageMs: r1(rng.range(20, 90)),
    },
    activities,
    network: {
      transport: rng.chance(0.8) ? 'worker' : 'main',
      browserDelayMs: cause === 'hidden' ? browserDelay : r1(Math.max(browserDelay, frameMs - rng.range(2, 10))),
      queueDelayMs: cause === 'network' ? r1(rng.range(40, 400)) : 0,
    },
    graphics: {
      programs: rng.int(180, 320),
      geometries: rng.int(4000, 8000),
      textures: rng.int(180, 290),
      gpuTimerSupported: client.gpuTimerSupported,
      gpuRenderMs: client.gpuTimerSupported ? r1(rng.range(2.5, 9) * tier) : null,
      gpuSampleAgeMs: client.gpuTimerSupported ? r1(rng.range(100, 900)) : null,
      firstCapture: g.firstCapture,
      scale: 1,
      width: client.width,
      height: client.height,
      dpr: client.dpr,
      renderer: client.renderer,
      calls: rng.int(420, 900),
      triangles: Math.round(rng.range(0.9, 2.1) * 1e6 * (MAP_WEIGHT[server.map] ?? 1)),
      newPrograms: g.newPrograms,
      newGeometries: g.newGeometries,
      newTextures: g.newTextures,
      shadows: client.shadows,
      bloom: client.bloom,
    },
    browser: client.browser,
  };

  if (version === 2) {
    // v2 : rtt deplace dans network, ajout d'une etape physics
    delete report.rttMs;
    report.network.rttMs = rtt;
    report.work.stages.physics = r1(rng.range(0.2, 1.4));
  }

  Object.assign(report, extra);
  return { report, server: serverBlock(server), at: now };
}

// ------------------------------------------------------------------ format d'export texte (console admin)
function fmtLocal(ms, timeZone = 'Europe/Paris') {
  return new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date(ms));
}

function exportSpike(entry) {
  const { report, server, at } = entry;
  const head = `Performance spike ${server.id} · ${fmtLocal(at)}`;
  const sub = `${report.reason} · ${report.frameMs ?? report.frame_ms}ms ${report.reason}`;
  return `${head}\n${sub}\n${JSON.stringify({ report, server }, null, 2)}\n`;
}

function exportGame(server, at) {
  const head = `Game completed ${server.id} · ${fmtLocal(at)}`;
  const sub = `${server.map} · ${server.score[0]} - ${server.score[1]}`;
  return `${head}\n${sub}\n${JSON.stringify(serverBlock(server, false), null, 2)}\n`;
}

module.exports = { MAPS, makeClient, makeServer, serverBlock, spikeReport, exportSpike, exportGame, id, fmtLocal };
