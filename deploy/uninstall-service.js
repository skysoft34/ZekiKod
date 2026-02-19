const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'ZekiKodBackend',
  script: path.join(__dirname, '..', 'apps', 'server', 'dist', 'index.js'),
});

svc.on('uninstall', function() {
  console.log('ZekiKodBackend service uninstalled successfully!');
});

svc.on('error', function(err) {
  console.error('Service error:', err);
});

console.log('Uninstalling ZekiKodBackend service...');
svc.uninstall();
