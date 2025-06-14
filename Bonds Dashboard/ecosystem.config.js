module.exports = {
  apps: [
    {
      name: 'bond-dashboard-backend',
      cwd: './server',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'bond-dashboard-frontend',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        script: 'serve',
        args: ['-s', 'dist', '-l', '3000'],
        NODE_ENV: 'production'
      }
    }
  ]
}; 