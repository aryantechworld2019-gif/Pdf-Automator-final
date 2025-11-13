# Development Guide

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Initial Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Development Workflow

### Running the App

```bash
npm run electron:dev
```

This command:
1. Starts Vite dev server on http://localhost:5173
2. Waits for the server to be ready
3. Launches Electron
4. Enables hot-reload for React components

### Development Tools

- **DevTools**: Automatically opens in development mode
- **Hot Reload**: Changes to React components reload automatically
- **Console Logs**: Check both browser console and terminal

## Project Architecture

### Electron Process Model

```
┌─────────────────────────────────────┐
│         Main Process                │
│    (electron/main.js)               │
│  - Window management                │
│  - IPC handlers                     │
│  - File system operations           │
│  - PDF processing                   │
│  - Excel parsing                    │
│  - Data persistence                 │
└──────────────┬──────────────────────┘
               │ IPC
               │ (electron/preload.js)
┌──────────────▼──────────────────────┐
│      Renderer Process               │
│        (src/App.jsx)                │
│  - React UI                         │
│  - User interactions                │
│  - State management                 │
└─────────────────────────────────────┘
```

### IPC Communication Flow

1. **Renderer → Main**: User action triggers IPC invoke
2. **Preload**: Safely exposes IPC methods
3. **Main**: Processes request, returns result
4. **Renderer**: Updates UI with result

### Data Flow Example

```javascript
// 1. User clicks "Select Excel File"
// src/App.jsx
const handleFileSelect = async () => {
  const result = await window.electronAPI.selectExcelFile();
  // result = { success: true, path: "...", name: "..." }
}

// 2. Preload exposes API
// electron/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  selectExcelFile: () => ipcRenderer.invoke('file:selectExcel')
});

// 3. Main process handles request
// electron/main.js
ipcMain.handle('file:selectExcel', async () => {
  const result = await dialog.showOpenDialog(...);
  return { success: true, path: result.filePaths[0] };
});
```

## Adding New Features

### 1. Add IPC Handler (Main Process)

```javascript
// electron/main.js
ipcMain.handle('feature:newAction', async (event, data) => {
  try {
    // Process data
    const result = await processData(data);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### 2. Expose in Preload

```javascript
// electron/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  newAction: (data) => ipcRenderer.invoke('feature:newAction', data)
});
```

### 3. Use in React

```javascript
// src/App.jsx
const handleNewAction = async () => {
  const result = await window.electronAPI.newAction(data);
  if (result.success) {
    // Update UI
  }
};
```

## File Structure

```
pdf-automator/
├── electron/
│   ├── main.js          # Main process entry
│   └── preload.js       # Secure IPC bridge
├── src/
│   ├── App.jsx          # Main React app
│   ├── main.jsx         # React entry
│   └── index.css        # Global styles
├── dist/                # Vite build output (React)
├── dist-electron/       # Electron build output
├── release/             # Packaged apps
├── package.json         # Dependencies & scripts
├── vite.config.js       # Vite configuration
└── tailwind.config.js   # Tailwind CSS config
```

## Testing PDF Processing

### Create Test Files

1. **Excel File**: Create a simple Excel with test data
2. **PDF File**: Use any multi-page PDF

### Test Workflow

1. Login with client account
2. Upload Excel and PDF
3. Select rows
4. Configure Bates settings
5. Process PDF
6. Verify output

## Debugging

### Main Process Debugging

```javascript
// electron/main.js
console.log('Debug info:', data);
```

Check terminal output where you ran `npm run electron:dev`

### Renderer Process Debugging

```javascript
// src/App.jsx
console.log('Debug info:', data);
```

Check Electron DevTools console (opens automatically in dev mode)

### IPC Debugging

```javascript
// See all IPC calls
ipcMain.handle('*', (event, ...args) => {
  console.log('IPC call:', event.frameId, args);
});
```

## Building for Production

```bash
npm run electron:build
```

Output will be in `release/` directory:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` image
- **Linux**: `.AppImage`

## Environment Variables

Set in development:

```bash
# Linux/macOS
export NODE_ENV=development

# Windows
set NODE_ENV=development
```

## Common Development Tasks

### Update Dependencies

```bash
npm update
```

### Clear Cache

```bash
rm -rf node_modules dist dist-electron
npm install
```

### Check for Issues

```bash
npm run lint  # If you add ESLint
```

## Performance Tips

1. **Minimize Re-renders**: Use React.memo for heavy components
2. **Lazy Load**: Import components lazily if needed
3. **Optimize IPC**: Batch IPC calls when possible
4. **PDF Processing**: Process large PDFs in chunks

## Security Best Practices

1. **Context Isolation**: Always enabled (already configured)
2. **Node Integration**: Disabled in renderer (already configured)
3. **Preload Scripts**: Only expose necessary APIs
4. **Input Validation**: Validate all user inputs

## Known Limitations

1. Large PDFs (>100MB) may be slow to process
2. Excel files must follow expected format
3. Bates stamping is centered and basic styling

## Future Enhancements

- [ ] Dark mode support
- [ ] Custom Bates stamp formatting
- [ ] Batch processing multiple files
- [ ] PDF preview before export
- [ ] Custom export templates
- [ ] Advanced user permissions
- [ ] Cloud storage integration
