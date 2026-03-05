import { useState } from 'react';
import './App.css';

declare global {
  interface Window {
    require: any;
  }
}

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

function App() {
  const [log, setLog] = useState<string[]>([]);
  const [sheetId, setSheetId] = useState<string>('');

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const handleAuth = async () => {
    if (!ipcRenderer) return addLog('ipcRenderer not found');
    addLog('Starting Google Auth...');
    const res = await ipcRenderer.invoke('google-auth');
    if (res.success) {
      addLog('Auth successful!');
    } else {
      addLog(`Auth failed: ${res.error}`);
    }
  };

  const handleCreateSheet = async () => {
    if (!ipcRenderer) return;
    addLog('Creating spreadsheet...');
    const res = await ipcRenderer.invoke('create-sheet', 'Market Integration Test PoC');
    if (res.success) {
      addLog(`Created sheet ID: ${res.spreadsheetId}`);
      setSheetId(res.spreadsheetId);
    } else {
      addLog(`Create failed: ${res.error}`);
    }
  };

  const handleWriteData = async () => {
    if (!ipcRenderer) return;
    if (!sheetId) return addLog('No sheet ID available. Create one first.');
    addLog('Writing data to sheet...');

    const values = [
      ['Date', 'Product Name', 'Price', 'Status'],
      [new Date().toLocaleDateString(), 'Test Product A', '15000', 'Ready'],
      [new Date().toLocaleDateString(), 'Test Product B', '25000', 'Pending']
    ];

    const res = await ipcRenderer.invoke('write-sheet', sheetId, 'Sheet1!A1:D3', values);
    if (res.success) {
      addLog('Successfully wrote data!');
    } else {
      addLog(`Write failed: ${res.error}`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Market Integration PoC</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={handleAuth}>1. Google Login</button>
        <button onClick={handleCreateSheet}>2. Create Sheet</button>
        <button onClick={handleWriteData}>3. Write Test Data</button>
      </div>

      <div style={{ background: '#f0f0f0', padding: 10, borderRadius: 5, height: 300, overflowY: 'auto' }}>
        <h3>Logs</h3>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

export default App;
