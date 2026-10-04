# syntax=docker/dockerfile:1.7

# ---------- Étape 1 : build / récupération des dépendances ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---------- Étape 2 : runtime minimal ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    LOG_FILE=/var/log/croakedup/che.3t.log \
    LOG_STDOUT=1

# Paquets strictement nécessaires (tini pour PID 1, wget pour healthcheck)
RUN apk add --no-cache tini wget \
 && addgroup -S croakedup -g 10001 \
 && adduser  -S croakedup -u 10001 -G croakedup \
 && mkdir -p /var/log/croakedup /app/data \
 && chown -R croakedup:croakedup /var/log/croakedup /app

WORKDIR /app

# Copie des dépendances de production (propriété root, lecture seule)
COPY --from=deps --chown=root:root /app/node_modules ./node_modules
COPY --chown=root:root package.json ./
COPY --chown=root:root src ./src
COPY --chown=root:root scripts ./scripts

USER 10001:10001

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]