FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package.json and lockfile
COPY package.json package-lock.json ./

# Copy workspace package.jsons
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Install all dependencies (ci is strictly for lockfile matches)
RUN npm ci

# Copy the rest of the application
COPY . .

# Build frontend and backend
RUN npm run build

# Optional: prune dev dependencies for smaller image
# RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

# Copy built artifacts and necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

# CapRover sets the port to 80 internally
ENV PORT=80
EXPOSE 80

# Start the Node.js backend which now also serves the frontend
CMD ["npm", "start", "-w", "backend"]
