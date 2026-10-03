FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS prod-deps
COPY . .
RUN pnpm --filter backend --prod deploy /prod/backend

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini iputils-ping ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4044
ENV MONITOR_DB_PATH=/data/network-sonar.sqlite
COPY package.json ./
COPY backend/package.json backend/package.json
COPY --from=prod-deps /prod/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/src/data/migrations ./backend/src/data/migrations
COPY --from=build /app/frontend/dist ./frontend/dist
RUN mkdir -p /data /tmp \
  && chown -R node:node /app /data /tmp
USER node
EXPOSE 4044
ENTRYPOINT ["tini", "--"]
CMD ["node", "backend/dist/server.js"]
