# ---------- Base ----------
FROM node:18-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install system deps
RUN apk add --no-cache libc6-compat

# ---------- Dependencies ----------
FROM base AS deps

# Install root deps (for tooling / scripts)
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Install admin deps
WORKDIR /app/admin
COPY admin/package.json admin/package-lock.json* ./
RUN npm ci

# Install landing deps
WORKDIR /app/landing
COPY landing/package.json landing/package-lock.json* ./
RUN npm ci


# ---------- Build admin ----------
FROM base AS admin-builder
WORKDIR /app/admin
COPY --from=deps /app/admin/node_modules ./node_modules
COPY admin/ ./
RUN npm run build


# ---------- Build landing ----------
FROM base AS landing-builder
WORKDIR /app/landing
COPY --from=deps /app/landing/node_modules ./node_modules
COPY landing/ ./
RUN npm run build


# ---------- Admin Runner ----------
FROM node:18-alpine AS admin-runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy build output
COPY --from=admin-builder /app/admin/public ./public
COPY --from=admin-builder /app/admin/.next/standalone ./
COPY --from=admin-builder /app/admin/.next/static ./.next/static

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]


# ---------- Landing Runner ----------
FROM node:18-alpine AS landing-runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy build output
COPY --from=landing-builder /app/landing/public ./public
COPY --from=landing-builder /app/landing/.next/standalone ./
COPY --from=landing-builder /app/landing/.next/static ./.next/static

USER nextjs

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
