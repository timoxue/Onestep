# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy backend files
COPY package*.json ./
COPY server.js ./
COPY docker-manager.js ./

# Copy frontend files and build
COPY client/package*.json ./client/
COPY client/public ./client/public
COPY client/src ./client/src

WORKDIR /app/client
RUN npm install && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy backend files
COPY package*.json ./
COPY server.js ./
COPY docker-manager.js ./

# Copy built frontend
COPY --from=builder /app/client/build ./client/build

# Install backend dependencies
RUN npm install --production

# Create configs directory
RUN mkdir -p /var/lib/openclaw/configs

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "server.js"]
