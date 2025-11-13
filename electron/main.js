const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Store = require('electron-store');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const XLSX = require('xlsx');

// Initialize electron-store for persistent data
const store = new Store();

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';
const tempFiles = new Set(); // Track temp files for cleanup

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
      sandbox: true,
      // Content Security Policy
      webSecurity: true,
    },
    autoHideMenuBar: true,
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Set CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https://api.dicebear.com; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://api.dicebear.com"
        ]
      }
    });
  });
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

// Cleanup before quit
app.on('before-quit', async (e) => {
  e.preventDefault();

  // Clean up temp files
  for (const filePath of tempFiles) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error cleaning temp file:', error);
    }
  }

  app.exit(0);
});

// ==================== UTILITY FUNCTIONS ====================

// Validate user input
function validateUserData(userData) {
  const errors = [];

  if (!userData.username || userData.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }

  if (!userData.password || userData.password.length < 3) {
    errors.push('Password must be at least 3 characters');
  }

  if (!userData.name || userData.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!userData.email || !userData.email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!['admin', 'client'].includes(userData.role)) {
    errors.push('Role must be admin or client');
  }

  return errors;
}

// Generate unique ID
function generateUniqueId(existingIds = []) {
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return maxId + 1;
}

// Validate file path
function isValidFilePath(filePath) {
  try {
    // Check for path traversal attempts
    const normalized = path.normalize(filePath);
    const resolved = path.resolve(filePath);
    return normalized === resolved && !filePath.includes('..');
  } catch {
    return false;
  }
}

// Validate page range string
function isValidPageRange(rangeStr) {
  if (!rangeStr) return false;
  const pattern = /^(\d+(-\d+)?)(,\s*\d+(-\d+)?)*$/;
  return pattern.test(String(rangeStr).trim());
}

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
  // Validate input
  const validationErrors = validateUserData(userData);
  if (validationErrors.length > 0) {
    return { success: false, error: validationErrors.join(', ') };
  }

  const users = store.get('users', []);

  // Check for duplicate username
  if (users.find(u => u.username === userData.username)) {
    return { success: false, error: 'Username already exists' };
  }

  // Generate unique ID
  const existingIds = users.map(u => u.id);
  const newUser = {
    ...userData,
    id: generateUniqueId(existingIds),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.username)}`,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  store.set('users', users);
  addLog(`Created new user: ${userData.username}`, 'info');
  return { success: true, user: newUser };
});

ipcMain.handle('users:update', async (event, userData) => {
  // Validate input
  const validationErrors = validateUserData(userData);
  if (validationErrors.length > 0) {
    return { success: false, error: validationErrors.join(', ') };
  }

  const users = store.get('users', []);
  const index = users.findIndex(u => u.id === userData.id);

  if (index !== -1) {
    // Check for duplicate username (excluding current user)
    const duplicateUser = users.find(u => u.username === userData.username && u.id !== userData.id);
    if (duplicateUser) {
      return { success: false, error: 'Username already exists' };
    }

    users[index] = { ...userData, updatedAt: new Date().toISOString() };
    store.set('users', users);
    addLog(`Updated user: ${userData.username}`, 'info');
    return { success: true, user: users[index] };
  }

  return { success: false, error: 'User not found' };
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
    // Validate file path
    if (!isValidFilePath(filePath)) {
      throw new Error('Invalid file path');
    }

    // Check file exists and size
    const stats = await fs.stat(filePath);
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    if (stats.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }

    addLog(`Parsing Excel file: ${path.basename(filePath)}`, 'info');

    const workbook = XLSX.readFile(filePath);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file has no sheets');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get headers to identify column positions
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new Error('Excel sheet is empty');
    }

    // Find column indices (case-insensitive)
    const firstColName = headers[0]; // First column is always date
    const docTypeCol = headers.findIndex(h =>
      String(h).toLowerCase().includes('document') ||
      String(h).toLowerCase().includes('type') ||
      String(h).toLowerCase() === 'doctype'
    );
    const pagesCol = headers.findIndex(h =>
      String(h).toLowerCase().includes('page') ||
      String(h).toLowerCase() === 'pages'
    );
    const noteCol = headers.findIndex(h =>
      String(h).toLowerCase().includes('note')
    );

    addLog(`Detected columns: Date="${firstColName}", DocType="${headers[docTypeCol]}", Pages="${headers[pagesCol]}", Note="${headers[noteCol]}"`, 'info');

    // Transform data to expected format with validation
    const transformedData = data.map((row, index) => {
      // First column is ALWAYS the date
      const dateValue = row[firstColName] || new Date().toISOString().split('T')[0];

      // Get other columns by detected indices
      const docTypeValue = docTypeCol >= 0 ? row[headers[docTypeCol]] : null;
      const pagesValue = pagesCol >= 0 ? row[headers[pagesCol]] : null;
      const noteValue = noteCol >= 0 ? row[headers[noteCol]] : null;

      // Fallback to any value for document type if not found
      const docType = docTypeValue ||
                      row['Document Type'] ||
                      row.docType ||
                      row.type ||
                      'Unknown';

      // Fallback for pages
      const pages = pagesValue ||
                    row.Pages ||
                    row.pages ||
                    row['Page Range'] ||
                    '1';

      // Fallback for note
      const note = noteValue ||
                   row.Note ||
                   row.note ||
                   row.Notes ||
                   '';

      // Validate page range format
      if (!isValidPageRange(pages)) {
        addLog(`Warning: Invalid page range "${pages}" in row ${index + 1}. Using "1" instead.`, 'warning');
      }

      return {
        id: index + 1,
        date: String(dateValue),
        docType: String(docType),
        pages: String(pages),
        pageCount: calculatePageCount(pages),
        note: String(note)
      };
    });

    addLog(`Successfully parsed ${transformedData.length} records from Excel`, 'success');
    return { success: true, data: transformedData };
  } catch (error) {
    addLog(`Error parsing Excel: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

function calculatePageCount(pageRange) {
  if (!pageRange) return 1;
  const range = String(pageRange).trim();

  try {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(p => parseInt(p.trim()));
      if (isNaN(start) || isNaN(end) || start > end) return 1;
      return Math.max(1, end - start + 1);
    }

    if (range.includes(',')) {
      const parts = range.split(',').filter(p => !isNaN(parseInt(p.trim())));
      return Math.max(1, parts.length);
    }

    const num = parseInt(range);
    return isNaN(num) ? 1 : 1;
  } catch {
    return 1;
  }
}

// === PDF PROCESSING ===
ipcMain.handle('pdf:process', async (event, { pdfPath, selectedRows, batesConfig, isBatesEnabled }) => {
  try {
    // Validate inputs
    if (!isValidFilePath(pdfPath)) {
      throw new Error('Invalid PDF file path');
    }

    if (!selectedRows || selectedRows.length === 0) {
      throw new Error('No rows selected for processing');
    }

    // Check file exists and size
    const stats = await fs.stat(pdfPath);
    const maxSize = 200 * 1024 * 1024; // 200MB limit for PDFs
    if (stats.size > maxSize) {
      throw new Error(`PDF too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }

    addLog(`Processing PDF with ${selectedRows.length} selected documents`, 'info');

    // Read the source PDF
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    if (totalPages === 0) {
      throw new Error('PDF has no pages');
    }

    // Create output PDF
    const outputPdf = await PDFDocument.create();

    // Sort rows by date
    const sortedRows = [...selectedRows].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Validate Bates config
    const batesStart = parseInt(batesConfig.start);
    if (isBatesEnabled && (isNaN(batesStart) || batesStart < 0)) {
      throw new Error('Invalid Bates starting number');
    }

    let currentBatesNumber = batesStart || 1;
    const processedData = [];

    for (const row of sortedRows) {
      const pageRange = parsePageRange(row.pages, totalPages);
      const startBates = currentBatesNumber;

      if (pageRange.length === 0) {
        addLog(`Warning: No valid pages found for "${row.docType}"`, 'warning');
        continue;
      }

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

    if (outputPdf.getPageCount() === 0) {
      throw new Error('No pages were added to output PDF. Check your page ranges.');
    }

    const processedPdfBytes = await outputPdf.save();

    // Save to temp directory with unique name
    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const outputPath = path.join(tempDir, `pdf_automator_${timestamp}.pdf`);
    await fs.writeFile(outputPath, processedPdfBytes);

    // Track temp file for cleanup
    tempFiles.add(outputPath);

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

  try {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(p => parseInt(p.trim()));
      if (isNaN(start) || isNaN(end)) return pages;

      for (let i = Math.max(1, start); i <= Math.min(end, maxPages); i++) {
        pages.push(i);
      }
    } else if (range.includes(',')) {
      const parts = range.split(',');
      parts.forEach(p => {
        const num = parseInt(p.trim());
        if (!isNaN(num) && num > 0 && num <= maxPages) {
          pages.push(num);
        }
      });
    } else {
      const num = parseInt(range);
      if (!isNaN(num) && num > 0 && num <= maxPages) {
        pages.push(num);
      }
    }
  } catch (error) {
    console.error('Error parsing page range:', error);
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
