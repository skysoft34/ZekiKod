module.exports = {
  apps: [
    {
      name: 'zekikod-backend',
      script: './apps/server/dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '4G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3008,
        DATA_DIR: './data',
        SKIP_AUTH: 'true'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3008,
        DATA_DIR: './data'
      },
      error_file: './deploy/logs/pm2-error.log',
      out_file: './deploy/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    },
    {
      name: 'zekikod-frontend',
      script: './deploy/frontend-server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 7007
      },
      error_file: './deploy/logs/frontend-error.log',
      out_file: './deploy/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
