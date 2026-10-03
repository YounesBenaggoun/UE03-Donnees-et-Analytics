'use strict';

// Generateur pseudo-aleatoire deterministe (mulberry32).
// Meme seed => meme deroulement de simulation, pratique pour rejouer un scenario.
function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    chance(p) {
      return next() < p;
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    // Bruit gaussien (Box-Muller)
    gauss(mean = 0, sd = 1) {
      const u = Math.max(next(), 1e-12);
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}

module.exports = { createRng };
