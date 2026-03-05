const electron = require('electron');
console.log('Electron keys:', Object.keys(electron));
console.log('App is:', typeof electron.app);
electron.app.whenReady().then(() => { console.log('Ready!'); electron.app.quit(); });
