const electron = require('electron');
console.log('process.versions:', process.versions);
console.log('process.type:', process.type);
console.log('Keys:', Object.keys(electron));
console.log('App:', typeof electron === 'string' ? 'string path' : electron.app);
if (electron.app) {
  electron.app.whenReady().then(() => console.log('Ready!')).catch(console.error);
}
setTimeout(() => process.exit(0), 100);
