FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
# npm install generates/uses lock file; npm ci requires pre-existing lock
RUN npm install --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy public assets if they exist
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ > /dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
