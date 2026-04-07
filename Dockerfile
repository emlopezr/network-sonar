FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS prod-deps
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false \
  && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini iputils-ping ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4044
ENV MONITOR_DB_PATH=/data/network-sonar.sqlite
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/src/data/migrations ./backend/src/data/migrations
COPY --from=build /app/frontend/dist ./frontend/dist
RUN mkdir -p /data /tmp \
  && chown -R node:node /app /data /tmp
USER node
EXPOSE 4044
ENTRYPOINT ["tini", "--"]
CMD ["node", "backend/dist/server.js"]
