# ---- Build & Run (single-stage) ----
FROM node:20-alpine

# Enable pnpm via corepack (built into Node 20)
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy ONLY files needed for install first (better cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# If you keep shared tsconfig at root, include it:
COPY tsconfig.json ./

# Copy package manifests for all workspaces (to compute deps without source)
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/engine/package.json ./packages/engine/package.json
COPY apps/backend/package.json ./apps/backend/package.json

# Install deps with frozen lockfile (workspace-aware)
RUN pnpm install --frozen-lockfile

# Now copy the whole repo (sources)
COPY . .

# Build ONLY what we need (contracts/engine/backend)
RUN pnpm --filter "@mafia/contracts" --filter "@mafia/engine" --filter "@mafia/backend" build

# Use non-root user
USER node

# Cloud Run will set PORT; server must listen on it
ENV PORT=8080 NODE_ENV=production

EXPOSE 8080
CMD ["node", "apps/backend/dist/index.js"]