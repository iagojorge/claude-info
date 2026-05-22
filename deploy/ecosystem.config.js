module.exports = {
  apps: [{
    name: 'cursos-praticos-api',
    script: 'server.js',
    cwd: '/var/www/cursos-praticos/backend',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
  }]
};
