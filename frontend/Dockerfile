# ==============================================================================
# AgentShield Frontend Production Dockerfile
# Multi-stage build with Node.js builder and Nginx runtime
# ==============================================================================

# Stage 1: Build Application
FROM node:20-alpine AS builder

WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Build production bundle
RUN npm run build


# Stage 2: Minimal Production Nginx Server
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
