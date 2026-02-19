const Service = require('node-windows').Service;
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const svc = new Service({
  name: 'ZekiKodBackend',
  description: 'ZekiKod AI Development Studio Backend Server - Runs on port 3008',
  script: path.join(projectRoot, 'apps', 'server', 'dist', 'index.js'),
  cwd: projectRoot,
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    },
    {
      name: 'PORT',
      value: '3008'
    },
    {
      name: 'DATA_DIR',
      value: path.join(projectRoot, 'data')
    }
  ],
  nodeOptions: [
    '--max-old-space-size=4096'
  ],
  allowServiceLogon: true,
  logpath: path.join(__dirname, 'logs'),
  wait: 2,
  grow: 0.5,
  maxRestarts: 10,
  abortOnError: false
});

svc.on('install', function() {
  console.log('');
  console.log('========================================');
  console.log('ZekiKodBackend service installed successfully!');
  console.log('========================================');
  console.log('');
  console.log('Starting service...');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('');
  console.log('Service is already installed.');
  console.log('To reinstall, first run: node uninstall-service.js');
  console.log('');
});

svc.on('start', function() {
  console.log('');
  console.log('========================================');
  console.log('ZekiKodBackend service started!');
  console.log('========================================');
  console.log('');
  console.log('Server running on: http://localhost:3008');
  console.log('Health check:      http://localhost:3008/api/health');
  console.log('');
  console.log('You can now:');
  console.log('  - View in Services (services.msc)');
  console.log('  - View in Task Manager > Services tab');
  console.log('');
});

svc.on('error', function(err) {
  console.error('');
  console.error('========================================');
  console.error('Service error:', err);
  console.error('========================================');
  console.error('');
  console.error('Make sure you are running as Administrator!');
  console.error('Right-click Command Prompt > Run as Administrator');
  console.error('');
});

console.log('');
console.log('========================================');
console.log('Installing ZekiKodBackend Windows Service...');
console.log('========================================');
console.log('');
console.log('Service configuration:');
console.log('  Name: ZekiKodBackend');
console.log('  Port: 3008');
console.log('  Data: ' + path.join(projectRoot, 'data'));
console.log('');

svc.install();
