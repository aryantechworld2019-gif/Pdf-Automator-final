import React, { useState, useEffect } from 'react';
import {
  User, LogOut, Shield, Briefcase, Trash2, Edit, X,
  UserPlus, FileSpreadsheet, FileText, UploadCloud, CheckCircle, Search,
  Loader, CheckSquare, Square, Calendar, Layers,
  ArrowDownAZ, RefreshCcw, Settings, FileArchive, File, PenLine,
  Activity, Terminal, Server, Users, AlertTriangle, Save, Key, MinusCircle
} from 'lucide-react';

// --- HELPER COMPONENTS ---
const Badge = ({ children, color }) => (
  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${color}`}>
    {children}
  </span>
);

// --- LOGIN COMPONENT ---
const LoginForm = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onLogin(username, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 font-sans">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border-t-8 border-blue-600">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-blue-600 w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Secure Gate</h2>
          <p className="text-gray-500 mt-2">Please enter your credentials.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm flex items-center gap-3 animate-bounce">
            <AlertTriangle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. client" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] shadow-lg">
            {isLoading ? 'Handshaking...' : 'Authenticate'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
           <p>Default Admin: <span className="font-mono">admin / adminpassword</span></p>
           <p>Default Client: <span className="font-mono">client / password123</span></p>
        </div>
      </div>
    </div>
  );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = ({ currentUser, onLogout }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadUsers();
    loadLogs();

    // Listen for log updates
    window.electronAPI.onLogsUpdated((updatedLogs) => {
      setLogs(updatedLogs);
    });
  }, []);

  const loadUsers = async () => {
    const users = await window.electronAPI.getUsers();
    setAllUsers(users);
  };

  const loadLogs = async () => {
    const systemLogs = await window.electronAPI.getLogs();
    setLogs(systemLogs);
  };

  const addLog = async (msg, type = 'info') => {
    await window.electronAPI.addLog({ msg, type });
    loadLogs();
  };

  const stats = [
    { label: 'Total Users', value: allUsers.length, icon: Users, color: 'bg-blue-500' },
    { label: 'System Status', value: 'Nominal', icon: Activity, color: 'bg-green-500' },
    { label: 'Server Uptime', value: '99.9%', icon: Server, color: 'bg-green-500' },
  ];

  const filteredUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleModalSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      let result;
      if (editingUser) {
        result = await window.electronAPI.updateUser({ ...editingUser, ...data });
        if (result.success) {
          addLog(`Updated user profile: ${data.username}`);
        } else {
          alert('Error updating user: ' + result.error);
          return;
        }
      } else {
        result = await window.electronAPI.addUser(data);
        if (result.success) {
          addLog(`Spawned new user: ${data.username}`);
        } else {
          alert('Error creating user: ' + result.error);
          return;
        }
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      alert('Unexpected error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    await window.electronAPI.deleteUser(id);
    setDeleteConfirm(null);
    addLog(`Terminated user ID: ${id}`);
    loadUsers();
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <main className="flex flex-col h-screen">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 p-6 flex justify-between items-center shadow-sm">
           <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
           <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
               <p className="text-xs text-gray-500">Super Admin</p>
             </div>
             <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-purple-500" alt="Profile" />
             <button onClick={onLogout} className="text-gray-500 hover:text-red-500"><LogOut /></button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
           {/* STATS CARDS */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                  <div className={`${stat.color} p-4 rounded-lg text-white shadow-lg`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
                  </div>
                </div>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* USER TABLE */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
                 <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                   <h3 className="font-bold text-lg text-gray-800">User Database</h3>
                   <div className="flex gap-3">
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                       <input
                         className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                         placeholder="Search users..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                       />
                     </div>
                     <button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all">
                       <UserPlus size={16} /> Add User
                     </button>
                   </div>
                 </div>

                 <div className="overflow-auto">
                   <table className="w-full text-left">
                     <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                       <tr>
                         <th className="px-6 py-3">User</th>
                         <th className="px-6 py-3">Role</th>
                         <th className="px-6 py-3">Status</th>
                         <th className="px-6 py-3 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {filteredUsers.map(user => (
                         <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                               <img src={user.avatar} className="w-8 h-8 rounded-full bg-gray-200" alt="" />
                               <div>
                                 <p className="font-bold text-sm text-gray-900">{user.name}</p>
                                 <p className="text-xs text-gray-500">{user.email}</p>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <Badge color={user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                               {user.role}
                             </Badge>
                           </td>
                           <td className="px-6 py-4 text-sm text-gray-600">{user.status || 'Active'}</td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => handleEdit(user)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Edit Profile"><Edit size={14}/></button>
                               {user.id !== currentUser.id && (
                                 <button onClick={() => setDeleteConfirm(user)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Delete User"><Trash2 size={14}/></button>
                               )}
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>

              {/* LOGS PANEL */}
              <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-700 text-green-400 font-mono text-xs p-4 flex flex-col">
                 <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-700">
                   <Terminal size={16} />
                   <span className="font-bold uppercase tracking-wider">System Terminal</span>
                 </div>
                 <div className="flex-1 overflow-auto space-y-2 h-[400px]">
                   {logs.slice().reverse().map((log, i) => (
                     <div key={i} className="flex gap-2">
                       <span className="text-gray-500">[{log.time}]</span>
                       <span className={log.type === 'warning' ? 'text-yellow-400' : log.type === 'info' ? 'text-blue-400' : log.type === 'error' ? 'text-red-400' : 'text-green-400'}>
                         {log.msg}
                       </span>
                     </div>
                   ))}
                   <div className="animate-pulse text-purple-400">_</div>
                 </div>
              </div>
           </div>
        </div>

        {/* DELETE CONFIRM MODAL */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
               <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                 <AlertTriangle />
               </div>
               <h3 className="text-center font-bold text-xl text-gray-900 mb-2">Delete User?</h3>
               <p className="text-center text-gray-500 mb-6">
                 Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                 <br/><span className="text-xs text-red-500">This action cannot be undone.</span>
               </p>
               <div className="flex gap-3">
                 <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg">Cancel</button>
                 <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg">Delete</button>
               </div>
            </div>
          </div>
        )}

        {/* EDIT/CREATE MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center gap-2">
                  {editingUser ? <Edit size={18}/> : <UserPlus size={18}/>}
                  {editingUser ? 'Edit User' : 'Create User'}
                </h3>
                <button onClick={() => setShowModal(false)} className="hover:bg-purple-700 p-1 rounded"><X size={20}/></button>
              </div>
              <form onSubmit={handleModalSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                    <input name="username" defaultValue={editingUser?.username} required className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                    <select name="role" defaultValue={editingUser?.role || 'client'} className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                    <input name="name" defaultValue={editingUser?.name} required className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                    <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50" />
                </div>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <label className="block text-xs font-bold text-yellow-700 uppercase mb-1 flex items-center gap-1"><Key size={12}/> Set Password</label>
                    <input name="password" defaultValue={editingUser?.password} required className="w-full p-2 border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500 outline-none bg-white font-mono text-sm" />
                    <p className="text-[10px] text-yellow-600 mt-1">User must use this new password to log in.</p>
                </div>
                <div className="pt-4 flex gap-3">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                   <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

// --- CLIENT DASHBOARD (FULLY DYNAMIC) ---
const ClientDashboard = ({ user, onLogout }) => {
  const [step, setStep] = useState('upload');
  const [excelFile, setExcelFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [tableData, setTableData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortedData, setSortedData] = useState([]);

  const [batesConfig, setBatesConfig] = useState({ start: 1, digits: 6, position: 'footer' });
  const [exportName, setExportName] = useState('My_Very_Important_Docs');
  const [isBatesEnabled, setIsBatesEnabled] = useState(false);

  const [processedPdfPath, setProcessedPdfPath] = useState(null);

  // Progress tracking
  const [processingProgress, setProcessingProgress] = useState({
    show: false,
    stage: '',
    progress: 0,
    message: '',
    current: 0,
    total: 0
  });

  const formatBates = (num, digits) => num.toString().padStart(digits, '0');

  const handleFileSelect = async (type) => {
    if (type === 'excel') {
      const result = await window.electronAPI.selectExcelFile();
      if (result.success) {
        setExcelFile(result);
      }
    } else if (type === 'pdf') {
      const result = await window.electronAPI.selectPDFFile();
      if (result.success) {
        setPdfFile(result);
      }
    }
  };

  const removeFile = (e, type) => {
    e.stopPropagation();
    if (type === 'excel') setExcelFile(null);
    if (type === 'pdf') setPdfFile(null);
  };

  const goToSelection = async () => {
    if (!excelFile) return;
    setIsProcessing(true);

    const result = await window.electronAPI.parseExcel(excelFile.path);

    setIsProcessing(false);

    if (result.success) {
      setTableData(result.data);
      setStep('select');
    } else {
      alert('Error parsing Excel file: ' + result.error);
    }
  };

  const toggleRow = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRows(newSelected);
  };

  const filteredData = tableData.filter(row =>
    row.docType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.note.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAll = () => {
    if (selectedRows.size === filteredData.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filteredData.map(r => r.id)));
  };

  const handleRearrange = async () => {
    if (!pdfFile) {
      alert('Please select a PDF file first!');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({
      show: true,
      stage: 'starting',
      progress: 0,
      message: 'Starting PDF processing...',
      current: 0,
      total: 0
    });

    // Listen for progress updates
    const cleanup = window.electronAPI.onPDFProgress((progress) => {
      setProcessingProgress({
        show: true,
        ...progress
      });
    });

    try {
      const selectedItems = tableData.filter(row => selectedRows.has(row.id));

      const result = await window.electronAPI.processPDF({
        pdfPath: pdfFile.path,
        selectedRows: selectedItems,
        batesConfig,
        isBatesEnabled
      });

      if (result.success) {
        setSortedData(result.processedData);
        setProcessedPdfPath(result.outputPath);
        setStep('result');
      } else {
        alert('Error processing PDF: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ show: false, stage: '', progress: 0, message: '', current: 0, total: 0 });
      cleanup(); // Clean up progress listener
    }
  };

  const handleReset = () => {
    setStep('upload');
    setExcelFile(null);
    setPdfFile(null);
    setSelectedRows(new Set());
    setSearchTerm('');
    setSortedData([]);
    setIsBatesEnabled(false);
    setProcessedPdfPath(null);
  };

  const handleDownload = async (type) => {
    if (!processedPdfPath) {
      alert('No processed PDF available!');
      return;
    }

    const extension = type === 'master' ? '.pdf' : '.zip';
    const filename = (exportName.trim() || 'Untitled') + extension;

    const result = await window.electronAPI.exportPDF({
      sourcePath: processedPdfPath,
      fileName: filename,
      type
    });

    if (result.success) {
      alert(`File saved successfully to:\n${result.path}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">

        {/* NAV */}
        <nav className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg"><Briefcase className="text-green-600" /></div>
            <div>
               <h1 className="text-xl font-bold text-gray-800">PDF Shuffler</h1>
               <p className="text-xs text-gray-500">Operated by: {user.username}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-medium transition-colors"><LogOut size={18} /> Logout</button>
        </nav>

        {/* --- STEP 1: UPLOAD --- */}
        {step === 'upload' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col justify-center">
             <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload Files</h2>
                <p className="text-gray-500">Please upload your Excel manifest and PDF.</p>
             </div>

             <div className="grid md:grid-cols-2 gap-8 mb-10 max-w-4xl mx-auto w-full">
                {/* Excel Card */}
                <div onClick={() => !excelFile && handleFileSelect('excel')} className={`relative p-10 rounded-2xl border-2 border-dashed transition-all group flex flex-col items-center ${excelFile ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300 cursor-pointer hover:border-green-400 hover:shadow-lg'}`}>
                  {excelFile && <button onClick={(e) => removeFile(e, 'excel')} className="absolute top-4 right-4 text-green-700 hover:bg-green-200 p-1 rounded-full"><X size={20}/></button>}
                  <div className={`p-5 rounded-full mb-6 ${excelFile ? 'bg-green-100' : 'bg-gray-100 group-hover:bg-green-50'}`}>
                    {excelFile ? <CheckCircle className="w-12 h-12 text-green-600" /> : <FileSpreadsheet className="w-12 h-12 text-gray-400 group-hover:text-green-500" />}
                  </div>
                  <h3 className="font-bold text-xl text-gray-700">{excelFile ? "Excel Locked In" : "Upload Excel Manifest"}</h3>
                  <p className="text-sm text-gray-500 mt-2 font-medium">{excelFile ? excelFile.name : "Click to Select"}</p>
                </div>

                {/* PDF Card */}
                <div onClick={() => !pdfFile && handleFileSelect('pdf')} className={`relative p-10 rounded-2xl border-2 border-dashed transition-all group flex flex-col items-center ${pdfFile ? 'bg-red-50 border-red-500' : 'bg-white border-gray-300 cursor-pointer hover:border-red-400 hover:shadow-lg'}`}>
                  {pdfFile && <button onClick={(e) => removeFile(e, 'pdf')} className="absolute top-4 right-4 text-red-700 hover:bg-red-200 p-1 rounded-full"><X size={20}/></button>}
                  <div className={`p-5 rounded-full mb-6 ${pdfFile ? 'bg-red-100' : 'bg-gray-100 group-hover:bg-red-50'}`}>
                    {pdfFile ? <CheckCircle className="w-12 h-12 text-red-600" /> : <FileText className="w-12 h-12 text-gray-400 group-hover:text-red-500" />}
                  </div>
                  <h3 className="font-bold text-xl text-gray-700">{pdfFile ? "PDF Loaded" : "Upload Master PDF"}</h3>
                  <p className="text-sm text-gray-500 mt-2 font-medium">{pdfFile ? pdfFile.name : "Click to Select"}</p>
                </div>
             </div>

             <div className="flex justify-center">
               <button disabled={!excelFile || isProcessing} onClick={goToSelection} className={`flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg shadow-xl transition-all ${(!excelFile || isProcessing) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95'}`}>
                 {isProcessing ? <><Loader className="animate-spin" /> Crunching Numbers...</> : <><UploadCloud /> Process Files</>}
               </button>
             </div>
          </div>
        )}

        {/* --- STEP 2: SELECTION & CONFIG --- */}
        {step === 'select' && (
          <div className="animate-in fade-in duration-500 grid lg:grid-cols-4 gap-8 flex-1">

             {/* SIDEBAR CONFIG */}
             <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 sticky top-6">
                   <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Settings className="text-purple-600" />
                        <h3 className="font-bold text-gray-800">Bates Settings</h3>
                      </div>
                      <button
                        onClick={() => setIsBatesEnabled(!isBatesEnabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                        ${isBatesEnabled ? 'bg-purple-600' : 'bg-gray-200'}`}
                      >
                        <span className="sr-only">Enable Bates Stamping</span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                          ${isBatesEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                   </div>

                   {isBatesEnabled ? (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Start Number</label>
                           <input type="number" min="0" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono font-bold text-gray-700" value={batesConfig.start} onChange={(e)=>setBatesConfig({...batesConfig, start: e.target.value})}/>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Digit Padding</label>
                           <select className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold text-gray-700" value={batesConfig.digits} onChange={(e)=>setBatesConfig({...batesConfig, digits: parseInt(e.target.value)})}>
                              <option value={2}>2 Digits (01)</option>
                              <option value={4}>4 Digits (0001)</option>
                              <option value={6}>6 Digits (000001)</option>
                              <option value={8}>8 Digits (00000001)</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Stamp Position</label>
                           <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                              <button type="button" onClick={()=>setBatesConfig({...batesConfig, position: 'header'})} className={`py-2 text-xs font-bold rounded-md transition-all ${batesConfig.position==='header'?'bg-white shadow text-purple-600':'text-gray-500 hover:text-gray-700'}`}>Header</button>
                              <button type="button" onClick={()=>setBatesConfig({...batesConfig, position: 'footer'})} className={`py-2 text-xs font-bold rounded-md transition-all ${batesConfig.position==='footer'?'bg-white shadow text-purple-600':'text-gray-500 hover:text-gray-700'}`}>Footer</button>
                           </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-center">
                           <span className="text-xs text-purple-400 uppercase font-bold">Preview</span>
                           <div className="text-2xl font-mono font-bold text-purple-700 mt-1">{formatBates(batesConfig.start, batesConfig.digits)}</div>
                        </div>
                    </div>
                   ) : (
                    <div className="text-center text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        Bates Stamping is currently disabled.
                     </div>
                   )}
                </div>
                <button onClick={handleReset} className="w-full py-3 text-red-500 font-bold bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-2">
                   <RefreshCcw size={18}/> Reset All
                </button>
             </div>

             {/* MAIN TABLE */}
             <div className="lg:col-span-3 flex flex-col h-full">
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden flex-1">
                   <div className="p-5 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-gray-50">
                      <div className="flex items-center gap-2">
                         <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">{selectedRows.size} Selected</span>
                         <span className="text-gray-400 text-sm">of {filteredData.length} rows</span>
                      </div>
                      <div className="flex gap-3 flex-1 justify-end">
                         <div className="relative w-full max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input type="text" placeholder="Filter documents..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
                         </div>
                         <button onClick={handleRearrange} disabled={selectedRows.size === 0 || isProcessing} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap">
                            {isProcessing ? <Loader className="animate-spin" size={18}/> : <Layers size={18}/>}
                            {isProcessing ? "Stamping..." : "Generate PDF"}
                         </button>
                      </div>
                   </div>

                   <div className="overflow-auto flex-1 bg-white">
                      <table className="w-full text-left border-collapse">
                         <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                               <th className="p-4 w-16 text-center border-b border-gray-200">
                                  <button onClick={toggleAll} className="text-gray-500 hover:text-blue-600 transition-colors">
                                     {selectedRows.size === filteredData.length && filteredData.length > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}
                                  </button>
                               </th>
                               <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Date</th>
                               <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Document Type</th>
                               <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Page Range</th>
                               <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Note</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {filteredData.map(row => {
                               const isSelected = selectedRows.has(row.id);
                               return (
                                  <tr key={row.id} onClick={()=>toggleRow(row.id)} className={`cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}>
                                     <td className="p-4 text-center">
                                        <div className={isSelected ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}>
                                           {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                                        </div>
                                     </td>
                                     <td className="p-4 text-sm font-mono text-gray-600">{row.date}</td>
                                     <td className="p-4 text-sm font-bold text-gray-800">{row.docType}</td>
                                     <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono border border-gray-200">{row.pages} ({row.pageCount}p)</span></td>
                                     <td className="p-4 text-sm text-gray-500 italic truncate max-w-[150px]">{row.note}</td>
                                  </tr>
                               );
                            })}
                            {filteredData.length === 0 && (
                               <tr><td colSpan="5" className="p-8 text-center text-gray-400">No documents match your search.</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* --- STEP 3: RESULT --- */}
        {step === 'result' && (
          <div className="flex-1 flex items-center justify-center animate-in zoom-in duration-300">
             <div className="bg-white rounded-2xl shadow-2xl border border-green-100 overflow-hidden max-w-4xl w-full">

                <div className="bg-green-600 p-8 text-white text-center relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                   <div className="relative z-10">
                      <div className="bg-white text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                         <CheckCircle size={40} strokeWidth={2.5} />
                      </div>
                      <h2 className="text-3xl font-bold">Files Processed</h2>
                      <p className="text-green-100 mt-2 text-lg">Your files have been processed and sorted.</p>
                   </div>
                </div>

                <div className="p-8">
                   <div className="grid md:grid-cols-2 gap-8">

                      <div className="border border-gray-200 rounded-xl bg-gray-50 flex flex-col max-h-[350px]">
                         <div className="p-4 border-b border-gray-200 bg-white rounded-t-xl flex items-center gap-2">
                            <ArrowDownAZ className="text-gray-400" size={18}/>
                            <span className="font-bold text-gray-700 text-sm uppercase">Output Manifest</span>
                         </div>
                         <div className="overflow-auto p-2 space-y-2">
                            {sortedData.map((item, idx) => (
                               <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                     <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">{idx+1}</span>
                                     <div>
                                        <div className="font-bold text-gray-800 text-sm">{item.docType}</div>
                                        <div className="text-xs text-gray-400 font-mono">{item.date}</div>
                                     </div>
                                  </div>

                                  {item.batesRange ? (
                                    <div className="text-right">
                                       <span className="block text-[10px] uppercase font-bold text-gray-400">Bates Range</span>
                                       <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-mono font-bold border border-yellow-200">{item.batesRange}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400 font-medium px-2">No Stamp</span>
                                  )}

                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="flex flex-col justify-center space-y-6">
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Set Export Filename</label>
                            <div className="relative group">
                               <PenLine className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                               <input
                                 type="text"
                                 value={exportName}
                                 onChange={(e) => setExportName(e.target.value)}
                                 className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none font-bold text-gray-800 text-lg transition-colors shadow-sm"
                                 placeholder="Enter filename..."
                               />
                            </div>
                         </div>

                         <div className="space-y-3">
                            <button onClick={() => handleDownload('master')} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl shadow-lg flex items-center justify-between group transition-all hover:-translate-y-1">
                               <div className="flex items-center gap-4">
                                  <div className="bg-blue-500 p-2 rounded-lg group-hover:bg-blue-400"><File size={24}/></div>
                                  <div className="text-left">
                                     <div className="font-bold">Download Master PDF</div>
                                     <div className="text-xs text-blue-200">Single merged file ({exportName}.pdf)</div>
                                  </div>
                               </div>
                               <ArrowDownAZ className="opacity-50 group-hover:opacity-100" />
                            </button>

                            <button onClick={() => handleDownload('zip')} className="w-full bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-xl shadow-lg flex items-center justify-between group transition-all hover:-translate-y-1">
                               <div className="flex items-center gap-4">
                                  <div className="bg-gray-700 p-2 rounded-lg group-hover:bg-gray-600"><FileArchive size={24}/></div>
                                  <div className="text-left">
                                     <div className="font-bold">Download Separates</div>
                                     <div className="text-xs text-gray-400">Zipped individual files ({exportName}.zip)</div>
                                  </div>
                               </div>
                               <ArrowDownAZ className="opacity-50 group-hover:opacity-100" />
                            </button>
                         </div>

                         <button onClick={handleReset} className="text-center text-sm font-bold text-gray-400 hover:text-gray-600 mt-4 underline decoration-dashed underline-offset-4">
                            Start Over with New Files
                         </button>
                      </div>

                   </div>
                </div>
             </div>
          </div>
        )}

        {/* PROGRESS MODAL */}
        {processingProgress.show && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <Loader className="animate-spin" size={24} />
                    <h3 className="font-bold text-xl">Processing PDF...</h3>
                  </div>
                  <div className="text-white text-2xl font-bold">{processingProgress.progress}%</div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${processingProgress.progress}%` }}
                  />
                </div>

                {/* Status Message */}
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-700 mb-1">
                    {processingProgress.stage === 'loading' && '📂 Loading PDF...'}
                    {processingProgress.stage === 'analyzing' && '🔍 Analyzing Structure...'}
                    {processingProgress.stage === 'processing' && '⚙️ Processing Pages...'}
                    {processingProgress.stage === 'saving' && '💾 Saving Output...'}
                    {processingProgress.stage === 'complete' && '✅ Complete!'}
                  </div>
                  <div className="text-xs text-gray-500">{processingProgress.message}</div>
                </div>

                {/* Page Counter (if available) */}
                {processingProgress.total > 0 && (
                  <div className="flex justify-center items-center gap-2 text-sm">
                    <div className="bg-blue-100 px-3 py-1 rounded-full text-blue-700 font-mono font-bold">
                      {processingProgress.current} / {processingProgress.total}
                    </div>
                    <span className="text-gray-400">pages</span>
                  </div>
                )}

                {/* Processing Tips */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-500 mt-0.5">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-xs text-blue-700 flex-1">
                      <div className="font-bold mb-1">Processing large PDF...</div>
                      <div className="text-blue-600">
                        • This may take several minutes for PDFs with thousands of pages<br/>
                        • The app is working in the background - please be patient<br/>
                        • Do not close the application during processing
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estimated Time (for long operations) */}
                {processingProgress.total > 1000 && (
                  <div className="text-center text-xs text-gray-400">
                    Large file detected - estimated time: {Math.ceil(processingProgress.total / 100)} minutes
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (username, password) => {
    setLoginError('');
    const result = await window.electronAPI.login({ username, password });

    if (result.success) {
      setCurrentUser(result.user);
    } else {
      setLoginError("Access Denied. Security Drones deployed.");
    }
  };

  const handleLogout = () => {
    window.electronAPI.addLog({ msg: `User [${currentUser?.username}] logged out.`, type: 'info' });
    setCurrentUser(null);
    setLoginError('');
  };

  if (!currentUser) return <LoginForm onLogin={handleLogin} error={loginError} />;
  if (currentUser.role === 'admin') {
    return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />;
  }
  return <ClientDashboard user={currentUser} onLogout={handleLogout} />;
}
