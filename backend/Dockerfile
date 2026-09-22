FROM node:22-alpine

WORKDIR /app

# Install Docker CLI so the backend can execute student code containers
RUN apk add --no-cache docker-cli wget

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src ./src

EXPOSE 3000

# Health check against Express /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
