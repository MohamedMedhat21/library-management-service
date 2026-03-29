# ========================
# Stage 1: Dependency cache
# ========================
FROM node:20-alpine AS deps

WORKDIR /app

# Only copy manifests — layer is cached until package*.json changes
COPY package*.json ./
RUN npm ci

# ========================
# Stage 2: Builder
# ========================
FROM node:20-alpine AS builder

WORKDIR /app

# Reuse cached node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ========================
# Stage 3: Production
# ========================
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Install only production dependencies (clean install, no dev deps)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Use non-root user for security
USER node

CMD ["node", "dist/main.js"]