# Multi-stage Dockerfile for PolyFactory NestJS Backend
# Optimized for small memory footprint (< 600MB)

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate --schema=src/database/schema.prisma
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/database/schema.prisma ./src/database/schema.prisma

EXPOSE 3000

CMD ["node", "dist/main"]
