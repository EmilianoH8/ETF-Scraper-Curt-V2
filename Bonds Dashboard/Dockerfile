# Multi-stage build for production
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

# Set working directory
WORKDIR /app

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server files
COPY --from=build /app/server ./server

# Copy PM2 config
COPY --from=build /app/ecosystem.config.js ./

# Create a simple static server for frontend
RUN npm install -g serve

# Expose ports
EXPOSE 3000 3001

# Start both services with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"] 