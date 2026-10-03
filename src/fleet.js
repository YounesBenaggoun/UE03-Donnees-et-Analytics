'use strict';

const { EventEmitter } = require('node:events');
const { createRng } = require('./prng');
const T = require('./telemetry');

// Simule une flotte de serveurs de jeu et les clients connectes.
// Emet des evenements 'log' (objets) que le serveur ecrit en JSON lines.

class Fleet extends EventEmitter {
  constructor({ seed = Date.now() % 1e9, build = 'beta-20260926-6', gamesPerMinute = 4, speed = 10, incidents = true } = {}) {
    super();
    this.rng = createRng(seed);
    this.build = build;
    this.version = build >= 'beta-20260926-6' ? 2 : 1;
    this.gamesPerMinute = gamesPerMinute;
    this.speed = speed; // 10 = une partie de 8 min dure 48 s reelles
    this.incidents = incidents;
    this.clients = Array.from({ length: 80 }, () => T.makeClient(this.rng));
    this.games = new Map();
    this.mode = { farming: 0, tickDegraded: 0 };
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => this.#tick(), 1000);
  }

  stop() {
    clearInterval(this.timer);
  }

  #log(level, event, data) {
    this.emit('log', { ts: new Date().toISOString(), level, event, ...data });
  }

  #tick() {
    const rng = this.rng;
    const now = Date.now();

    if (this.incidents && rng.chance(1 / 600)) {
      const kind = rng.pick(['farming', 'tickDegraded']);
      this.mode[kind] = now + rng.int(120, 420) * 1000;
    }

    const perSecond = (this.gamesPerMinute * this.speed) / 60 / 8;
    if (rng.chance(Math.min(1, perSecond))) this.#createGame(now, false);
    if (this.mode.farming > now && rng.chance(0.5)) this.#createGame(now, true);

    for (const g of this.games.values()) this.#stepGame(g, now);
  }

  #createGame(now, farm) {
    const rng = this.rng;
    const client = rng.pick(this.clients);
    const s = T.makeServer(rng, { createdAt: now, map: farm ? 'vault' : undefined });
    const durationS = farm ? rng.int(55, 75) : rng.int(300, 840);
    const g = { s, client, farm, start: now, end: now + (durationS * 1000) / this.speed, shaderDone: false };
    this.games.set(s.id, g);
    this.#log('info', 'game_created', { server: T.serverBlock(s) });
  }

  #stepGame(g, now) {
    const rng = this.rng;
    const { s, client } = g;
    const warm = now - g.start < 30_000 / this.speed;
    s.phase = warm ? 'warmup' : 'play';
    if (this.mode.tickDegraded > now) {
      s.tickGapMaxMs = rng.range(180, 900);
      s.tickMaxMs = rng.range(40, 120);
    }

    const emit = (cause) => {
      const e = T.spikeReport(rng, client, s, { cause, build: this.build, now, version: this.version });
      this.#log('warn', 'perf_spike', { report: e.report, server: e.server });
    };

    if (!g.shaderDone && warm && rng.chance(0.3)) {
      g.shaderDone = true;
      emit('shader');
    }
    if (!warm && rng.chance(0.012 * client.tier)) emit('generic');
    if (!warm && rng.chance(0.004)) emit('hidden');
    if (!warm && this.mode.tickDegraded > now && rng.chance(0.03)) emit('network');
    if (!warm && client.width >= 2560 && client.bloom && this.build >= 'beta-20260924-3' && rng.chance(0.02)) emit('overlay');

    if (now >= g.end) {
      s.phase = 'ended';
      s.score = g.farm ? [3, 0] : rng.pick([[3, 0], [3, 1], [3, 2], [2, 3], [1, 3], [0, 3]]);
      if (g.farm && rng.chance(0.3)) s.quarantined = true;
      this.#log('info', 'game_completed', { server: T.serverBlock(s, false) });
      this.games.delete(s.id);
    }
  }

  liveGames() {
    return [...this.games.values()].map((g) => T.serverBlock(g.s));
  }
}

module.exports = { Fleet };
