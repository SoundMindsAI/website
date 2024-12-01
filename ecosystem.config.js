module.exports = {
  apps: [{
    name: 'soundminds-web',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=4096'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_restarts: 10,
    restart_delay: 4000,
    autorestart: true,
    exp_backoff_restart_delay: 100,
    node_args: [
      '--max-old-space-size=4096',
      '--optimize-for-size',
      '--max-semi-space-size=64',
      '--max-http-header-size=16384',
      '--http-parser=legacy'
    ],
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
