# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for API URL
ARG NEXT_PUBLIC_API_URL=http://157.245.198.144/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application with environment variable baked in
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./next.config.mjs
# Copy app directory (required for Next.js App Router)
COPY --from=builder /app/app ./app
# Copy other source directories that might be needed
COPY --from=builder /app/components ./components
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/contexts ./contexts
COPY --from=builder /app/hooks ./hooks
# Copy .env.local if it exists (for NEXT_PUBLIC_API_URL)
COPY --from=builder /app/.env.local* ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
