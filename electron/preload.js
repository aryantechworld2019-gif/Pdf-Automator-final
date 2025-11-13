const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),

  // User Management
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  addUser: (userData) => ipcRenderer.invoke('users:add', userData),
  updateUser: (userData) => ipcRenderer.invoke('users:update', userData),
  deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),

  // Logs
  getLogs: () => ipcRenderer.invoke('logs:getAll'),
  addLog: (logData) => ipcRenderer.invoke('logs:add', logData),
  onLogsUpdated: (callback) => ipcRenderer.on('logs:updated', (event, logs) => callback(logs)),

  // File Selection
  selectExcelFile: () => ipcRenderer.invoke('file:selectExcel'),
  selectPDFFile: () => ipcRenderer.invoke('file:selectPDF'),

  // Excel Parsing
  parseExcel: (filePath) => ipcRenderer.invoke('excel:parse', filePath),

  // PDF Processing
  processPDF: (config) => ipcRenderer.invoke('pdf:process', config),
  exportPDF: (config) => ipcRenderer.invoke('pdf:export', config),
});
