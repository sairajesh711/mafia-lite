# Production-Ready Multi-Stage Docker Build
# Stage 1: Build Environment
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy source code for all packages
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install all dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Build packages in dependency order
RUN pnpm --filter "@mafia/contracts" build
RUN pnpm --filter "@mafia/engine" build  
RUN pnpm --filter "@mafia/backend" build

# Verify build outputs
RUN ls -la packages/contracts/dist/ packages/engine/dist/ apps/backend/dist/

# Stage 2: Production Dependencies
FROM node:18-alpine AS deps

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only package.json files (for dependency resolution)
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/engine/package.json ./packages/engine/
COPY apps/backend/package.json ./apps/backend/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Stage 3: Runtime Image
FROM node:18-alpine AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mafia -u 1001

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/packages/engine/dist ./packages/engine/dist  
COPY --from=builder /app/packages/engine/package.json ./packages/engine/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=deps /app/packages/engine/node_modules ./packages/engine/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy workspace config for runtime
COPY package.json pnpm-workspace.yaml ./

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set working directory to backend
WORKDIR /app/apps/backend

# Expose port
EXPOSE 8080

# Environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    NODE_OPTIONS="--max-old-space-size=512" \
    NPM_CONFIG_CACHE=/tmp/.npm

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]