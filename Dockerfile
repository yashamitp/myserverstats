# Multi-stage Dockerfile for AgentOps

# Stage 1: Build Frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install server production dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Copy built frontend assets from stage 1 into client/dist
COPY --from=client-builder /app/client/dist /app/client/dist

WORKDIR /app/server
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
