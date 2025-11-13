const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Store = require('electron-store');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const XLSX = require('xlsx');

// Initialize electron-store for persistent data
const store = new Store();

let mainWindow;

// Initialize default users if not exists
if (!store.get('users')) {
  store.set('users', [
    {
      id: 1,
      username: 'client',
      password: 'password123',
      role: 'client',
      name: 'Regular Joe',
      email: 'joe@company.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      status: 'Active'
    },
    {
      id: 2,
      username: 'admin',
      password: 'adminpassword',
      role: 'admin',
      name: 'The Overlord',
      email: 'boss@company.com',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin',
      status: 'Online'
    },
    {
      id: 3,
      username: 'intern',
      password: '123',
      role: 'client',
      name: 'Kevin the Intern',
      email: 'kevin@company.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin',
      status: 'Confused'
    }
  ]);
}

// Initialize logs
if (!store.get('logs')) {
  store.set('logs', [
    { id: 1, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'info', msg: 'System initialized.' }
  ]);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ==================== IPC HANDLERS ====================

// === USER MANAGEMENT ===
ipcMain.handle('auth:login', async (event, { username, password }) => {
  const users = store.get('users', []);
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    addLog(`User [${username}] logged in.`, 'success');
    return { success: true, user };
  }

  addLog(`Failed login attempt: ${username}`, 'warning');
  return { success: false, error: 'Invalid credentials' };
});

ipcMain.handle('users:getAll', async () => {
  return store.get('users', []);
});

ipcMain.handle('users:add', async (event, userData) => {
  const users = store.get('users', []);
  const newUser = {
    ...userData,
    id: Date.now(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`
  };
  users.push(newUser);
  store.set('users', users);
  addLog(`Created new user: ${userData.username}`, 'info');
  return newUser;
});

ipcMain.handle('users:update', async (event, userData) => {
  const users = store.get('users', []);
  const index = users.findIndex(u => u.id === userData.id);
  if (index !== -1) {
    users[index] = userData;
    store.set('users', users);
    addLog(`Updated user: ${userData.username}`, 'info');
    return userData;
  }
  return null;
});

ipcMain.handle('users:delete', async (event, userId) => {
  const users = store.get('users', []);
  const filtered = users.filter(u => u.id !== userId);
  store.set('users', filtered);
  addLog(`Deleted user ID: ${userId}`, 'warning');
  return true;
});

// === LOGGING ===
ipcMain.handle('logs:getAll', async () => {
  return store.get('logs', []);
});

ipcMain.handle('logs:add', async (event, { msg, type = 'info' }) => {
  addLog(msg, type);
  return true;
});

function addLog(msg, type = 'info') {
  const logs = store.get('logs', []);
  const newLog = {
    id: Date.now(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type,
    msg
  };
  logs.push(newLog);
  // Keep only last 100 logs
  if (logs.length > 100) logs.shift();
  store.set('logs', logs);

  // Notify renderer
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('logs:updated', logs);
  }
}

// === FILE OPERATIONS ===
ipcMain.handle('file:selectExcel', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    addLog(`Selected Excel file: ${path.basename(filePath)}`, 'info');
    return { success: true, path: filePath, name: path.basename(filePath) };
  }

  return { success: false };
});

ipcMain.handle('file:selectPDF', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    addLog(`Selected PDF file: ${path.basename(filePath)}`, 'info');
    return { success: true, path: filePath, name: path.basename(filePath) };
  }

  return { success: false };
});

// === EXCEL PARSING ===
ipcMain.handle('excel:parse', async (event, filePath) => {
  try {
    addLog(`Parsing Excel file: ${path.basename(filePath)}`, 'info');

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Transform data to expected format
    const transformedData = data.map((row, index) => ({
      id: index + 1,
      date: row.Date || row.date || new Date().toISOString().split('T')[0],
      docType: row['Document Type'] || row.docType || row.type || 'Unknown',
      pages: row.Pages || row.pages || row['Page Range'] || '1',
      pageCount: calculatePageCount(row.Pages || row.pages || row['Page Range'] || '1'),
      note: row.Note || row.note || row.Notes || ''
    }));

    addLog(`Successfully parsed ${transformedData.length} records from Excel`, 'success');
    return { success: true, data: transformedData };
  } catch (error) {
    addLog(`Error parsing Excel: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

function calculatePageCount(pageRange) {
  if (!pageRange) return 1;
  const range = String(pageRange);

  if (range.includes('-')) {
    const [start, end] = range.split('-').map(p => parseInt(p.trim()));
    return end - start + 1;
  }

  if (range.includes(',')) {
    return range.split(',').length;
  }

  return 1;
}

// === PDF PROCESSING ===
ipcMain.handle('pdf:process', async (event, { pdfPath, selectedRows, batesConfig, isBatesEnabled }) => {
  try {
    addLog(`Processing PDF with ${selectedRows.length} selected documents`, 'info');

    // Read the source PDF
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    // Create output PDF
    const outputPdf = await PDFDocument.create();

    // Sort rows by date
    const sortedRows = [...selectedRows].sort((a, b) => new Date(a.date) - new Date(b.date));

    let currentBatesNumber = parseInt(batesConfig.start) || 1;
    const processedData = [];

    for (const row of sortedRows) {
      const pageRange = parsePageRange(row.pages, totalPages);
      const startBates = currentBatesNumber;

      for (const pageNum of pageRange) {
        if (pageNum > 0 && pageNum <= totalPages) {
          const [copiedPage] = await outputPdf.copyPages(pdfDoc, [pageNum - 1]);

          // Apply Bates stamping if enabled
          if (isBatesEnabled) {
            await applyBatesStamp(copiedPage, currentBatesNumber, batesConfig);
          }

          outputPdf.addPage(copiedPage);
          currentBatesNumber++;
        }
      }

      const endBates = currentBatesNumber - 1;

      processedData.push({
        ...row,
        batesRange: isBatesEnabled ? `${formatBates(startBates, batesConfig.digits)} - ${formatBates(endBates, batesConfig.digits)}` : null
      });
    }

    const processedPdfBytes = await outputPdf.save();

    // Save to temp directory
    const tempDir = app.getPath('temp');
    const outputPath = path.join(tempDir, 'processed_output.pdf');
    await fs.writeFile(outputPath, processedPdfBytes);

    addLog(`PDF processing complete. ${outputPdf.getPageCount()} pages in output.`, 'success');

    return {
      success: true,
      outputPath,
      processedData,
      pageCount: outputPdf.getPageCount()
    };
  } catch (error) {
    addLog(`Error processing PDF: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

async function applyBatesStamp(page, batesNumber, config) {
  const { width, height } = page.getSize();
  const font = await page.doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const text = formatBates(batesNumber, config.digits);
  const textWidth = font.widthOfTextAtSize(text, fontSize);

  const x = (width - textWidth) / 2;
  const y = config.position === 'footer' ? 20 : height - 30;

  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
}

function formatBates(num, digits) {
  return String(num).padStart(digits, '0');
}

function parsePageRange(rangeStr, maxPages) {
  const range = String(rangeStr).trim();
  const pages = [];

  if (range.includes('-')) {
    const [start, end] = range.split('-').map(p => parseInt(p.trim()));
    for (let i = start; i <= Math.min(end, maxPages); i++) {
      pages.push(i);
    }
  } else if (range.includes(',')) {
    const parts = range.split(',');
    parts.forEach(p => {
      const num = parseInt(p.trim());
      if (num <= maxPages) pages.push(num);
    });
  } else {
    const num = parseInt(range);
    if (num <= maxPages) pages.push(num);
  }

  return pages;
}

// === PDF EXPORT ===
ipcMain.handle('pdf:export', async (event, { sourcePath, fileName, type }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      filters: [
        { name: type === 'zip' ? 'ZIP Archive' : 'PDF Files', extensions: [type === 'zip' ? 'zip' : 'pdf'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      // Copy the processed file to the selected location
      await fs.copyFile(sourcePath, result.filePath);
      addLog(`Exported ${type.toUpperCase()}: ${fileName}`, 'success');
      return { success: true, path: result.filePath };
    }

    return { success: false };
  } catch (error) {
    addLog(`Export error: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});
