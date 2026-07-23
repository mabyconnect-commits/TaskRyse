# Taskryse backend (Express + Prisma). Runs the API as a long-lived server.
FROM node:22-slim AS base
# OpenSSL is required by Prisma's query engine at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies (cached unless package files change).
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and generate the Prisma client.
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY openapi.yaml ./openapi.yaml
COPY docker/backend-entrypoint.sh ./docker/backend-entrypoint.sh
RUN chmod +x ./docker/backend-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Entrypoint waits for Postgres, applies migrations, seeds once, then starts.
ENTRYPOINT ["./docker/backend-entrypoint.sh"]
CMD ["node", "src/server.js"]
