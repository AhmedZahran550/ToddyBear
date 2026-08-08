# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package management files
COPY package.json yarn.lock* package-lock.json* ./

# Install dependencies for build
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package management files
COPY package.json yarn.lock* package-lock.json* ./

# Install production dependencies only
RUN if [ -f yarn.lock ]; then yarn install --production --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --only=production; \
    else npm install --only=production; fi

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist

# Expose default API port
EXPOSE 3000

# Run NestJS application
CMD ["node", "dist/main.js"]
