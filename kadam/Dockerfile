# --- Build Stage ---
FROM node:20-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# --- Runtime Stage ---
FROM node:20-slim

# Install ffmpeg and ensure ffprobe is available
RUN apt-get update && apt-get install -y --no-install-recommends \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && ffmpeg -version \
  && ffprobe -version \
  && which ffmpeg \
  && which ffprobe
WORKDIR /app

# Copy only built files + dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Expose app port
EXPOSE 3000 3001
