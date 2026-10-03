# game-telemetry-demo

Service de télémétrie d'un jeu de tir multijoueur web (parties 1 à 2 joueurs contre bots).

## Lancer

```bash
npm ci
npm start                  # API sur :8080, logs JSON lines dans logs/telemetry.log et stdout
npm test
npm run lint
npm run loadgen -- --rps 5 --burst-every 120 --burst-rps 80
```

Variables d'environnement : `PORT`, `LOG_FILE`, `LOG_STDOUT` (0 pour couper stdout), `BUILD`, `GAMES_PER_MINUTE`, `SPEED`, `INCIDENTS` (0 pour désactiver).

## API

| méthode | route | rôle |
|---|---|---|
| GET | `/healthz` | santé |
| GET | `/api/games` | parties en cours |
| POST | `/api/reports` | ingestion d'un rapport client `{ report, server }` |

## Logs en direct

Une ligne JSON par événement : `startup`, `game_created`, `game_completed`, `perf_spike`, `http_request`, `http_error`.

## Extrait historique

`data/admin-export-2026-09-20_26.log` : export brut de la console d'administration (production, 7 jours). Format texte multi-lignes, un en-tête lisible suivi d'un bloc JSON :

```
Performance spike <serverId> · <date locale>
<reason> · <frameMs>ms <reason>
{ "report": {...}, "server": {...} }

Game completed <serverId> · <date locale>
<map> · <score>
{ ...état final du serveur... }
```
