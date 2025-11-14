const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Store = require('electron-store');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const XLSX = require('xlsx');
const AdmZip = require('adm-zip');

// Initialize electron-store for persistent data
const store = new Store();

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';
const tempFiles = new Set(); // Track temp files for cleanup
const processingJobs = new Map(); // Track ongoing processing jobs for cancellation

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

// Initialize date format preference (default: DD-MM-YYYY)
if (!store.get('dateFormat')) {
  store.set('dateFormat', 'DD-MM-YYYY');
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

// === DATE FORMAT SETTINGS ===
ipcMain.handle('dateFormat:get', async () => {
  return store.get('dateFormat', 'DD-MM-YYYY');
});

ipcMain.handle('dateFormat:set', async (event, format) => {
  const validFormats = ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD'];
  if (validFormats.includes(format)) {
    store.set('dateFormat', format);
    addLog(`Date format changed to: ${format}`, 'info');
    return { success: true };
  }
  return { success: false, error: 'Invalid date format' };
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

// Helper function to format date based on user preference
function formatDateString(day, month, year) {
  const format = store.get('dateFormat', 'DD-MM-YYYY');
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  const y = String(year);

  switch (format) {
    case 'DD-MM-YYYY':
      return `${d}-${m}-${y}`;
    case 'MM-DD-YYYY':
      return `${m}-${d}-${y}`;
    case 'YYYY-MM-DD':
      return `${y}-${m}-${d}`;
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`;
    case 'MM/DD/YYYY':
      return `${m}/${d}/${y}`;
    case 'YYYY/MM/DD':
      return `${y}/${m}/${d}`;
    default:
      return `${d}-${m}-${y}`;
  }
}

// Helper function to convert Excel date formats
function formatExcelDate(value, worksheet, cellAddress) {
  // If value is undefined or null, return current date
  if (value === undefined || value === null || value === '') {
    const today = new Date();
    return formatDateString(today.getDate(), today.getMonth() + 1, today.getFullYear());
  }

  // If it's already a string that looks like a date, return it
  if (typeof value === 'string') {
    // Check if it already looks like a date (contains -, /, or looks formatted)
    if (value.includes('-') || value.includes('/') || value.length > 8) {
      return value;
    }
  }

  // Check if it's a number (Excel date format)
  const numValue = Number(value);
  if (!isNaN(numValue) && numValue > 0) {
    // Excel dates are typically between 1 (Jan 1, 1900) and ~100000
    if (numValue > 1 && numValue < 100000) {
      try {
        // Check if cell has date formatting (if worksheet and cellAddress provided)
        if (worksheet && cellAddress) {
          const cell = worksheet[cellAddress];
          if (cell && cell.t === 'n' && cell.w) {
            // Cell is numeric with formatted display - likely a date
            // Try to parse the formatted value
            const formatted = cell.w;
            if (formatted.includes('/') || formatted.includes('-')) {
              return formatted;
            }
          }
        }

        // Use XLSX's built-in date conversion
        // XLSX.SSF.parse_date_code returns {y, m, d, H, M, S}
        const dateObj = XLSX.SSF.parse_date_code(numValue);
        if (dateObj) {
          return formatDateString(dateObj.d, dateObj.m, dateObj.y);
        }

        // Fallback: manual conversion if XLSX utility fails
        // Excel epoch is December 30, 1899 (serial day 0)
        // Create date by adding days
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899 UTC
        const jsDate = new Date(excelEpoch.getTime() + (numValue * MS_PER_DAY));

        // Format using user preference
        return formatDateString(jsDate.getUTCDate(), jsDate.getUTCMonth() + 1, jsDate.getUTCFullYear());
      } catch (error) {
        console.error('Error converting Excel date:', error);
        return String(value);
      }
    }
  }

  // If we can't determine the format, return as string
  return String(value);
}

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
      // First column is ALWAYS the date - format it properly
      const rawDateValue = row[firstColName];
      // Calculate cell address (A2, A3, etc. - row index + 2 because of header row)
      const cellAddress = `A${index + 2}`;
      const dateValue = formatExcelDate(rawDateValue, worksheet, cellAddress);

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
        date: dateValue,
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

// Helper function to parse date string based on format
function parseDateStringToDate(dateString, format) {
  if (!dateString) return new Date();

  const dateStr = String(dateString).trim();
  const currentFormat = format || store.get('dateFormat', 'DD-MM-YYYY');

  // Extract separator (- or /)
  const separator = dateStr.includes('/') ? '/' : '-';
  const parts = dateStr.split(separator);

  if (parts.length !== 3) {
    // Fallback: try to parse as-is
    const fallback = new Date(dateStr);
    return isNaN(fallback) ? new Date() : fallback;
  }

  let day, month, year;

  switch (currentFormat) {
    case 'DD-MM-YYYY':
    case 'DD/MM/YYYY':
      // parts = [DD, MM, YYYY]
      day = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      year = parseInt(parts[2]);
      break;

    case 'MM-DD-YYYY':
    case 'MM/DD/YYYY':
      // parts = [MM, DD, YYYY]
      month = parseInt(parts[0]) - 1;
      day = parseInt(parts[1]);
      year = parseInt(parts[2]);
      break;

    case 'YYYY-MM-DD':
    case 'YYYY/MM/DD':
      // parts = [YYYY, MM, DD]
      year = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      day = parseInt(parts[2]);
      break;

    default:
      // Fallback to DD-MM-YYYY
      day = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      year = parseInt(parts[2]);
  }

  // Validate parsed values
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    const fallback = new Date(dateStr);
    return isNaN(fallback) ? new Date() : fallback;
  }

  // Create Date object using UTC to avoid timezone issues
  return new Date(Date.UTC(year, month, day));
}

// === PDF PROCESSING WITH PROGRESS ===
ipcMain.handle('pdf:process', async (event, { pdfPath, selectedRows, batesConfig, isBatesEnabled }) => {
  const jobId = Date.now().toString();

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
    const maxSize = 2000 * 1024 * 1024; // Increased to 2GB for large scanned PDFs
    if (stats.size > maxSize) {
      throw new Error(`PDF too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }

    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    addLog(`Processing PDF (${fileSizeMB}MB) with ${selectedRows.length} selected documents`, 'info');

    // Track this job for cancellation
    processingJobs.set(jobId, { cancelled: false });

    // Send initial progress
    sendProgress(event, { stage: 'loading', progress: 0, message: 'Loading PDF...' });

    // Read the source PDF
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    if (totalPages === 0) {
      throw new Error('PDF has no pages');
    }

    addLog(`PDF loaded: ${totalPages} pages total`, 'info');
    sendProgress(event, { stage: 'analyzing', progress: 10, message: `Analyzing ${totalPages} pages...` });

    // Create output PDF
    const outputPdf = await PDFDocument.create();

    // Sort rows by date - parse according to user's date format
    const dateFormat = store.get('dateFormat', 'DD-MM-YYYY');
    addLog(`Sorting ${selectedRows.length} documents chronologically using ${dateFormat} format`, 'info');
    const sortedRows = [...selectedRows].sort((a, b) => {
      const dateA = parseDateStringToDate(a.date, dateFormat);
      const dateB = parseDateStringToDate(b.date, dateFormat);
      return dateA - dateB;
    });

    // Validate Bates config
    const batesStart = parseInt(batesConfig.start);
    if (isBatesEnabled && (isNaN(batesStart) || batesStart < 0)) {
      throw new Error('Invalid Bates starting number');
    }

    let currentBatesNumber = batesStart || 1;
    const processedData = [];

    // Calculate total pages to process for progress
    let totalPagesToProcess = 0;
    for (const row of sortedRows) {
      const pageRange = parsePageRange(row.pages, totalPages);
      totalPagesToProcess += pageRange.length;
    }

    addLog(`Will process ${totalPagesToProcess} pages from ${sortedRows.length} documents`, 'info');
    sendProgress(event, { stage: 'processing', progress: 15, message: `Processing ${totalPagesToProcess} pages...` });

    let processedPages = 0;
    const BATCH_SIZE = 50; // Process 50 pages at a time for memory efficiency
    let currentBatch = [];

    for (let i = 0; i < sortedRows.length; i++) {
      // Check if cancelled
      if (processingJobs.get(jobId)?.cancelled) {
        throw new Error('Processing cancelled by user');
      }

      const row = sortedRows[i];
      const pageRange = parsePageRange(row.pages, totalPages);
      const startBates = currentBatesNumber;

      if (pageRange.length === 0) {
        addLog(`Warning: No valid pages found for "${row.docType}"`, 'warning');
        continue;
      }

      for (const pageNum of pageRange) {
        if (pageNum > 0 && pageNum <= totalPages) {
          currentBatch.push({ pageNum, batesNum: currentBatesNumber, isBatesEnabled });
          currentBatesNumber++;

          // Process batch when it reaches BATCH_SIZE or is the last page
          if (currentBatch.length >= BATCH_SIZE || (i === sortedRows.length - 1 && pageNum === pageRange[pageRange.length - 1])) {
            // Copy pages in batch
            const pageIndices = currentBatch.map(p => p.pageNum - 1);
            const copiedPages = await outputPdf.copyPages(pdfDoc, pageIndices);

            // Apply Bates stamps and add pages
            for (let j = 0; j < copiedPages.length; j++) {
              const copiedPage = copiedPages[j];

              if (currentBatch[j].isBatesEnabled) {
                await applyBatesStamp(copiedPage, currentBatch[j].batesNum, batesConfig);
              }

              outputPdf.addPage(copiedPage);
              processedPages++;

              // Update progress every 10 pages
              if (processedPages % 10 === 0 || processedPages === totalPagesToProcess) {
                const progress = 15 + Math.floor((processedPages / totalPagesToProcess) * 70);
                sendProgress(event, {
                  stage: 'processing',
                  progress,
                  message: `Processing page ${processedPages} of ${totalPagesToProcess}...`,
                  current: processedPages,
                  total: totalPagesToProcess
                });
              }
            }

            currentBatch = [];
          }
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

    sendProgress(event, { stage: 'saving', progress: 85, message: 'Saving PDF...' });

    const processedPdfBytes = await outputPdf.save();

    // Save to temp directory with unique name
    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const outputPath = path.join(tempDir, `pdf_automator_${timestamp}.pdf`);
    await fs.writeFile(outputPath, processedPdfBytes);

    // Track temp file for cleanup
    tempFiles.add(outputPath);

    const outputSizeMB = (processedPdfBytes.length / 1024 / 1024).toFixed(2);
    addLog(`PDF processing complete. ${outputPdf.getPageCount()} pages in output (${outputSizeMB}MB).`, 'success');

    sendProgress(event, { stage: 'complete', progress: 100, message: 'Processing complete!' });

    // Clean up job tracking
    processingJobs.delete(jobId);

    return {
      success: true,
      outputPath,
      processedData,
      pageCount: outputPdf.getPageCount(),
      fileSize: outputSizeMB,
      // Store for ZIP export
      originalPdfPath: pdfPath,
      selectedRows: sortedRows,
      batesConfig,
      isBatesEnabled
    };
  } catch (error) {
    addLog(`Error processing PDF: ${error.message}`, 'error');
    processingJobs.delete(jobId);
    return { success: false, error: error.message };
  }
});

// Cancel PDF processing
ipcMain.handle('pdf:cancel', async (event, jobId) => {
  if (processingJobs.has(jobId)) {
    processingJobs.get(jobId).cancelled = true;
    addLog('PDF processing cancelled by user', 'warning');
    return { success: true };
  }
  return { success: false, error: 'Job not found' };
});

// Helper to send progress updates
function sendProgress(event, progressData) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('pdf:progress', progressData);
  }
}

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
ipcMain.handle('pdf:export', async (event, { sourcePath, fileName, type, processingResult }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      filters: [
        { name: type === 'zip' ? 'ZIP Archive' : 'PDF Files', extensions: [type === 'zip' ? 'zip' : 'pdf'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false };
    }

    // MASTER PDF: Just copy the merged PDF
    if (type === 'master') {
      await fs.copyFile(sourcePath, result.filePath);
      addLog(`Exported master PDF: ${fileName}`, 'success');
      return { success: true, path: result.filePath };
    }

    // ZIP: Create separate PDFs for each selected row and zip them
    if (type === 'zip') {
      if (!processingResult || !processingResult.originalPdfPath || !processingResult.selectedRows) {
        throw new Error('Missing processing result data for ZIP export');
      }

      addLog(`Creating ZIP archive with ${processingResult.selectedRows.length} separate PDFs...`, 'info');

      // Read the original PDF
      const pdfBytes = await fs.readFile(processingResult.originalPdfPath);
      const originalPdf = await PDFDocument.load(pdfBytes);
      const totalPages = originalPdf.getPageCount();

      // Create temp directory for individual PDFs
      const tempDir = app.getPath('temp');
      const timestamp = Date.now();
      const tempPdfDir = path.join(tempDir, `pdf_export_${timestamp}`);
      await fs.mkdir(tempPdfDir, { recursive: true });

      const createdFiles = [];
      let batesNumber = parseInt(processingResult.batesConfig?.start || 1);

      // Create individual PDF for each selected row
      for (const row of processingResult.selectedRows) {
        try {
          // Create new PDF for this document
          const docPdf = await PDFDocument.create();
          const pageRange = parsePageRange(row.pages, totalPages);

          if (pageRange.length === 0) {
            addLog(`Warning: No valid pages for "${row.docType}"`, 'warning');
            continue;
          }

          const startBates = batesNumber;

          // Copy pages from original PDF
          for (const pageNum of pageRange) {
            const [copiedPage] = await docPdf.copyPages(originalPdf, [pageNum - 1]);
            docPdf.addPage(copiedPage);

            // Apply Bates stamp if enabled
            if (processingResult.isBatesEnabled) {
              const addedPage = docPdf.getPage(docPdf.getPageCount() - 1);
              await applyBatesStamp(addedPage, batesNumber, processingResult.batesConfig);
              batesNumber++;
            }
          }

          // Sanitize filename
          const sanitizedDocType = row.docType
            .replace(/[^a-zA-Z0-9_\-\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 100); // Limit length

          const pdfFileName = `${sanitizedDocType}.pdf`;
          const pdfFilePath = path.join(tempPdfDir, pdfFileName);

          // Save individual PDF
          const docPdfBytes = await docPdf.save();
          await fs.writeFile(pdfFilePath, docPdfBytes);
          createdFiles.push(pdfFilePath);

          const endBates = processingResult.isBatesEnabled ? batesNumber - 1 : null;
          const batesInfo = endBates ? ` (Bates: ${formatBates(startBates, processingResult.batesConfig.digits)}-${formatBates(endBates, processingResult.batesConfig.digits)})` : '';
          addLog(`Created: ${pdfFileName}${batesInfo}`, 'success');
        } catch (error) {
          addLog(`Error creating PDF for "${row.docType}": ${error.message}`, 'error');
        }
      }

      if (createdFiles.length === 0) {
        throw new Error('No PDF files were created');
      }

      // Create ZIP archive
      const zip = new AdmZip();
      for (const filePath of createdFiles) {
        const fileName = path.basename(filePath);
        zip.addLocalFile(filePath, '', fileName);
      }

      // Write ZIP to selected location
      await zip.writeZipPromise(result.filePath);

      // Cleanup temp files
      for (const filePath of createdFiles) {
        await fs.unlink(filePath).catch(() => {});
      }
      await fs.rmdir(tempPdfDir).catch(() => {});

      addLog(`ZIP archive created: ${createdFiles.length} PDFs exported`, 'success');
      return { success: true, path: result.filePath };
    }

    throw new Error('Invalid export type');
  } catch (error) {
    addLog(`Export error: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});
