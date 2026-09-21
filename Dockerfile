# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

# All dependencies and sources: runs lint, typecheck and tests without a local Node.js
FROM base AS dev
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Compiles TypeScript to dist/
FROM dev AS build
RUN npm run build

# Production image: runtime dependencies and compiled code only
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
