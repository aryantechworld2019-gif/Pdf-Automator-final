# PDF Automator - Dynamic Electron App

A fully dynamic Electron + React application for automating PDF processing with Bates stamping capabilities.

## Features

- 🔐 **User Authentication** - Secure login with admin and client roles
- 👥 **User Management** - Admin dashboard for managing users
- 📊 **Excel Parsing** - Automatically parse Excel manifests
- 📄 **PDF Processing** - Extract and reorder PDF pages based on manifest
- 🔢 **Bates Stamping** - Optional automatic Bates number stamping
- 📦 **Export Options** - Export as master PDF or zipped separates
- 📝 **Activity Logging** - Real-time system logging

## Tech Stack

- **Electron** - Desktop application framework
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **pdf-lib** - PDF manipulation
- **SheetJS (xlsx)** - Excel parsing
- **electron-store** - Persistent data storage
- **Lucide React** - Icon library

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run electron:dev
```

3. Build for production:
```bash
npm run electron:build
```

## Default Credentials

### Admin Account
- Username: `admin`
- Password: `adminpassword`

### Client Account
- Username: `client`
- Password: `password123`

## Excel Manifest Format

Your Excel file should have the following columns:

| Column Name | Description | Example |
|------------|-------------|---------|
| Date | Document date | 2023-12-25 |
| Document Type | Type of document | Invoice |
| Pages | Page range in PDF | 1-5 or 1,3,5 |
| Note | Optional note | Description here |

### Example Excel File

```
Date          | Document Type    | Pages | Note
2023-12-25    | Expense Report   | 1-5   | Santa bribes
2023-01-01    | Resolution       | 6     | New year
2023-07-04    | Safety Incident  | 7-8   | Fireworks
```

## Project Structure

```
pdf-automator/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Preload script (IPC bridge)
├── src/
│   ├── App.jsx          # Main React component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── index.html           # HTML template
```

## How It Works

### Client Workflow

1. **Upload Files**
   - Select Excel manifest file
   - Select master PDF file

2. **Select & Configure**
   - View parsed Excel data
   - Select rows to include
   - Configure Bates stamping (optional)
   - Enable/disable Bates stamping with toggle

3. **Process & Export**
   - PDF is generated with selected pages
   - Bates numbers applied (if enabled)
   - Download as master PDF or ZIP

### Admin Features

- View all users
- Create new users
- Edit existing users
- Delete users
- View system logs in real-time

## IPC Communication

The app uses Electron's IPC (Inter-Process Communication) for secure communication between the frontend and backend:

### Available APIs

```javascript
// Authentication
window.electronAPI.login({ username, password })

// User Management
window.electronAPI.getUsers()
window.electronAPI.addUser(userData)
window.electronAPI.updateUser(userData)
window.electronAPI.deleteUser(userId)

// File Selection
window.electronAPI.selectExcelFile()
window.electronAPI.selectPDFFile()

// Processing
window.electronAPI.parseExcel(filePath)
window.electronAPI.processPDF(config)
window.electronAPI.exportPDF(config)

// Logging
window.electronAPI.getLogs()
window.electronAPI.addLog({ msg, type })
window.electronAPI.onLogsUpdated(callback)
```

## Data Persistence

User data and logs are stored using `electron-store`, which persists data between sessions.

## Development

### Running Development Server

```bash
npm run electron:dev
```

This will:
1. Start Vite dev server on port 5173
2. Wait for the server to be ready
3. Launch Electron with hot-reload

### Building for Production

```bash
npm run electron:build
```

This creates distributable packages in the `release/` directory.

## Troubleshooting

### Electron not loading
- Ensure Vite dev server is running on port 5173
- Check console for any errors

### PDF processing fails
- Ensure PDF file is valid and not corrupted
- Check that page ranges in Excel don't exceed PDF page count

### Excel parsing fails
- Verify Excel file format matches expected structure
- Ensure required columns exist

## License

MIT

## Contributing

Pull requests are welcome! For major changes, please open an issue first.
