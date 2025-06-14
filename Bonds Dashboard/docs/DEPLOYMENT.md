# Bond Dashboard - Always-On Deployment Guide

This guide provides multiple ways to keep your Bond Dashboard running continuously, from simple development setups to production deployments.

## 🚀 Quick Start Options

### Option 1: Concurrent Development (Simplest)
```bash
# Install dependencies (if not already done)
npm install

# Start both frontend and backend together
npm start
```

### Option 2: PM2 Process Manager (Recommended for Local Production)
```bash
# Start with PM2 (auto-restart, monitoring, logs)
npm run pm2:start

# Check status
npm run pm2:status

# View logs
npm run pm2:logs

# Stop services
npm run pm2:stop

# Restart services
npm run pm2:restart
```

### Option 3: Windows Batch File (Double-click to start)
```bash
# Just double-click this file:
start-dashboard.bat
```

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start both servers with concurrently |
| `npm run pm2:start` | Start with PM2 process manager |
| `npm run pm2:stop` | Stop PM2 processes |
| `npm run pm2:restart` | Restart PM2 processes |
| `npm run pm2:status` | Check PM2 process status |
| `npm run pm2:logs` | View real-time logs |
| `npm run pm2:delete` | Delete PM2 processes |

## 🐳 Docker Deployment (Production)

### Build and run with Docker Compose:
```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Manual Docker build:
```bash
# Build image
docker build -t bond-dashboard .

# Run container
docker run -d -p 3000:3000 -p 3001:3001 --name bond-dashboard bond-dashboard
```

## 🌐 Production Deployment Options

### 1. Cloud Platforms
- **Vercel**: Frontend deployment
- **Railway/Render**: Full-stack deployment
- **DigitalOcean App Platform**: Container deployment
- **AWS/Azure/GCP**: Various deployment options

### 2. VPS Deployment with PM2
```bash
# On your server
git clone your-repo
cd bond-dashboard
npm install
cd server && npm install && cd ..

# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## 🔄 Auto-Restart Features

### PM2 Features:
- ✅ Auto-restart on crash
- ✅ Auto-restart on file changes (development mode)
- ✅ Memory usage monitoring
- ✅ Process management
- ✅ Log management
- ✅ Cluster mode support

### Docker Features:
- ✅ Container restart policies
- ✅ Health checks
- ✅ Resource limits
- ✅ Network isolation
- ✅ Volume persistence

## 📊 Monitoring

### PM2 Monitoring:
```bash
# Real-time monitoring
pm2 monit

# Process list
pm2 list

# Detailed info
pm2 show bond-dashboard-backend
```

### Docker Monitoring:
```bash
# Container stats
docker stats

# Container logs
docker logs bond-dashboard
```

## 🛠️ Troubleshooting

### Port Conflicts:
- Frontend will automatically find next available port (3000, 3001, 3002...)
- Backend runs on port 3001 by default
- Check `server/server.js` to modify backend port

### PM2 Issues:
```bash
# Kill all PM2 processes
pm2 kill

# Delete specific app
pm2 delete bond-dashboard-frontend

# Restart with fresh config
pm2 start ecosystem.config.js --force
```

### Docker Issues:
```bash
# Remove containers and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📝 Environment Variables

Create a `.env` file in the `server` directory:
```env
FRED_API_KEY=your_api_key_here
PORT=3001
NODE_ENV=production
```

## 🔒 Security Considerations

For production deployments:
- Use environment variables for sensitive data
- Enable HTTPS/SSL certificates
- Set up proper firewall rules
- Use reverse proxy (nginx/Apache)
- Implement rate limiting
- Enable monitoring and alerting

## 📈 Performance Optimization

- Build frontend for production: `npm run build`
- Use PM2 cluster mode for multiple CPU cores
- Implement caching strategies
- Use CDN for static assets
- Monitor memory usage and optimize 