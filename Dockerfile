# ─── Stage 1: Build frontend ───
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ─── Stage 2: Production ───
FROM node:20-alpine AS production
WORKDIR /app

# Install backend dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --production

# Copy backend source
COPY server/ ./server/

# Copy built frontend
COPY --from=frontend-build /app/client/.next ./client/.next
COPY --from=frontend-build /app/client/public ./client/public
COPY --from=frontend-build /app/client/package*.json ./client/
COPY --from=frontend-build /app/client/next.config.js ./client/
RUN cd client && npm ci --production

# Copy root files
COPY .env.example .env

ENV NODE_ENV=production
EXPOSE 5000 3000

# Start both services
CMD ["sh", "-c", "cd /app/server && node server.js & cd /app/client && npm start"]
