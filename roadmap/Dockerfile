# p2-sandbox Roadmap (linux/amd64). Not a public site image.
# Standalone Next.js on :3001. Database name: roadmap (not core).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV DB_NAME=roadmap

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/drizzle/migrations ./drizzle/migrations
COPY --from=builder /app/scripts/ecs-start.cjs ./scripts/ecs-start.cjs
COPY --from=builder /app/package.json ./package.json
# ecs-start.cjs requires pg; standalone tracing usually includes it, but install if missing.
RUN node -e "require('pg')" 2>/dev/null || npm install pg@8.13.0 --omit=dev --ignore-scripts --no-package-lock

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "scripts/ecs-start.cjs"]
